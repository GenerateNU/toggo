package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

const activityEventTTL = 30 * 24 * time.Hour

func activityUserTripKey(userID, tripID string) string {
	return fmt.Sprintf("activity:%s:%s", userID, tripID)
}

func activityEventKey(eventID string) string {
	return fmt.Sprintf("activity:event:%s", eventID)
}

func feedCursorKey(userID string) string {
	return fmt.Sprintf("user:feed_cursor:%s", userID)
}

// ActivityFeedStore handles Redis read/write operations for the activity feed.
type ActivityFeedStore struct {
	client *redis.Client
}

func NewActivityFeedStore(client *redis.Client) *ActivityFeedStore {
	return &ActivityFeedStore{client: client}
}

// FanOutEvent writes an event to each recipient's sorted set and stores the shared
// event payload once by ID. Recipients are pre-filtered (actor excluded by caller).
func (s *ActivityFeedStore) FanOutEvent(ctx context.Context, event *Event, recipientIDs []string) error {
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	if err := s.client.Set(ctx, activityEventKey(event.ID), eventJSON, activityEventTTL).Err(); err != nil {
		return fmt.Errorf("failed to store event payload: %w", err)
	}

	score := float64(event.Timestamp.UnixMilli())
	for _, recipientID := range recipientIDs {
		key := activityUserTripKey(recipientID, event.TripID)
		if err := s.client.ZAdd(ctx, key, redis.Z{Score: score, Member: event.ID}).Err(); err != nil {
			return fmt.Errorf("failed to add event to feed for user %s: %w", recipientID, err)
		}
		if err := s.client.Expire(ctx, key, activityEventTTL).Err(); err != nil {
			log.Printf("activity feed: failed to set TTL on feed key for user %s: %v", recipientID, err)
		}
	}

	return nil
}

// GetFeedAfterCursor returns events in the user's trip feed with a timestamp strictly
// after cursorMs. Expired event payloads are cleaned up from the sorted set on the fly.
func (s *ActivityFeedStore) GetFeedAfterCursor(ctx context.Context, userID, tripID string, cursorMs int64) ([]*Event, error) {
	key := activityUserTripKey(userID, tripID)

	eventIDs, err := s.client.ZRangeByScore(ctx, key, &redis.ZRangeBy{
		Min: fmt.Sprintf("(%d", cursorMs), // exclusive lower bound
		Max: "+inf",
	}).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to query feed: %w", err)
	}

	if len(eventIDs) == 0 {
		return []*Event{}, nil
	}

	eventKeys := make([]string, len(eventIDs))
	for i, id := range eventIDs {
		eventKeys[i] = activityEventKey(id)
	}

	vals, err := s.client.MGet(ctx, eventKeys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch event payloads: %w", err)
	}

	events := make([]*Event, 0, len(vals))
	for i, val := range vals {
		if val == nil {
			// Payload expired; remove the stale reference from the sorted set.
			s.client.ZRem(ctx, key, eventIDs[i])
			continue
		}
		var event Event
		if err := json.Unmarshal([]byte(val.(string)), &event); err != nil {
			log.Printf("activity feed: failed to unmarshal event %s: %v", eventIDs[i], err)
			continue
		}
		events = append(events, &event)
	}

	return events, nil
}

// MarkRead removes a specific event from the user's feed for the given trip.
func (s *ActivityFeedStore) MarkRead(ctx context.Context, userID, tripID, eventID string) error {
	return s.client.ZRem(ctx, activityUserTripKey(userID, tripID), eventID).Err()
}

// GetUnreadCount returns the number of events after the cursor in the user's feed.
func (s *ActivityFeedStore) GetUnreadCount(ctx context.Context, userID, tripID string, cursorMs int64) (int64, error) {
	return s.client.ZCount(
		ctx,
		activityUserTripKey(userID, tripID),
		fmt.Sprintf("(%d", cursorMs),
		"+inf",
	).Result()
}

// GetCursor returns the user's last-seen timestamp (unix ms) for a given trip.
// Returns 0 if no cursor has been set yet.
func (s *ActivityFeedStore) GetCursor(ctx context.Context, userID, tripID string) (int64, error) {
	val, err := s.client.HGet(ctx, feedCursorKey(userID), tripID).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

// SetCursor advances the user's last-seen timestamp for a given trip.
func (s *ActivityFeedStore) SetCursor(ctx context.Context, userID, tripID string, timestampMs int64) error {
	return s.client.HSet(ctx, feedCursorKey(userID), tripID, timestampMs).Err()
}
