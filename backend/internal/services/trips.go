package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"os"
	"strings"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/realtime"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"golang.org/x/sync/errgroup"
)

type TripServiceInterface interface {
	CreateTrip(ctx context.Context, creatorUserID uuid.UUID, req models.CreateTripRequest) (*models.Trip, error)
	GetTrip(ctx context.Context, id uuid.UUID) (*models.TripAPIResponse, error)
	GetTripsWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursorToken string) (*models.TripCursorPageResult, error)
	UpdateTrip(ctx context.Context, tripID uuid.UUID, actorID uuid.UUID, req models.UpdateTripRequest) (*models.Trip, error)
	DeleteTrip(ctx context.Context, userID, tripID uuid.UUID) error
	CreateTripInvite(ctx context.Context, tripID uuid.UUID, createdBy uuid.UUID, req models.CreateTripInviteRequest) (*models.TripInviteAPIResponse, error)
}

var _ TripServiceInterface = (*TripService)(nil)

type TripService struct {
	*repository.Repository
	fileService FileServiceInterface
	publisher   realtime.EventPublisher
}

func NewTripService(repo *repository.Repository, fileService FileServiceInterface, publisher realtime.EventPublisher) TripServiceInterface {
	return &TripService{
		Repository:  repo,
		fileService: fileService,
		publisher:   publisher,
	}
}

func (s *TripService) CreateTrip(ctx context.Context, creatorUserID uuid.UUID, req models.CreateTripRequest) (*models.Trip, error) { //nolint:cyclop
	// Validate business rules
	if req.Name == "" {
		return nil, errs.BadRequest(errors.New("trip name cannot be empty"))
	}

	if req.BudgetMin < 0 {
		return nil, errs.BadRequest(errors.New("budget minimum cannot be negative"))
	}

	if req.BudgetMax < req.BudgetMin {
		return nil, errs.BadRequest(errors.New("budget maximum must be greater than or equal to minimum"))
	}

	if req.StartDate != nil && req.EndDate != nil && !req.EndDate.After(*req.StartDate) {
		return nil, errs.BadRequest(errors.New("end date must be after start date"))
	}

	// Validate cover image ID exists if provided
	if req.CoverImageID != nil {
		_, err := s.Image.FindByID(ctx, *req.CoverImageID)
		if err != nil {
			if errors.Is(err, errs.ErrNotFound) {
				return nil, errs.BadRequest(errors.New("cover image not found"))
			}
			return nil, err
		}
	}

	currency := req.Currency
	if currency == "" {
		currency = "USD"
	}

	if req.PitchDeadline != nil && req.PitchDeadline.Before(time.Now().UTC()) {
		return nil, errs.BadRequest(errors.New("pitch_deadline must be in the future"))
	}

	// Create trip
	trip := &models.Trip{
		ID:            uuid.New(),
		Name:          req.Name,
		CoverImageID:  req.CoverImageID,
		BudgetMin:     req.BudgetMin,
		BudgetMax:     req.BudgetMax,
		Currency:      currency,
		PitchDeadline: req.PitchDeadline,
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
	}

	// Use transaction to ensure trip creation, membership, and default categories are atomic
	var createdTrip *models.Trip
	err := s.Repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Create trip within transaction
		_, err := tx.NewInsert().
			Model(trip).
			Returning("*").
			Exec(ctx)
		if err != nil {
			return err
		}
		createdTrip = trip

		// Create membership within the same transaction
		membership := &models.Membership{
			UserID:            creatorUserID,
			TripID:            trip.ID,
			IsAdmin:           true,
			BudgetMin:         req.BudgetMin,
			BudgetMax:         req.BudgetMax,
			NotifyNewPitches:  true,
			NotifyNewPolls:    true,
			NotifyNewComments: true,
		}

		_, err = tx.NewInsert().
			Model(membership).
			Returning("*").
			Exec(ctx)
		if err != nil {
			return err
		}

		// Seed default categories as a single batch insert
		return s.Category.UpsertBatchTx(ctx, tx, trip.ID, models.DefaultCategoryNames)
	})

	if err != nil {
		return nil, err
	}

	// Publish trip.created event
	if s.publisher != nil {
		event, err := realtime.NewEventWithActor(realtime.EventTopicTripCreated, createdTrip.ID.String(), createdTrip.ID.String(), creatorUserID.String(), "", createdTrip)
		if err != nil {
			log.Printf("Failed to create trip.created event: %v", err)
		} else if err := s.publisher.Publish(ctx, event); err != nil {
			log.Printf("Failed to publish trip.created event: %v", err)
		}
	}

	return createdTrip, nil
}

