package repository

import (
	"github.com/uptrace/bun"
)

type Repository struct {
	User             UserRepository
	Health           HealthRepository
	Image            ImageRepository
	Comment          CommentRepository
	Membership       MembershipRepository
	Trip             TripRepository
	Pitch            PitchRepository
	Activity         ActivityRepository
	Category         CategoryRepository
	ActivityCategory ActivityCategoryRepository
	Poll             PollRepository
	PollRanking      PollRankingRepository
	PollVoting       PollVotingRepository
	PollCategory     PollCategoryRepository
	TripInvite       TripInviteRepository
	Search           SearchRepository
	ActivityRSVP     ActivityRSVPRepository
	db               *bun.DB
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User:             NewUserRepository(db),
		Health:           NewHealthRepository(db),
		Image:            NewImageRepository(db),
		Comment:          NewCommentRepository(db),
		Trip:             NewTripRepository(db),
		Poll:             NewPollRepository(db),
		PollRanking:      NewPollRankingRepository(db),
		PollVoting:       NewPollVotingRepository(db),
		PollCategory:     NewPollCategoryRepository(db),
		Membership:       NewMembershipRepository(db),
		Pitch:            NewPitchRepository(db),
		Activity:         NewActivityRepository(db),
		Category:         NewCategoryRepository(db),
		ActivityCategory: NewActivityCategoryRepository(db),
		ActivityRSVP:     NewActivityRSVPRepository(db),
		TripInvite:       NewTripInviteRepository(db),
		Search:           NewSearchRepository(db),
		db:               db,
	}
}

// GetDB returns the underlying database connection for transactions
func (r *Repository) GetDB() *bun.DB {
	return r.db
}

type HealthRepository interface {
	HealthCheck(ctx context.Context) (string, error)
}

type UserRepository interface {
	Create(ctx context.Context, user *models.User) (*models.User, error)
	Find(ctx context.Context, id uuid.UUID) (*models.User, error)
	Update(ctx context.Context, id uuid.UUID, user *models.UpdateUserRequest) (*models.User, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetUsersWithDeviceTokens(ctx context.Context, userIDs []uuid.UUID) ([]*models.User, error)
}

type TripRepository interface {
	Create(ctx context.Context, trip *models.Trip) (*models.Trip, error)
	Find(ctx context.Context, id uuid.UUID) (*models.Trip, error)
	FindWithCoverImage(ctx context.Context, id uuid.UUID) (*models.TripDatabaseResponse, error)
	FindAllWithCursorAndCoverImage(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.TripDatabaseResponse, *models.TripCursor, error)
	FindAllWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.Trip, *models.TripCursor, error)
	Update(ctx context.Context, id uuid.UUID, req *models.UpdateTripRequest) (*models.Trip, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type TripInviteRepository interface {
	Create(ctx context.Context, invite *models.TripInvite) (*models.TripInvite, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.TripInvite, error)
	FindByCode(ctx context.Context, code string) (*models.TripInvite, error)
}

type MembershipRepository interface {
	Create(ctx context.Context, membership *models.Membership) (*models.Membership, error)
	Find(ctx context.Context, userID, tripID uuid.UUID) (*models.MembershipDatabaseResponse, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.MembershipDatabaseResponse, error)
	FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.MembershipCursor) ([]*models.MembershipDatabaseResponse, *models.MembershipCursor, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error)
	IsMember(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	IsAdmin(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	CountMembers(ctx context.Context, tripID uuid.UUID) (int, error)
	CountAdmins(ctx context.Context, tripID uuid.UUID) (int, error)
	Update(ctx context.Context, userID, tripID uuid.UUID, req *models.UpdateMembershipRequest) (*models.Membership, error)
	Delete(ctx context.Context, userID, tripID uuid.UUID) error
}

type ImageRepository interface {
	CreatePendingImages(ctx context.Context, imageID uuid.UUID, fileKey string, sizes []models.ImageSize) ([]*models.Image, error)
	ConfirmUpload(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.Image, error)
	ConfirmAllUploads(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error)
	MarkFailed(ctx context.Context, imageID uuid.UUID, size models.ImageSize) error
	FindByID(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error)
	FindByIDAndSize(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.Image, error)
	FindByIDIncludingPending(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error)
	DeleteByID(ctx context.Context, imageID uuid.UUID) error
	CleanupPendingUploads(ctx context.Context, olderThan time.Duration) (int64, error)
}

type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) (*models.Comment, error)
	Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, content string) (*models.Comment, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	FindPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit int, cursor *models.CommentCursor) ([]*models.CommentDatabaseResponse, error)
}

