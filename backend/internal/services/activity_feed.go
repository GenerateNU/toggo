package services

import (
	"context"
	"log"
	"runtime/debug"
	"toggo/internal/realtime"
	"toggo/internal/repository"

	"github.com/redis/go-redis/v9"
)

// ActivityFeedServiceInterface is the contract used by the controller.
type ActivityFeedServiceInterface interface {
	GetFeed(ctx context.Context, userID, tripID string) ([]*realtime.Event, error)
	MarkRead(ctx context.Context, userID, tripID, eventID string) error
	GetUnreadCount(ctx context.Context, userID, tripID string) (int64, error)
}

var _ ActivityFeedServiceInterface = (*ActivityFeedService)(nil)

// ActivityFeedService manages the activity feed lifecycle and exposes the business
// methods used by the HTTP layer.
type ActivityFeedService struct {
	store      *realtime.ActivityFeedStore
	subscriber *realtime.ActivityFeedSubscriber
	ctx        context.Context
	cancel     context.CancelFunc
}

func NewActivityFeedService(redisClient *redis.Client, membershipRepo repository.MembershipRepository) *ActivityFeedService {
	store := realtime.NewActivityFeedStore(redisClient)
	subscriber := realtime.NewActivityFeedSubscriber(store, membershipRepo, redisClient)
	ctx, cancel := context.WithCancel(context.Background())
	return &ActivityFeedService{
		store:      store,
		subscriber: subscriber,
		ctx:        ctx,
		cancel:     cancel,
	}
}

// Start begins listening for trip events and fanning them out to member feeds.
func (s *ActivityFeedService) Start() {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("activity feed subscriber: panic recovered: %v\n%s", r, debug.Stack())
			}
		}()
		s.subscriber.Start(s.ctx)
	}()
	log.Println("Activity feed service started")
}

// Shutdown stops the subscriber goroutine.
func (s *ActivityFeedService) Shutdown() {
	s.cancel()
	log.Println("Activity feed service stopped")
}

// GetFeed returns all unread events for the user in the given trip (events strictly
// after their last-seen cursor) and advances the cursor to now.
func (s *ActivityFeedService) GetFeed(ctx context.Context, userID, tripID string) ([]*realtime.Event, error) {
	cursorMs, err := s.store.GetCursor(ctx, userID, tripID)
	if err != nil {
		return nil, err
	}

	return s.store.GetFeedAfterCursor(ctx, userID, tripID, cursorMs)
}

// MarkRead removes a specific event from the user's feed, permanently dismissing it.
func (s *ActivityFeedService) MarkRead(ctx context.Context, userID, tripID, eventID string) error {
	return s.store.MarkRead(ctx, userID, tripID, eventID)
}

// GetUnreadCount returns the number of events after the user's cursor for the given trip.
func (s *ActivityFeedService) GetUnreadCount(ctx context.Context, userID, tripID string) (int64, error) {
	cursorMs, err := s.store.GetCursor(ctx, userID, tripID)
	if err != nil {
		return 0, err
	}
	return s.store.GetUnreadCount(ctx, userID, tripID, cursorMs)
}
