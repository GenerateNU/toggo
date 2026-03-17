package tests

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// roundTripFunc lets a plain function satisfy http.RoundTripper.
type roundTripFunc func(r *http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func newHTMLResponse(statusCode int, body string) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     make(http.Header),
		Request:    &http.Request{URL: &url.URL{}},
	}
}

func newLinkParserSvc(transport http.RoundTripper) services.LinkParserServiceInterface {
	return services.NewLinkParserServiceWithClient(&http.Client{Transport: transport})
}

// ---------------------------------------------------------------------------
// ParseLink — invalid URL
// ---------------------------------------------------------------------------

func TestLinkParserService_ParseLink_InvalidURL(t *testing.T) {
	t.Parallel()

	svc := newLinkParserSvc(nil)
	_, err := svc.ParseLink(context.Background(), "://bad url")

	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrInvalidURL))
}

func TestLinkParserService_ParseLink_ForbiddenURL(t *testing.T) {
	t.Parallel()

	svc := newLinkParserSvc(nil)

	for _, raw := range []string{
		"http://localhost/admin",
		"http://127.0.0.1/secret",
		"http://169.254.169.254/latest/meta-data",
		"http://192.168.1.1/router",
	} {
		_, err := svc.ParseLink(context.Background(), raw)
		require.Error(t, err, "expected error for %s", raw)
		assert.True(t, errors.Is(err, services.ErrForbiddenURL), "expected ErrForbiddenURL for %s", raw)
	}
}

func TestLinkParserService_ParseLink_NetworkFailure(t *testing.T) {
	t.Parallel()

	svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return nil, errors.New("connection refused")
	}))

	_, err := svc.ParseLink(context.Background(), "https://example.com/page")

	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrNetworkFailure))
}

// ---------------------------------------------------------------------------
// ParseLink — generic scrape dispatch
// ---------------------------------------------------------------------------

func TestLinkParserService_ParseLink_Generic(t *testing.T) {
	t.Parallel()

	t.Run("extracts OG title and description", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`<html><head>
				<meta property="og:title" content="Cool Event"/>
				<meta property="og:description" content="A great time"/>
				<meta property="og:image" content="https://cdn.example.com/img.jpg"/>
			</head></html>`))
		}))
		defer srv.Close()

		svc := services.NewLinkParserServiceWithClient(srv.Client())
		result, err := svc.ParseLink(context.Background(), srv.URL)

		require.NoError(t, err)
		assert.Equal(t, "Cool Event", result.Name)
		require.NotNil(t, result.Description)
		assert.Equal(t, "A great time", *result.Description)
		require.NotNil(t, result.ThumbnailURL)
		assert.Equal(t, "https://cdn.example.com/img.jpg", *result.ThumbnailURL)
		assert.Equal(t, models.LinkTypeGeneric, result.SourceType)
		assert.Equal(t, srv.URL, result.SourceURL)
	})

	t.Run("falls back to title element when no OG tags", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`<html><head><title>Page Title</title></head></html>`))
		}))
		defer srv.Close()

		svc := services.NewLinkParserServiceWithClient(srv.Client())
		result, err := svc.ParseLink(context.Background(), srv.URL)

		require.NoError(t, err)
		assert.Equal(t, "Page Title", result.Name)
	})

	t.Run("uses raw URL as name when no metadata found", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`<html><body>No metadata</body></html>`))
		}))
		defer srv.Close()

		svc := services.NewLinkParserServiceWithClient(srv.Client())
		result, err := svc.ParseLink(context.Background(), srv.URL)

		require.NoError(t, err)
		assert.Equal(t, srv.URL, result.Name)
		assert.Nil(t, result.Description)
		assert.Nil(t, result.ThumbnailURL)
	})

	t.Run("returns ErrUpstreamError on HTTP 4xx", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "not found", http.StatusNotFound)
		}))
		defer srv.Close()

		svc := services.NewLinkParserServiceWithClient(srv.Client())
		_, err := svc.ParseLink(context.Background(), srv.URL)

		require.Error(t, err)
		assert.True(t, errors.Is(err, services.ErrUpstreamError))
		assert.Contains(t, err.Error(), "404")
	})

	t.Run("JSON-LD takes priority over OG tags", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`<html><head>
				<meta property="og:title" content="OG Title"/>
			</head><body>
				<script type="application/ld+json">{"name":"JSON-LD Title","description":"LD Desc","image":"https://cdn.example.com/ld.jpg"}</script>
			</body></html>`))
		}))
		defer srv.Close()

		svc := services.NewLinkParserServiceWithClient(srv.Client())
		result, err := svc.ParseLink(context.Background(), srv.URL)

		require.NoError(t, err)
		assert.Equal(t, "JSON-LD Title", result.Name)
		require.NotNil(t, result.Description)
		assert.Equal(t, "LD Desc", *result.Description)
	})

	t.Run("Twitter card falls back when no OG tags", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`<html><head>
				<meta name="twitter:title" content="Twitter Title"/>
				<meta name="twitter:description" content="Twitter Desc"/>
			</head></html>`))
		}))
		defer srv.Close()

		svc := services.NewLinkParserServiceWithClient(srv.Client())
		result, err := svc.ParseLink(context.Background(), srv.URL)

		require.NoError(t, err)
		assert.Equal(t, "Twitter Title", result.Name)
	})
}