func (s *TripService) GetTrip(ctx context.Context, id uuid.UUID) (*models.TripAPIResponse, error) {
	tripData, err := s.Trip.FindWithCoverImage(ctx, id)
	if err != nil {
		return nil, err
	}
	if tripData == nil {
		return nil, errs.ErrNotFound
	}

	return s.toAPIResponse(ctx, tripData)
}

func (s *TripService) GetTripsWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursorToken string) (*models.TripCursorPageResult, error) {
	cursor, err := pagination.ParseCursor(cursorToken)
	if err != nil {
		return nil, err
	}

	tripsData, nextCursor, err := s.Trip.FindAllWithCursorAndCoverImage(ctx, userID, limit, cursor)
	if err != nil {
		return nil, err
	}

	tripIDs := make([]uuid.UUID, 0, len(tripsData))
	for _, t := range tripsData {
		tripIDs = append(tripIDs, t.TripID)
	}

	var coverURLMap map[string]string
	var memberStatsMap map[uuid.UUID]*models.TripMemberStats

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		coverURLMap = pagination.FetchFileURLs(gctx, s.fileService, tripsData, func(item *models.TripDatabaseResponse) *string {
			return item.CoverImageKey
		}, models.ImageSizeMedium)
		return nil
	})
	g.Go(func() error {
		var err error
		memberStatsMap, err = s.Membership.GetMemberStatsForTrips(gctx, tripIDs)
		return err
	})
	if err := g.Wait(); err != nil {
		return nil, err
	}

	memberPreviewRows := make([]models.TripMemberPreviewDB, 0, len(tripsData)*3)
	for _, tripID := range tripIDs {
		stats := memberStatsMap[tripID]
		if stats == nil {
			continue
		}
		memberPreviewRows = append(memberPreviewRows, stats.Previews...)
	}
	memberPicURLMap := pagination.FetchFileURLs(ctx, s.fileService, memberPreviewRows, func(item models.TripMemberPreviewDB) *string {
		return item.ProfilePictureKey
	}, models.ImageSizeSmall)

	tripResponses := s.convertToAPITrips(tripsData, coverURLMap, memberStatsMap, memberPicURLMap)

	return s.buildTripPageResult(tripResponses, nextCursor, limit)
}

