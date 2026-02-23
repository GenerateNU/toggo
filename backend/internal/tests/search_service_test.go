package tests

import (
	"context"
	"errors"
	"testing"
	"time"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/services"
	"toggo/internal/tests/mocks"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Unit tests for SearchService — all dependencies are mocked.
// ---------------------------------------------------------------------------

// newSearchSvc builds a SearchService wired to mockable repository fields.
func newSearchSvc(
	mockSearch *mocks.MockSearchRepository,
	mockActivityCategory *mocks.MockActivityCategoryRepository,
	mockFile *mocks.MockFileServiceInterface,
) services.SearchServiceInterface {
	repo := &repository.Repository{
		Search:           mockSearch,
		ActivityCategory: mockActivityCategory,
	}
	return services.NewSearchService(repo, mockFile)
}

// ---------------------------------------------------------------------------
// SearchTrips
// ---------------------------------------------------------------------------

func TestSearchService_SearchTrips(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	tripID := uuid.New()
	now := time.Now()

	tripRow := &models.TripDatabaseResponse{
		TripID:    tripID,
		Name:      "Beach Vacation",
		BudgetMin: 100,
		BudgetMax: 500,
		CreatedAt: now,
		UpdatedAt: now,
	}

	t.Run("returns matching trips", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchTrips(context.Background(), userID, "beach", 20, 0).
			Return([]*models.TripDatabaseResponse{tripRow}, 1, nil)
		// No cover image key → FetchFileURLs makes no outgoing call

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchTrips(context.Background(), userID, "beach", 20, 0)

		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Len(t, result.Items, 1)
		assert.Equal(t, 20, result.Limit)
		assert.Equal(t, 0, result.Offset)
		assert.Equal(t, "Beach Vacation", result.Items[0].Name)
	})

	t.Run("returns empty list when no trips match", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchTrips(context.Background(), userID, "zzznomatch", 20, 0).
			Return([]*models.TripDatabaseResponse{}, 0, nil)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchTrips(context.Background(), userID, "zzznomatch", 20, 0)

		require.NoError(t, err)
		assert.Equal(t, 0, result.Total)
		assert.Empty(t, result.Items)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		dbErr := errors.New("connection reset")
		mockSearch.EXPECT().
			SearchTrips(context.Background(), userID, "beach", 20, 0).
			Return(nil, 0, dbErr)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		_, err := svc.SearchTrips(context.Background(), userID, "beach", 20, 0)

		assert.ErrorIs(t, err, dbErr)
	})

	t.Run("honours limit and offset", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchTrips(context.Background(), userID, "trip", 5, 10).
			Return([]*models.TripDatabaseResponse{tripRow}, 11, nil)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchTrips(context.Background(), userID, "trip", 5, 10)

		require.NoError(t, err)
		assert.Equal(t, 11, result.Total)
		assert.Equal(t, 5, result.Limit)
		assert.Equal(t, 10, result.Offset)
	})
}

// ---------------------------------------------------------------------------
// SearchActivities
// ---------------------------------------------------------------------------

func TestSearchService_SearchActivities(t *testing.T) {
	t.Parallel()

	tripID := uuid.New()
	actID := uuid.New()
	now := time.Now()

	actRow := &models.ActivityDatabaseResponse{
		ID:               actID,
		TripID:           tripID,
		Name:             "Snorkeling",
		CreatedAt:        now,
		UpdatedAt:        now,
		ProposerUsername: "bob",
	}

	t.Run("returns matching activities", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchActivities(context.Background(), tripID, "snorkel", 20, 0).
			Return([]*models.ActivityDatabaseResponse{actRow}, 1, nil)
		mockAC.EXPECT().
			GetCategoriesForActivities(context.Background(), []uuid.UUID{actID}).
			Return(map[uuid.UUID][]string{actID: {"water", "adventure"}}, nil)
		// No proposer picture key → FetchFileURLs makes no outgoing call

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchActivities(context.Background(), tripID, "snorkel", 20, 0)

		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Len(t, result.Items, 1)
		assert.Equal(t, "Snorkeling", result.Items[0].Name)
		assert.ElementsMatch(t, []string{"water", "adventure"}, result.Items[0].CategoryNames)
	})

	t.Run("returns empty list when no activities match", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchActivities(context.Background(), tripID, "zzznomatch", 20, 0).
			Return([]*models.ActivityDatabaseResponse{}, 0, nil)
		mockAC.EXPECT().
			GetCategoriesForActivities(context.Background(), []uuid.UUID{}).
			Return(map[uuid.UUID][]string{}, nil)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchActivities(context.Background(), tripID, "zzznomatch", 20, 0)

		require.NoError(t, err)
		assert.Equal(t, 0, result.Total)
		assert.Empty(t, result.Items)
	})

	t.Run("propagates search repository error", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		dbErr := errors.New("db unavailable")
		mockSearch.EXPECT().
			SearchActivities(context.Background(), tripID, "swim", 20, 0).
			Return(nil, 0, dbErr)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		_, err := svc.SearchActivities(context.Background(), tripID, "swim", 20, 0)

		assert.ErrorIs(t, err, dbErr)
	})

	t.Run("propagates category fetch error", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		catErr := errors.New("categories unavailable")
		mockSearch.EXPECT().
			SearchActivities(context.Background(), tripID, "snorkel", 20, 0).
			Return([]*models.ActivityDatabaseResponse{actRow}, 1, nil)
		mockAC.EXPECT().
			GetCategoriesForActivities(context.Background(), []uuid.UUID{actID}).
			Return(nil, catErr)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		_, err := svc.SearchActivities(context.Background(), tripID, "snorkel", 20, 0)

		assert.ErrorIs(t, err, catErr)
	})

	t.Run("honours limit and offset", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchActivities(context.Background(), tripID, "snorkel", 3, 6).
			Return([]*models.ActivityDatabaseResponse{actRow}, 7, nil)
		mockAC.EXPECT().
			GetCategoriesForActivities(context.Background(), []uuid.UUID{actID}).
			Return(map[uuid.UUID][]string{}, nil)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchActivities(context.Background(), tripID, "snorkel", 3, 6)

		require.NoError(t, err)
		assert.Equal(t, 7, result.Total)
		assert.Equal(t, 3, result.Limit)
		assert.Equal(t, 6, result.Offset)
	})
}

