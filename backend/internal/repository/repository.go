package repository

import (
	"github.com/uptrace/bun"
)

type Repository struct {
	User                    UserRepository
	Health                  HealthRepository
	Image                   ImageRepository
	Comment                 CommentRepository
	CommentReaction         CommentReactionRepository
	Membership              MembershipRepository
	Trip                    TripRepository
	Pitch                   PitchRepository
	Activity                ActivityRepository
	Category                CategoryRepository
	ActivityCategory        ActivityCategoryRepository
	Poll                    PollRepository
	PollRanking             PollRankingRepository
	PollVoting              PollVotingRepository
	PollCategory            PollCategoryRepository
	TripInvite              TripInviteRepository
	Search                  SearchRepository
	ActivityRSVP            ActivityRSVPRepository
	NotificationPreferences NotificationPreferencesRepository
	db                      *bun.DB
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User:                    NewUserRepository(db),
		Health:                  NewHealthRepository(db),
		Image:                   NewImageRepository(db),
		Comment:                 NewCommentRepository(db),
		CommentReaction:         NewCommentReactionRepository(db),
		Trip:                    NewTripRepository(db),
		Poll:                    NewPollRepository(db),
		PollRanking:             NewPollRankingRepository(db),
		PollVoting:              NewPollVotingRepository(db),
		PollCategory:            NewPollCategoryRepository(db),
		Membership:              NewMembershipRepository(db),
		Pitch:                   NewPitchRepository(db),
		Activity:                NewActivityRepository(db),
		Category:                NewCategoryRepository(db),
		ActivityCategory:        NewActivityCategoryRepository(db),
		ActivityRSVP:            NewActivityRSVPRepository(db),
		TripInvite:              NewTripInviteRepository(db),
		Search:                  NewSearchRepository(db),
		NotificationPreferences: &notificationPreferencesRepository{db: db},
		db:                      db,
	}
}

// GetDB returns the underlying database connection for transactions
func (r *Repository) GetDB() *bun.DB {
	return r.db
}
