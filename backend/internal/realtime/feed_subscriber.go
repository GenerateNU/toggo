package realtime

import (
	"context"
	"encoding/json"
	"log"
	"toggo/internal/repository"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// feedworthyTopics is the set of event topics that generate activity feed entries.
// Only actions by other members that are meaningful to display in a trip feed are included.
var feedworthyTopics = map[EventTopic]bool{
	EventTopicActivityCreated: true,
	EventTopicCommentCreated:  true,
	EventTopicPollCreated:     true,
	EventTopicPollVoteAdded:   true,
	EventTopicMembershipAdded: true,
	EventTopicTripUpdated:     true,
	EventTopicCategoryCreated: true,
}

// ActivityFeedSubscriber listens to the Redis trip pub/sub channel and fans out
// feedworthy events to each trip member's personal activity feed sorted set.
type ActivityFeedSubscriber struct {
	store          *ActivityFeedStore
	membershipRepo repository.MembershipRepository
	redisClient    *redis.Client
}

func NewActivityFeedSubscriber(
	store *ActivityFeedStore,
	membershipRepo repository.MembershipRepository,
	redisClient *redis.Client,
) *ActivityFeedSubscriber {
	return &ActivityFeedSubscriber{
		store:          store,
		membershipRepo: membershipRepo,
		redisClient:    redisClient,
	}
}

func (s *ActivityFeedSubscriber) Start(ctx context.Context) {
	pubsub := s.redisClient.PSubscribe(ctx, "trip:*")
	defer func() {
		if err := pubsub.Close(); err != nil {
			log.Printf("activity feed subscriber: error closing pubsub: %v", err)
		}
	}()

	log.Println("Activity feed subscriber started")

	ch := pubsub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				log.Println("Activity feed subscriber: channel closed")
				return
			}
			if msg == nil {
				continue
			}
			var event Event
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				log.Printf("activity feed subscriber: failed to unmarshal event: %v", err)
				continue
			}
			s.handleEvent(ctx, &event)
		case <-ctx.Done():
			log.Println("Activity feed subscriber stopped")
			return
		}
	}
}

func (s *ActivityFeedSubscriber) handleEvent(ctx context.Context, event *Event) {
	if !feedworthyTopics[EventTopic(event.Topic)] {
		return
	}

	tripID, err := uuid.Parse(event.TripID)
	if err != nil {
		log.Printf("activity feed subscriber: invalid trip ID %s: %v", event.TripID, err)
		return
	}

	members, err := s.membershipRepo.FindByTripID(ctx, tripID)
	if err != nil {
		log.Printf("activity feed subscriber: failed to get members for trip %s: %v", event.TripID, err)
		return
	}

	recipientIDs := make([]string, 0, len(members))
	for _, m := range members {
		if m.UserID.String() != event.ActorID {
			recipientIDs = append(recipientIDs, m.UserID.String())
		}
	}

	if len(recipientIDs) == 0 {
		return
	}

	if err := s.store.FanOutEvent(ctx, event, recipientIDs); err != nil {
		log.Printf("activity feed subscriber: failed to fan out event %s: %v", event.ID, err)
	}
}
