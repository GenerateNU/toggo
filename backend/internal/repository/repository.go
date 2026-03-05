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
	TripInvite       TripInviteRepository
	Search           SearchRepository
	ActivityRSVP     ActivityRSVPRepository
	db               *bun.DB
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User:             &userRepository{db: db},
		Health:           &healthRepository{db: db},
		Image:            &imageRepository{db: db},
		Comment:          &commentRepository{db: db},
		Trip:             &tripRepository{db: db},
		Poll:             &pollRepository{db: db},
		PollRanking:      &pollRankingRepository{db: db},
		Membership:       &membershipRepository{db: db},
		Pitch:            &pitchRepository{db: db},
		Activity:         &activityRepository{db: db},
		Category:         &categoryRepository{db: db},
		ActivityCategory: &activityCategoryRepository{db: db},
		ActivityRSVP:     &activityRSVPRepository{db: db},
		TripInvite:       &tripInviteRepository{db: db},
		Search:           &searchRepository{db: db},
		db:               db,
	}
}

// GetDB returns the underlying database connection for transactions
func (r *Repository) GetDB() *bun.DB {
	return r.db
}
