package tests

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// -- Mocks --

type mockPitchLinkRepo struct {
	mock.Mock
}

func (m *mockPitchLinkRepo) Create(ctx context.Context, link *models.PitchLink) (*models.PitchLink, error) {
	args := m.Called(ctx, link)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PitchLink), args.Error(1)
}

func (m *mockPitchLinkRepo) FindByPitchID(ctx context.Context, pitchID uuid.UUID) ([]*models.PitchLink, error) {
	args := m.Called(ctx, pitchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.PitchLink), args.Error(1)
}

func (m *mockPitchLinkRepo) FindByPitchIDs(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]*models.PitchLink, error) {
	return nil, nil
}

func (m *mockPitchLinkRepo) Delete(ctx context.Context, id uuid.UUID, pitchID uuid.UUID) error {
	return m.Called(ctx, id, pitchID).Error(0)
}

type mockPitchRepoForLinks struct {
	mock.Mock
}

func (m *mockPitchRepoForLinks) FindByIDAndTripID(ctx context.Context, id, tripID uuid.UUID) (*models.PitchDatabaseResponse, error) {
	args := m.Called(ctx, id, tripID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PitchDatabaseResponse), args.Error(1)
}

func (m *mockPitchRepoForLinks) Create(ctx context.Context, pitch *models.TripPitch) (*models.TripPitch, error) {
	return nil, nil
}
func (m *mockPitchRepoForLinks) CreateWithImages(ctx context.Context, pitch *models.TripPitch, imageIDs []uuid.UUID) (*models.TripPitch, error) {
	return nil, nil
}
func (m *mockPitchRepoForLinks) FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.PitchCursor) ([]*models.PitchDatabaseResponse, *models.PitchCursor, error) {
	return nil, nil, nil
}
func (m *mockPitchRepoForLinks) Update(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest) (*models.TripPitch, error) {
	return nil, nil
}
func (m *mockPitchRepoForLinks) UpdateWithImages(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest, imageIDs []uuid.UUID) (*models.TripPitch, error) {
	return nil, nil
}
func (m *mockPitchRepoForLinks) Delete(ctx context.Context, id, tripID uuid.UUID) error { return nil }
func (m *mockPitchRepoForLinks) GetImageIDsForPitch(ctx context.Context, pitchID uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (m *mockPitchRepoForLinks) GetImageIDsForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	return nil, nil
}
func (m *mockPitchRepoForLinks) GetImagesForPitch(ctx context.Context, pitchID uuid.UUID) ([]models.PitchImageKey, error) {
	return nil, nil
}
func (m *mockPitchRepoForLinks) GetImagesForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]models.PitchImageKey, error) {
	return nil, nil
}

// -- OG metadata tests --