func (s *TripService) convertToAPITrips(
	tripsData []*models.TripDatabaseResponse,
	coverURLMap map[string]string,
	memberStatsMap map[uuid.UUID]*models.TripMemberStats,
	memberPicURLMap map[string]string,
) []*models.TripAPIResponse {
	tripResponses := make([]*models.TripAPIResponse, 0, len(tripsData))
	for _, tripData := range tripsData {
		var coverImageURL *string
		if tripData.CoverImageKey != nil && *tripData.CoverImageKey != "" {
			if url, exists := coverURLMap[*tripData.CoverImageKey]; exists {
				coverImageURL = &url
			}
		}

		memberCount := 0
		memberPreviews := []models.CommenterPreview{}
		if stats := memberStatsMap[tripData.TripID]; stats != nil {
			memberCount = stats.Count
			if len(stats.Previews) > 0 {
				memberPreviews = make([]models.CommenterPreview, 0, len(stats.Previews))
				for _, m := range stats.Previews {
					preview := models.CommenterPreview{
						UserID:   m.UserID,
						Name:     m.Name,
						Username: m.Username,
					}
					if m.ProfilePictureKey != nil {
						if url, ok := memberPicURLMap[*m.ProfilePictureKey]; ok {
							preview.ProfilePictureURL = &url
						}
					}
					memberPreviews = append(memberPreviews, preview)
				}
			}
		}

		tripResponses = append(tripResponses, &models.TripAPIResponse{
			ID:            tripData.TripID,
			Name:          tripData.Name,
			CoverImageURL: coverImageURL,
			BudgetMin:     tripData.BudgetMin,
			BudgetMax:     tripData.BudgetMax,
			Currency:      tripData.Currency,
			PitchDeadline: tripData.PitchDeadline,
			RankPollID:    tripData.RankPollID,
			StartDate:     tripData.StartDate,
			EndDate:       tripData.EndDate,
			Location:      tripData.Location,
			MemberCount:   memberCount,
			MemberPreviews: memberPreviews,
			CreatedAt:     tripData.CreatedAt,
			UpdatedAt:     tripData.UpdatedAt,
		})
	}
	return tripResponses
}

func (s *TripService) buildTripPageResult(tripResponses []*models.TripAPIResponse, nextCursor *models.TripCursor, limit int) (*models.TripCursorPageResult, error) {
	result := &models.TripCursorPageResult{
		Items: tripResponses,
		Limit: limit,
	}
	if nextCursor != nil {
		token, err := pagination.EncodeTimeUUIDCursor(*nextCursor)
		if err != nil {
			return nil, err
		}
		result.NextCursor = &token
	}
	return result, nil
}

