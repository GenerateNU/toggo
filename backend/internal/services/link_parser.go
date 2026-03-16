package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"toggo/internal/models"

	"golang.org/x/net/html"
)

const (
	browserUserAgent    = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
	crawlerUserAgent    = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
	httpRequestTimeout  = 10 * time.Second
	tiktokOEmbedBaseURL = "https://www.tiktok.com/oembed"
)

type LinkParserServiceInterface interface {
	ParseLink(ctx context.Context, rawURL string) (*models.ParsedActivityData, error)
}

var _ LinkParserServiceInterface = (*LinkParserService)(nil)

type LinkParserService struct {
	httpClient *http.Client
}

func NewLinkParserService() LinkParserServiceInterface {
	return &LinkParserService{
		httpClient: &http.Client{Timeout: httpRequestTimeout},
	}
}

func NewLinkParserServiceWithClient(client *http.Client) LinkParserServiceInterface {
	return &LinkParserService{httpClient: client}
}

func (s *LinkParserService) ParseLink(ctx context.Context, rawURL string) (*models.ParsedActivityData, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	linkType := detectLinkType(parsedURL)
	fmt.Println("parse-link: detected source", "url", rawURL, "type", linkType)

	switch linkType {
	case models.LinkTypeTikTok:
		fmt.Println("parse-link: using TikTok oEmbed strategy")
		return s.parseTikTokLink(ctx, rawURL, linkType)
	case models.LinkTypeInstagram:
		fmt.Println("parse-link: using OG scrape strategy with cleanup (Instagram)")
		return s.parseInstagramLink(ctx, rawURL, linkType)
	case models.LinkTypeAirbnb:
		fmt.Println("parse-link: using JSON-LD + OG scrape strategy (Airbnb)")
		return s.parseScrapedLink(ctx, rawURL, linkType, []string{"accommodation"}, false, browserUserAgent)
	case models.LinkTypeBookingCom:
		fmt.Println("parse-link: using OG scrape strategy with URL fallback (Booking.com)")
		return s.parseBookingComLink(ctx, rawURL, parsedURL, linkType)
	default:
		fmt.Println("parse-link: using generic OG scrape strategy")
		return s.parseScrapedLink(ctx, rawURL, linkType, []string{}, false, browserUserAgent)
	}
}

func detectLinkType(u *url.URL) models.LinkType {
	host := strings.ToLower(strings.TrimPrefix(u.Hostname(), "www."))

	switch {
	case host == "airbnb.com" || strings.HasSuffix(host, ".airbnb.com"):
		return models.LinkTypeAirbnb
	case host == "booking.com" || strings.HasSuffix(host, ".booking.com"):
		return models.LinkTypeBookingCom
	case host == "tiktok.com" || host == "vm.tiktok.com" || strings.HasSuffix(host, ".tiktok.com"):
		return models.LinkTypeTikTok
	case host == "instagram.com" || strings.HasSuffix(host, ".instagram.com"):
		return models.LinkTypeInstagram
	default:
		return models.LinkTypeGeneric
	}
}

// parseTikTokLink uses TikTok's free oEmbed API, falling back to scraping on failure.
func (s *LinkParserService) parseTikTokLink(ctx context.Context, rawURL string, linkType models.LinkType) (*models.ParsedActivityData, error) {
	oEmbedURL := fmt.Sprintf("%s?url=%s", tiktokOEmbedBaseURL, url.QueryEscape(rawURL))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, oEmbedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build oEmbed request: %w", err)
	}
	req.Header.Set("User-Agent", browserUserAgent)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		fmt.Println("parse-link: TikTok oEmbed request failed, falling back to scrape", "err", err)
		return s.parseScrapedLink(ctx, rawURL, linkType, []string{"video"}, false, browserUserAgent)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Println("parse-link: TikTok oEmbed failed, falling back to scrape", "status", resp.StatusCode)
		return s.parseScrapedLink(ctx, rawURL, linkType, []string{"video"}, false, browserUserAgent)
	}

	var oEmbed tiktokOEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&oEmbed); err != nil {
		fmt.Println("parse-link: TikTok oEmbed decode failed, falling back to scrape", "err", err)
		return s.parseScrapedLink(ctx, rawURL, linkType, []string{"video"}, false, browserUserAgent)
	}

	result := &models.ParsedActivityData{
		SourceURL:           rawURL,
		SourceType:          linkType,
		CategorySuggestions: []string{"video"},
		MediaURL:            &rawURL,
	}

	switch {
	case oEmbed.Title != "":
		result.Name = oEmbed.Title
	case oEmbed.AuthorName != "":
		result.Name = oEmbed.AuthorName + "'s TikTok"
	default:
		result.Name = "TikTok Video"
	}

	if oEmbed.ThumbnailURL != "" {
		result.ThumbnailURL = &oEmbed.ThumbnailURL
	}

	return result, nil
}