func TestPitchLinks_OGMetadataExtraction(t *testing.T) {
	t.Run("extracts og:title, og:description, og:image", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="My Page Title" />
  <meta property="og:description" content="A great description" />
  <meta property="og:image" content="https://example.com/image.png" />
</head>
<body><p>content</p></body>
</html>`))
		}))
		defer srv.Close()

		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		tripID, pitchID, userID := uuid.New(), uuid.New(), uuid.New()

		pitchRepo.On("FindByIDAndTripID", mock.Anything, pitchID, tripID).
			Return(&models.PitchDatabaseResponse{ID: pitchID, UserID: userID}, nil)
		linkRepo.On("Create", mock.Anything, mock.MatchedBy(func(l *models.PitchLink) bool {
			return l.Title != nil && *l.Title == "My Page Title" &&
				l.Description != nil && *l.Description == "A great description" &&
				l.ThumbnailURL != nil && *l.ThumbnailURL == "https://example.com/image.png"
		})).Return(&models.PitchLink{ID: uuid.New()}, nil)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, srv.Client())
		_, err := svc.AddLink(context.Background(), tripID, pitchID, userID, models.CreatePitchLinkRequest{URL: srv.URL})
		assert.NoError(t, err)
		linkRepo.AssertExpectations(t)
	})

	t.Run("falls back to <title> tag when og:title is absent", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte(`<html><head><title>Fallback Title</title></head><body></body></html>`))
		}))
		defer srv.Close()

		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		tripID, pitchID, userID := uuid.New(), uuid.New(), uuid.New()

		pitchRepo.On("FindByIDAndTripID", mock.Anything, pitchID, tripID).
			Return(&models.PitchDatabaseResponse{ID: pitchID, UserID: userID}, nil)
		linkRepo.On("Create", mock.Anything, mock.MatchedBy(func(l *models.PitchLink) bool {
			return l.Title != nil && *l.Title == "Fallback Title"
		})).Return(&models.PitchLink{ID: uuid.New()}, nil)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, srv.Client())
		_, err := svc.AddLink(context.Background(), tripID, pitchID, userID, models.CreatePitchLinkRequest{URL: srv.URL})
		assert.NoError(t, err)
		linkRepo.AssertExpectations(t)
	})

	t.Run("still creates link when OG fetch fails", func(t *testing.T) {
		t.Parallel()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer srv.Close()

		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		tripID, pitchID, userID := uuid.New(), uuid.New(), uuid.New()

		pitchRepo.On("FindByIDAndTripID", mock.Anything, pitchID, tripID).
			Return(&models.PitchDatabaseResponse{ID: pitchID, UserID: userID}, nil)
		linkRepo.On("Create", mock.Anything, mock.MatchedBy(func(l *models.PitchLink) bool {
			return l.Title == nil && l.Description == nil && l.ThumbnailURL == nil
		})).Return(&models.PitchLink{ID: uuid.New()}, nil)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, srv.Client())
		_, err := svc.AddLink(context.Background(), tripID, pitchID, userID, models.CreatePitchLinkRequest{URL: srv.URL})
		assert.NoError(t, err)
		linkRepo.AssertExpectations(t)
	})
}

// -- PitchLinkService unit tests --

func TestPitchLinkService_AddLink(t *testing.T) {
	t.Run("returns forbidden when user is not the pitch owner", func(t *testing.T) {
		t.Parallel()
		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		tripID, pitchID := uuid.New(), uuid.New()
		ownerID := uuid.New()
		otherUser := uuid.New()

		pitchRepo.On("FindByIDAndTripID", mock.Anything, pitchID, tripID).
			Return(&models.PitchDatabaseResponse{ID: pitchID, UserID: ownerID}, nil)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, nil)
		_, err := svc.AddLink(context.Background(), tripID, pitchID, otherUser, models.CreatePitchLinkRequest{URL: "https://example.com"})

		var apiErr errs.APIError
		assert.True(t, errors.As(err, &apiErr))
		assert.Equal(t, http.StatusForbidden, apiErr.StatusCode)
		linkRepo.AssertNotCalled(t, "Create")
	})

	t.Run("returns not found when pitch does not exist", func(t *testing.T) {
		t.Parallel()
		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		tripID, pitchID, userID := uuid.New(), uuid.New(), uuid.New()

		pitchRepo.On("FindByIDAndTripID", mock.Anything, pitchID, tripID).
			Return(nil, errs.ErrNotFound)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, nil)
		_, err := svc.AddLink(context.Background(), tripID, pitchID, userID, models.CreatePitchLinkRequest{URL: "https://example.com"})

		assert.ErrorIs(t, err, errs.ErrNotFound)
	})

	t.Run("rejects an invalid URL", func(t *testing.T) {
		t.Parallel()
		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		tripID, pitchID, userID := uuid.New(), uuid.New(), uuid.New()

		pitchRepo.On("FindByIDAndTripID", mock.Anything, pitchID, tripID).
			Return(&models.PitchDatabaseResponse{ID: pitchID, UserID: userID}, nil)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, nil)
		_, err := svc.AddLink(context.Background(), tripID, pitchID, userID, models.CreatePitchLinkRequest{URL: "not-a-url"})

		assert.Error(t, err)
		linkRepo.AssertNotCalled(t, "Create")
	})
}

func TestPitchLinkService_GetLinks(t *testing.T) {
	t.Run("returns links for a pitch", func(t *testing.T) {
		t.Parallel()
		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		pitchID := uuid.New()
		expected := []*models.PitchLink{{ID: uuid.New(), PitchID: pitchID, URL: "https://example.com"}}

		linkRepo.On("FindByPitchID", mock.Anything, pitchID).Return(expected, nil)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, nil)
		links, err := svc.GetLinks(context.Background(), pitchID)

		assert.NoError(t, err)
		assert.Equal(t, expected, links)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()
		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		pitchID := uuid.New()

		linkRepo.On("FindByPitchID", mock.Anything, pitchID).Return(nil, errors.New("db error"))

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, nil)
		_, err := svc.GetLinks(context.Background(), pitchID)

		assert.Error(t, err)
	})
}

func TestPitchLinkService_DeleteLink(t *testing.T) {
	t.Run("deletes a link successfully", func(t *testing.T) {
		t.Parallel()
		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		pitchID, linkID := uuid.New(), uuid.New()

		linkRepo.On("Delete", mock.Anything, linkID, pitchID).Return(nil)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, nil)
		err := svc.DeleteLink(context.Background(), pitchID, linkID)

		assert.NoError(t, err)
	})

	t.Run("returns not found when link does not exist", func(t *testing.T) {
		t.Parallel()
		linkRepo := &mockPitchLinkRepo{}
		pitchRepo := &mockPitchRepoForLinks{}
		pitchID, linkID := uuid.New(), uuid.New()

		linkRepo.On("Delete", mock.Anything, linkID, pitchID).Return(errs.ErrNotFound)

		svc := services.NewPitchLinkService(linkRepo, pitchRepo, nil)
		err := svc.DeleteLink(context.Background(), pitchID, linkID)

		assert.ErrorIs(t, err, errs.ErrNotFound)
	})
}
