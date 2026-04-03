package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
	"golang.org/x/net/html"
)

const (
	ogFetchTimeout     = 5 * time.Second
	ogMaxResponseBytes = 512 * 1024 // 512 KB — enough to cover the <head> of any page
)

type PitchLinkServiceInterface interface {
	AddLink(ctx context.Context, tripID, pitchID, userID uuid.UUID, req models.CreatePitchLinkRequest) (*models.PitchLink, error)
	GetLinks(ctx context.Context, pitchID uuid.UUID) ([]*models.PitchLink, error)
	DeleteLink(ctx context.Context, pitchID, linkID uuid.UUID) error
}

var _ PitchLinkServiceInterface = (*PitchLinkService)(nil)

type PitchLinkService struct {
	linkRepo   repository.PitchLinkRepository
	pitchRepo  repository.PitchRepository
	httpClient *http.Client
}

func NewPitchLinkService(linkRepo repository.PitchLinkRepository, pitchRepo repository.PitchRepository, httpClient *http.Client) PitchLinkServiceInterface {
	client := httpClient
	if client == nil {
		client = &http.Client{Timeout: ogFetchTimeout}
	}
	return &PitchLinkService{
		linkRepo:   linkRepo,
		pitchRepo:  pitchRepo,
		httpClient: client,
	}
}

func (s *PitchLinkService) AddLink(ctx context.Context, tripID, pitchID, userID uuid.UUID, req models.CreatePitchLinkRequest) (*models.PitchLink, error) {
	pitch, err := s.pitchRepo.FindByIDAndTripID(ctx, pitchID, tripID)
	if err != nil {
		return nil, err
	}
	if pitch.UserID != userID {
		return nil, errs.Forbidden()
	}

	parsed, err := url.ParseRequestURI(req.URL)
	if err != nil {
		return nil, errs.BadRequest(errors.New("invalid URL"))
	}

	domain := parsed.Hostname()
	link := &models.PitchLink{
		ID:      uuid.New(),
		PitchID: pitchID,
		AddedBy: userID,
		URL:     req.URL,
		Domain:  &domain,
	}

	if meta, err := fetchOGMetadata(s.httpClient, req.URL); err == nil {
		link.Title = meta.title
		link.Description = meta.description
		link.ThumbnailURL = meta.thumbnailURL
	}

	return s.linkRepo.Create(ctx, link)
}

func (s *PitchLinkService) GetLinks(ctx context.Context, pitchID uuid.UUID) ([]*models.PitchLink, error) {
	return s.linkRepo.FindByPitchID(ctx, pitchID)
}

func (s *PitchLinkService) DeleteLink(ctx context.Context, pitchID, linkID uuid.UUID) error {
	return s.linkRepo.Delete(ctx, linkID, pitchID)
}

type ogMetadata struct {
	title        *string
	description  *string
	thumbnailURL *string
}

func fetchOGMetadata(client *http.Client, rawURL string) (*ogMetadata, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; toggo-bot/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	doc, err := html.Parse(io.LimitReader(resp.Body, ogMaxResponseBytes))
	if err != nil {
		return nil, err
	}

	return extractOGMetadata(doc), nil
}

func extractOGMetadata(node *html.Node) *ogMetadata {
	meta := &ogMetadata{}

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "body":
				// OG tags live in <head>; no need to traverse <body>.
				return
			case "meta":
				var property, name, content string
				for _, attr := range n.Attr {
					switch attr.Key {
					case "property":
						property = attr.Val
					case "name":
						name = attr.Val
					case "content":
						content = attr.Val
					}
				}
				switch {
				case property == "og:title" && content != "":
					v := content
					meta.title = &v
				case property == "og:description" && content != "":
					v := content
					meta.description = &v
				case property == "og:image" && content != "":
					v := content
					meta.thumbnailURL = &v
				case name == "description" && content != "" && meta.description == nil:
					v := content
					meta.description = &v
				}
			case "title":
				if meta.title == nil && n.FirstChild != nil {
					v := strings.TrimSpace(n.FirstChild.Data)
					if v != "" {
						meta.title = &v
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(node)

	return meta
}