// parseBookingComLink tries OG scraping first; falls back to extracting the hotel
// name from the URL slug when Booking.com serves a bot-challenge page.
func (s *LinkParserService) parseBookingComLink(ctx context.Context, rawURL string, parsedURL *url.URL, linkType models.LinkType) (*models.ParsedActivityData, error) {
	result, err := s.parseScrapedLink(ctx, rawURL, linkType, []string{"accommodation"}, true, browserUserAgent)
	if err != nil {
		return nil, err
	}

	// Scrape succeeded with real content — return as-is.
	if result.Name != rawURL {
		return result, nil
	}

	// Scrape returned empty metadata (bot challenge). Fall back to URL slug.
	fmt.Println("parse-link: Booking.com scrape returned no metadata, falling back to URL slug")
	if name := hotelNameFromBookingURL(parsedURL); name != "" {
		result.Name = name
	}
	return result, nil
}

// hotelNameFromBookingURL extracts a human-readable hotel name from a Booking.com URL.
// Booking.com URLs follow the pattern /hotel/{country}/{hotel-slug}.html
func hotelNameFromBookingURL(u *url.URL) string {
	// Strip leading slash and split path segments
	segments := strings.Split(strings.Trim(u.Path, "/"), "/")
	// Expect: ["hotel", "<country>", "<slug>.html"]
	if len(segments) < 3 || segments[0] != "hotel" {
		return ""
	}

	slug := strings.TrimSuffix(segments[2], ".html")
	if slug == "" {
		return ""
	}

	// Convert kebab-case slug to title-case name
	words := strings.Split(slug, "-")
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

// parseInstagramLink scrapes OG tags using Meta's crawler UA (Instagram serves full
// OG metadata to facebookexternalhit but not to browser UAs), then cleans up the
// verbose title and description formats.
func (s *LinkParserService) parseInstagramLink(ctx context.Context, rawURL string, linkType models.LinkType) (*models.ParsedActivityData, error) {
	result, err := s.parseScrapedLink(ctx, rawURL, linkType, []string{"social", "video"}, false, crawlerUserAgent)
	if err != nil {
		return nil, err
	}

	result.Name = cleanInstagramTitle(result.Name)

	if result.Description != nil {
		cleaned := cleanInstagramDescription(*result.Description)
		result.Description = &cleaned
	}

	return result, nil
}

// cleanInstagramTitle extracts the account name from Instagram's og:title format:
//
//	"A + B on Instagram: \"caption...\""  →  "A + B"
//	"A + B (@ab) • Instagram reel"  →  "A + B"
func cleanInstagramTitle(title string) string {
	// Primary pattern: "Account Name on Instagram: ..."
	if idx := strings.Index(title, " on Instagram:"); idx > 0 {
		return strings.TrimSpace(title[:idx])
	}
	// Twitter card pattern: "Account Name (@handle) • Instagram ..."
	if idx := strings.Index(title, " (@"); idx > 0 {
		return strings.TrimSpace(title[:idx])
	}
	return title
}

// cleanInstagramDescription strips the engagement prefix from og:description:
//
//	"552 likes, 13 comments - ab on March 16, 2026: \"caption\""  →  "caption"
func cleanInstagramDescription(desc string) string {
	// Find the first occurrence of `: "` which separates metadata from caption
	if idx := strings.Index(desc, `: "`); idx >= 0 {
		caption := strings.TrimPrefix(desc[idx:], `: "`)
		caption = strings.TrimSuffix(strings.TrimSpace(caption), `"`)
		if caption != "" {
			return caption
		}
	}
	return desc
}

// parseScrapedLink fetches the URL and extracts Open Graph / JSON-LD / meta tag data.
// When ogOnly is true, JSON-LD is skipped and OG tags take priority (used for Booking.com).
// userAgent controls the UA header sent; pass browserUserAgent or crawlerUserAgent.
func (s *LinkParserService) parseScrapedLink(ctx context.Context, rawURL string, linkType models.LinkType, categorySuggestions []string, ogOnly bool, userAgent string) (*models.ParsedActivityData, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build request: %w", err)
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	fmt.Println("parse-link: fetched URL",
		"url", rawURL,
		"status", resp.StatusCode,
		"content_type", resp.Header.Get("Content-Type"),
		"final_url", resp.Request.URL.String(),
	)

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("URL returned HTTP %d", resp.StatusCode)
	}

	meta := extractPageMetadata(resp.Body, ogOnly)

	fmt.Println("parse-link: extracted metadata",
		"og_title", meta.ogTitle,
		"og_description", meta.ogDescription,
		"og_image", meta.ogImage,
		"jsonld_title", meta.jsonldTitle,
		"title_element", meta.titleElement,
		"resolved_title", meta.title,
	)

	result := &models.ParsedActivityData{
		SourceURL:           rawURL,
		SourceType:          linkType,
		CategorySuggestions: categorySuggestions,
		MediaURL:            &rawURL,
	}

	if meta.title != "" {
		result.Name = meta.title
	} else {
		result.Name = rawURL
	}

	if meta.description != "" {
		desc := meta.description
		result.Description = &desc
	}

	if meta.imageURL != "" {
		result.ThumbnailURL = &meta.imageURL
	}

	return result, nil
}