// ---------------------------------------------------------------------------
// SearchTripMembers
// ---------------------------------------------------------------------------

func TestSearchService_SearchTripMembers(t *testing.T) {
	t.Parallel()

	tripID := uuid.New()
	memberUserID := uuid.New()
	now := time.Now()

	memberRow := &models.MembershipDatabaseResponse{
		UserID:    memberUserID,
		TripID:    tripID,
		IsAdmin:   false,
		CreatedAt: now,
		UpdatedAt: now,
		Username:  "alice",
		BudgetMin: 0,
		BudgetMax: 0,
	}

	t.Run("returns matching members", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchTripMembers(context.Background(), tripID, "alice", 20, 0).
			Return([]*models.MembershipDatabaseResponse{memberRow}, 1, nil)
		// No profile picture key → FetchFileURLs makes no outgoing call

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchTripMembers(context.Background(), tripID, "alice", 20, 0)

		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Len(t, result.Items, 1)
		assert.Equal(t, "alice", result.Items[0].Username)
	})

	t.Run("returns empty list when no members match", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchTripMembers(context.Background(), tripID, "zzznobody", 20, 0).
			Return([]*models.MembershipDatabaseResponse{}, 0, nil)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchTripMembers(context.Background(), tripID, "zzznobody", 20, 0)

		require.NoError(t, err)
		assert.Equal(t, 0, result.Total)
		assert.Empty(t, result.Items)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		dbErr := errors.New("db timeout")
		mockSearch.EXPECT().
			SearchTripMembers(context.Background(), tripID, "alice", 20, 0).
			Return(nil, 0, dbErr)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		_, err := svc.SearchTripMembers(context.Background(), tripID, "alice", 20, 0)

		assert.ErrorIs(t, err, dbErr)
	})

	t.Run("matches by display name not just username", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		rowByName := &models.MembershipDatabaseResponse{
			UserID:    uuid.New(),
			TripID:    tripID,
			Username:  "asmith",
			CreatedAt: now,
			UpdatedAt: now,
		}
		mockSearch.EXPECT().
			SearchTripMembers(context.Background(), tripID, "Alice Smith", 20, 0).
			Return([]*models.MembershipDatabaseResponse{rowByName}, 1, nil)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchTripMembers(context.Background(), tripID, "Alice Smith", 20, 0)

		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Equal(t, "asmith", result.Items[0].Username)
	})

	t.Run("honours limit and offset", func(t *testing.T) {
		t.Parallel()
		mockSearch := mocks.NewMockSearchRepository(t)
		mockAC := mocks.NewMockActivityCategoryRepository(t)
		mockFile := mocks.NewMockFileServiceInterface(t)

		mockSearch.EXPECT().
			SearchTripMembers(context.Background(), tripID, "alice", 5, 10).
			Return([]*models.MembershipDatabaseResponse{memberRow}, 11, nil)

		svc := newSearchSvc(mockSearch, mockAC, mockFile)
		result, err := svc.SearchTripMembers(context.Background(), tripID, "alice", 5, 10)

		require.NoError(t, err)
		assert.Equal(t, 11, result.Total)
		assert.Equal(t, 5, result.Limit)
		assert.Equal(t, 10, result.Offset)
	})
}