// PitchRepository handles persistence for trip pitches (audio pitches per trip).
type PitchRepository interface {
	Create(ctx context.Context, pitch *models.TripPitch) (*models.TripPitch, error)
	// CreateWithImages inserts the pitch and its initial image associations in a single transaction.
	CreateWithImages(ctx context.Context, pitch *models.TripPitch, imageIDs []uuid.UUID) (*models.TripPitch, error)
	FindByIDAndTripID(ctx context.Context, id, tripID uuid.UUID) (*models.TripPitch, error)
	FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.PitchCursor) ([]*models.TripPitch, *models.PitchCursor, error)
	Update(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest) (*models.TripPitch, error)
	Delete(ctx context.Context, id, tripID uuid.UUID) error

	// SetImages fully replaces the image associations for a pitch inside a transaction.
	// Passing an empty slice removes all associations.
	SetImages(ctx context.Context, pitchID uuid.UUID, imageIDs []uuid.UUID) error
	// UpdateWithImages atomically updates pitch metadata and merges image associations
	// in a single transaction, so a failure in either operation rolls back both.
	UpdateWithImages(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest, imageIDs []uuid.UUID) (*models.TripPitch, error)
	GetImageIDsForPitch(ctx context.Context, pitchID uuid.UUID) ([]uuid.UUID, error)
	GetImageIDsForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error)
	// GetImageKeysForPitch returns the S3 file keys associated with a single pitch.
	GetImageKeysForPitch(ctx context.Context, pitchID uuid.UUID) ([]string, error)
	// GetImageKeysForPitches batch-loads S3 file keys for multiple pitches to avoid N+1 queries.
	GetImageKeysForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]string, error)
}

type ActivityRepository interface {
	Create(ctx context.Context, activity *models.Activity) (*models.Activity, error)
	Find(ctx context.Context, activityID uuid.UUID) (*models.ActivityDatabaseResponse, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID, cursor *models.ActivityCursor, limit int) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error)
	FindByCategoryName(ctx context.Context, tripID uuid.UUID, categoryName string, cursor *models.ActivityCursor, limit int) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error)
	Exists(ctx context.Context, activityID uuid.UUID) (bool, error)
	CountByTripID(ctx context.Context, tripID uuid.UUID) (int, error)
	Update(ctx context.Context, activityID uuid.UUID, req *models.UpdateActivityRequest) (*models.Activity, error)
	Delete(ctx context.Context, activityID uuid.UUID) error
}

type CategoryRepository interface {
	Create(ctx context.Context, category *models.Category) (*models.Category, error)
	Find(ctx context.Context, tripID uuid.UUID, name string) (*models.Category, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.Category, error)
	Exists(ctx context.Context, tripID uuid.UUID, name string) (bool, error)
	Delete(ctx context.Context, tripID uuid.UUID, name string) error
}

type ActivityCategoryRepository interface {
	AddCategoriesToActivity(ctx context.Context, activityID, tripID uuid.UUID, categoryNames []string) error
	RemoveCategoryFromActivity(ctx context.Context, activityID uuid.UUID, categoryName string) error
	GetCategoriesForActivity(ctx context.Context, activityID uuid.UUID, limit int, cursor *string) ([]string, *string, error)
	GetCategoriesForActivities(ctx context.Context, activityIDs []uuid.UUID) (map[uuid.UUID][]string, error)
	RemoveAllCategoriesFromActivity(ctx context.Context, activityID uuid.UUID) error
}

type SearchRepository interface {
	SearchTrips(ctx context.Context, userID uuid.UUID, query string, limit, offset int) ([]*models.TripDatabaseResponse, int, error)
	SearchActivities(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) ([]*models.ActivityDatabaseResponse, int, error)
	SearchTripMembers(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) ([]*models.MembershipDatabaseResponse, int, error)
}