type tiktokOEmbedResponse struct {
	Title        string `json:"title"`
	AuthorName   string `json:"author_name"`
	ThumbnailURL string `json:"thumbnail_url"`
}

// pageMetadata holds the raw values collected during HTML scanning.
type pageMetadata struct {
	ogTitle       string
	ogDescription string
	ogImage       string
	twitterTitle  string
	twitterDesc   string
	twitterImage  string
	titleElement  string
	metaDesc      string
	jsonldTitle   string
	jsonldDesc    string
	jsonldImage   string

	// Resolved fields (populated once scanning is complete)
	title       string
	description string
	imageURL    string
}

// jsonldSchema is a minimal representation of JSON-LD structured data.
// Covers schema.org types used by Airbnb (VacationRental) and similar sites.
type jsonldSchema struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Image       json.RawMessage `json:"image"` // may be a string or []string
}

func (m *pageMetadata) resolve() {
	// Priority: JSON-LD > OG > Twitter > <title> / <meta name="description">
	switch {
	case m.jsonldTitle != "":
		m.title = m.jsonldTitle
	case m.ogTitle != "":
		m.title = m.ogTitle
	case m.twitterTitle != "":
		m.title = m.twitterTitle
	default:
		m.title = m.titleElement
	}

	switch {
	case m.jsonldDesc != "":
		m.description = m.jsonldDesc
	case m.ogDescription != "":
		m.description = m.ogDescription
	case m.twitterDesc != "":
		m.description = m.twitterDesc
	default:
		m.description = m.metaDesc
	}

	switch {
	case m.jsonldImage != "":
		m.imageURL = m.jsonldImage
	case m.ogImage != "":
		m.imageURL = m.ogImage
	default:
		m.imageURL = m.twitterImage
	}
}

// extractPageMetadata tokenizes the HTML stream and collects meta/OG/JSON-LD data.
// Scans the full document since Airbnb embeds JSON-LD in the body, not the head.
// When ogOnly is true, JSON-LD script tags are skipped.
func extractPageMetadata(r io.Reader, ogOnly bool) pageMetadata {
	var raw pageMetadata
	tokenizer := html.NewTokenizer(r)

	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			raw.resolve()
			return raw

		case html.StartTagToken, html.SelfClosingTagToken:
			t := tokenizer.Token()

			switch t.Data {
			case "title":
				if tt == html.StartTagToken && raw.titleElement == "" {
					if tokenizer.Next() == html.TextToken {
						raw.titleElement = strings.TrimSpace(tokenizer.Token().Data)
					}
				}

			case "meta":
				property, name, content := metaTagAttrs(t.Attr)
				switch property {
				case "og:title":
					raw.ogTitle = content
				case "og:description":
					raw.ogDescription = content
				case "og:image":
					raw.ogImage = content
				}
				switch name {
				case "twitter:title":
					raw.twitterTitle = content
				case "twitter:description":
					raw.twitterDesc = content
				case "twitter:image":
					raw.twitterImage = content
				case "description":
					raw.metaDesc = content
				}

			case "script":
				if !ogOnly && raw.jsonldTitle == "" && scriptIsJSONLD(t.Attr) {
					if tokenizer.Next() == html.TextToken {
						parseJSONLD(tokenizer.Token().Data, &raw)
					}
				}
			}
		}
	}
}

func scriptIsJSONLD(attrs []html.Attribute) bool {
	for _, a := range attrs {
		if a.Key == "type" && a.Val == "application/ld+json" {
			return true
		}
	}
	return false
}

// parseJSONLD extracts name, description, and image from a JSON-LD blob.
// Only populates fields that are not already set.
func parseJSONLD(data string, raw *pageMetadata) {
	var schema jsonldSchema
	if err := json.Unmarshal([]byte(data), &schema); err != nil {
		return
	}

	if raw.jsonldTitle == "" {
		raw.jsonldTitle = schema.Name
	}
	if raw.jsonldDesc == "" {
		raw.jsonldDesc = schema.Description
	}
	if raw.jsonldImage == "" {
		raw.jsonldImage = extractJSONLDImage(schema.Image)
	}
}

// extractJSONLDImage handles image being either a string or []string in JSON-LD.
func extractJSONLDImage(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	// Try string first
	var single string
	if err := json.Unmarshal(raw, &single); err == nil {
		return single
	}
	// Try array
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil && len(arr) > 0 {
		return arr[0]
	}
	return ""
}

// metaTagAttrs extracts property, name, and content attributes from a <meta> token.
func metaTagAttrs(attrs []html.Attribute) (property, name, content string) {
	for _, a := range attrs {
		switch a.Key {
		case "property":
			property = a.Val
		case "name":
			name = a.Val
		case "content":
			content = a.Val
		}
	}
	return
}