// ---------------------------------------------------------------------------
// ParseLink — TikTok dispatch
// ---------------------------------------------------------------------------

type tiktokOEmbedResponse struct {
	Title        string `json:"title"`
	AuthorName   string `json:"author_name"`
	ThumbnailURL string `json:"thumbnail_url"`
}

func TestLinkParserService_ParseLink_TikTok(t *testing.T) {
	t.Parallel()

	const tikTokVideoURL = "https://www.tiktok.com/@user/video/123456"

	t.Run("uses oEmbed title when present", func(t *testing.T) {
		t.Parallel()
		oEmbed := tiktokOEmbedResponse{
			Title:        "My Dance Video",
			AuthorName:   "dancer",
			ThumbnailURL: "https://cdn.tiktok.com/thumb.jpg",
		}
		body, _ := json.Marshal(oEmbed)

		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, string(body)), nil
		}))

		result, err := svc.ParseLink(context.Background(), tikTokVideoURL)

		require.NoError(t, err)
		assert.Equal(t, "My Dance Video", result.Name)
		require.NotNil(t, result.ThumbnailURL)
		assert.Equal(t, "https://cdn.tiktok.com/thumb.jpg", *result.ThumbnailURL)
		assert.Equal(t, models.LinkTypeTikTok, result.SourceType)
		assert.Equal(t, []string{"video"}, result.CategorySuggestions)
	})

	t.Run("falls back to author name when title is empty", func(t *testing.T) {
		t.Parallel()
		body, _ := json.Marshal(tiktokOEmbedResponse{AuthorName: "coolcreator"})

		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, string(body)), nil
		}))

		result, err := svc.ParseLink(context.Background(), tikTokVideoURL)

		require.NoError(t, err)
		assert.Equal(t, "coolcreator's TikTok", result.Name)
	})

	t.Run("uses default name when oEmbed has no title or author", func(t *testing.T) {
		t.Parallel()
		body, _ := json.Marshal(tiktokOEmbedResponse{})

		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, string(body)), nil
		}))

		result, err := svc.ParseLink(context.Background(), tikTokVideoURL)

		require.NoError(t, err)
		assert.Equal(t, "TikTok Video", result.Name)
	})

	t.Run("no thumbnail when oEmbed thumbnail_url is empty", func(t *testing.T) {
		t.Parallel()
		body, _ := json.Marshal(tiktokOEmbedResponse{Title: "A Video"})

		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, string(body)), nil
		}))

		result, err := svc.ParseLink(context.Background(), tikTokVideoURL)

		require.NoError(t, err)
		assert.Nil(t, result.ThumbnailURL)
	})

	t.Run("falls back to HTML scrape on non-200 oEmbed status", func(t *testing.T) {
		t.Parallel()
		const scrapeHTML = `<html><head><meta property="og:title" content="Scraped TikTok"/></head></html>`

		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			// First call: oEmbed → 404. Second call: scrape of original URL → HTML.
			if strings.Contains(r.URL.Path, "oembed") {
				return newHTMLResponse(http.StatusNotFound, ""), nil
			}
			return newHTMLResponse(http.StatusOK, scrapeHTML), nil
		}))

		result, err := svc.ParseLink(context.Background(), tikTokVideoURL)

		require.NoError(t, err)
		assert.Equal(t, "Scraped TikTok", result.Name)
		assert.Equal(t, models.LinkTypeTikTok, result.SourceType)
	})

	t.Run("falls back to scrape on invalid oEmbed JSON", func(t *testing.T) {
		t.Parallel()
		const scrapeHTML = `<html><head><meta property="og:title" content="Scraped TikTok"/></head></html>`

		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			if strings.Contains(r.URL.Path, "oembed") {
				return newHTMLResponse(http.StatusOK, `{invalid json`), nil
			}
			return newHTMLResponse(http.StatusOK, scrapeHTML), nil
		}))

		result, err := svc.ParseLink(context.Background(), tikTokVideoURL)

		require.NoError(t, err)
		assert.Equal(t, "Scraped TikTok", result.Name)
	})
}