func (s *TripService) UpdateTrip(ctx context.Context, tripID uuid.UUID, actorID uuid.UUID, req models.UpdateTripRequest) (*models.Trip, error) {
	// Validate business rules only if fields are provided
	if req.Name != nil && *req.Name == "" {
		return nil, errs.BadRequest(errors.New("trip name cannot be empty"))
	}

	if req.BudgetMin != nil && *req.BudgetMin < 0 {
		return nil, errs.BadRequest(errors.New("budget minimum cannot be negative"))
	}

	if req.BudgetMin != nil && req.BudgetMax != nil && *req.BudgetMax < *req.BudgetMin {
		return nil, errs.BadRequest(errors.New("budget maximum must be greater than or equal to minimum"))
	}

	if req.StartDate != nil && req.EndDate != nil && !req.EndDate.After(*req.StartDate) {
		return nil, errs.BadRequest(errors.New("end date must be after start date"))
	}

	if req.CoverImageID != nil {
		_, err := s.Image.FindByID(ctx, *req.CoverImageID)
		if err != nil {
			if errors.Is(err, errs.ErrNotFound) {
				return nil, errs.BadRequest(errors.New("cover image not found"))
			}
			return nil, err
		}
	}

	if req.PitchDeadline != nil && req.PitchDeadline.Before(time.Now().UTC()) {
		return nil, errs.BadRequest(errors.New("pitch_deadline must be in the future"))
	}

	var trip *models.Trip
	err := s.Repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var txErr error
		trip, txErr = s.Trip.UpdateTx(ctx, tx, tripID, &req)
		if txErr != nil {
			return txErr
		}
		if req.PitchDeadline != nil && trip.RankPollID == nil {
			return s.createTripRankPollTx(ctx, tx, trip, actorID)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Publish trip.updated event
	if s.publisher != nil {
		event, err := realtime.NewEventWithActor(realtime.EventTopicTripUpdated, tripID.String(), tripID.String(), actorID.String(), "", trip)
		if err != nil {
			log.Printf("Failed to create trip.updated event: %v", err)
		} else if err := s.publisher.Publish(ctx, event); err != nil {
			log.Printf("Failed to publish trip.updated event: %v", err)
		}
	}

	return trip, nil
}

func (s *TripService) DeleteTrip(ctx context.Context, userID, tripID uuid.UUID) error {
	// Only admins can delete trips
	isAdmin, err := s.Membership.IsAdmin(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errs.Forbidden()
	}

	return s.Trip.Delete(ctx, tripID)
}

func (s *TripService) toAPIResponse(ctx context.Context, tripData *models.TripDatabaseResponse) (*models.TripAPIResponse, error) {
	var coverImageURL *string

	if tripData.CoverImageID != nil {
		fileResp, err := s.fileService.GetFile(ctx, *tripData.CoverImageID, models.ImageSizeMedium)
		if err == nil {
			coverImageURL = &fileResp.URL
		}
	}

	return &models.TripAPIResponse{
		ID:            tripData.TripID,
		Name:          tripData.Name,
		CoverImageURL: coverImageURL,
		BudgetMin:     tripData.BudgetMin,
		BudgetMax:     tripData.BudgetMax,
		Currency:      tripData.Currency,
		PitchDeadline: tripData.PitchDeadline,
		RankPollID:    tripData.RankPollID,
		StartDate:     tripData.StartDate,
		EndDate:       tripData.EndDate,
		Location:      tripData.Location,
		CreatedAt:     tripData.CreatedAt,
		UpdatedAt:     tripData.UpdatedAt,
	}, nil
}

const rankPollQuestion = "Rank your top destinations"

func (s *TripService) createTripRankPollTx(ctx context.Context, tx bun.Tx, trip *models.Trip, creatorID uuid.UUID) error {
	poll := &models.Poll{
		ID:        uuid.New(),
		TripID:    trip.ID,
		CreatedBy: creatorID,
		Question:  rankPollQuestion,
		PollType:  models.PollTypeRank,
	}
	if _, err := tx.NewInsert().Model(poll).Returning("*").Exec(ctx, poll); err != nil {
		return err
	}
	if err := s.Trip.SetRankPollIDTx(ctx, tx, trip.ID, poll.ID); err != nil {
		return err
	}
	trip.RankPollID = &poll.ID
	return nil
}

const defaultInviteExpiry = 7 * 24 * time.Hour

func generateInviteCode() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *TripService) CreateTripInvite(ctx context.Context, tripID uuid.UUID, createdBy uuid.UUID, req models.CreateTripInviteRequest) (*models.TripInviteAPIResponse, error) {
	expiresAt := time.Now().UTC().Add(defaultInviteExpiry)
	if req.ExpiresAt != nil {
		expiresAt = *req.ExpiresAt
		if expiresAt.Before(time.Now().UTC()) {
			return nil, errs.BadRequest(errors.New("expires_at must be in the future"))
		}
	}

	code, err := generateInviteCode()
	if err != nil {
		return nil, err
	}

	invite := &models.TripInvite{
		ID:        uuid.New(),
		TripID:    tripID,
		CreatedBy: createdBy,
		Code:      code,
		ExpiresAt: expiresAt,
		IsRevoked: false,
	}

	created, err := s.TripInvite.Create(ctx, invite)
	if err != nil {
		if errors.Is(err, errs.ErrDuplicate) {
			code, err = generateInviteCode()
			if err != nil {
				return nil, err
			}
			invite.Code = code
			created, err = s.TripInvite.Create(ctx, invite)
		}
		if err != nil {
			return nil, err
		}
	}

	var joinURL *string
	baseURL := os.Getenv("APP_PUBLIC_URL")
	if baseURL != "" {
		trimmed := strings.TrimRight(baseURL, "/")
		u := trimmed + "/join?code=" + created.Code
		joinURL = &u
	}

	return &models.TripInviteAPIResponse{
		ID:        created.ID,
		TripID:    created.TripID,
		CreatedBy: created.CreatedBy,
		Code:      created.Code,
		ExpiresAt: created.ExpiresAt,
		IsRevoked: created.IsRevoked,
		CreatedAt: created.CreatedAt,
		JoinURL:   joinURL,
	}, nil
}