// ---------------------------------------------------------------------------
// ParseLink — Instagram dispatch
// ---------------------------------------------------------------------------

func TestLinkParserService_ParseLink_Instagram(t *testing.T) {
	t.Parallel()

	const instagramPostURL = "https://www.instagram.com/p/abc123/"

	t.Run("cleans verbose og:title format", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><head>
				<meta property="og:title" content="Jane Smith on Instagram: &quot;summer vibes&quot;"/>
			</head></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), instagramPostURL)

		require.NoError(t, err)
		assert.Equal(t, "Jane Smith", result.Name)
		assert.Equal(t, models.LinkTypeInstagram, result.SourceType)
		assert.Equal(t, []string{"social", "video"}, result.CategorySuggestions)
	})

	t.Run("cleans twitter card title format", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><head>
				<meta name="twitter:title" content="John Doe (@johndoe) • Instagram photos"/>
			</head></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), instagramPostURL)

		require.NoError(t, err)
		assert.Equal(t, "John Doe", result.Name)
	})

	t.Run("cleans og:description engagement prefix", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><head>
				<meta property="og:title" content="User on Instagram: &quot;post&quot;"/>
				<meta property="og:description" content="100 likes, 5 comments - user on June 1, 2025: &quot;Loving the sun!&quot;"/>
			</head></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), instagramPostURL)

		require.NoError(t, err)
		require.NotNil(t, result.Description)
		assert.Equal(t, "Loving the sun!", *result.Description)
	})

	t.Run("returns title unchanged when no Instagram pattern matches", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><head>
				<meta property="og:title" content="Plain Title"/>
			</head></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), instagramPostURL)

		require.NoError(t, err)
		assert.Equal(t, "Plain Title", result.Name)
	})
}

// ---------------------------------------------------------------------------
// ParseLink — Booking.com dispatch
// ---------------------------------------------------------------------------

func TestLinkParserService_ParseLink_BookingCom(t *testing.T) {
	t.Parallel()

	t.Run("returns scraped OG title when metadata found", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><head>
				<meta property="og:title" content="The Grand Hotel"/>
			</head></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), "https://www.booking.com/hotel/gb/grand-hotel.html")

		require.NoError(t, err)
		assert.Equal(t, "The Grand Hotel", result.Name)
		assert.Equal(t, models.LinkTypeBookingCom, result.SourceType)
		assert.Equal(t, []string{"accommodation"}, result.CategorySuggestions)
	})

	t.Run("falls back to URL slug when scrape returns no metadata", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			// Simulate bot-challenge page — no OG tags
			return newHTMLResponse(http.StatusOK, `<html><body>Please verify you are human</body></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), "https://www.booking.com/hotel/us/the-ritz-carlton.html")

		require.NoError(t, err)
		assert.Equal(t, "The Ritz Carlton", result.Name)
	})

	t.Run("falls back to raw URL when no metadata and unrecognised path", func(t *testing.T) {
		t.Parallel()
		const rawURL = "https://www.booking.com/searchresults"
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><body>Bot challenge</body></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), rawURL)

		require.NoError(t, err)
		assert.Equal(t, rawURL, result.Name)
	})
}

// ---------------------------------------------------------------------------
// ParseLink — Airbnb dispatch
// ---------------------------------------------------------------------------

func TestLinkParserService_ParseLink_Airbnb(t *testing.T) {
	t.Parallel()

	t.Run("extracts title and uses accommodation category", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><head>
				<meta property="og:title" content="Cosy Beach House"/>
			</head></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), "https://www.airbnb.com/rooms/12345678")

		require.NoError(t, err)
		assert.Equal(t, "Cosy Beach House", result.Name)
		assert.Equal(t, models.LinkTypeAirbnb, result.SourceType)
		assert.Equal(t, []string{"accommodation"}, result.CategorySuggestions)
	})

	t.Run("prefers JSON-LD over OG tags for Airbnb", func(t *testing.T) {
		t.Parallel()
		svc := newLinkParserSvc(roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return newHTMLResponse(http.StatusOK, `<html><head>
				<meta property="og:title" content="OG Title"/>
			</head><body>
				<script type="application/ld+json">{"name":"Vacation Rental Title","description":"Nice place","image":"https://cdn.airbnb.com/img.jpg"}</script>
			</body></html>`), nil
		}))

		result, err := svc.ParseLink(context.Background(), "https://www.airbnb.com/rooms/12345678")

		require.NoError(t, err)
		assert.Equal(t, "Vacation Rental Title", result.Name)
	})
}
