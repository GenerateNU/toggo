package realtime

import (
	"errors"
	"sync"
)

var (
	ErrInvalidTopic = errors.New("topic not registered in event registry")
)

type EventTopic string

const (
	EventTopicPollCreated          EventTopic = "poll.created"
	EventTopicPollUpdated          EventTopic = "poll.updated"
	EventTopicPollDeleted          EventTopic = "poll.deleted"
	EventTopicPollVoteAdded        EventTopic = "poll.vote_added"
	EventTopicPollVoteRemoved      EventTopic = "poll.vote_removed"
	EventTopicPollRankingSubmitted EventTopic = "poll.ranking_submitted"
	EventTopicTripCreated          EventTopic = "trip.created"
	EventTopicTripUpdated          EventTopic = "trip.updated"
	EventTopicTripDeleted          EventTopic = "trip.deleted"
	EventTopicMembershipAdded      EventTopic = "membership.added"
	EventTopicMembershipRemoved    EventTopic = "membership.removed"
	EventTopicMembershipUpdated    EventTopic = "membership.updated"
	EventTopicCommentCreated       EventTopic = "comment.created"
	EventTopicCommentUpdated       EventTopic = "comment.updated"
	EventTopicCommentDeleted       EventTopic = "comment.deleted"
	EventTopicFileUploaded         EventTopic = "file.uploaded"
	EventTopicFileDeleted          EventTopic = "file.deleted"
	EventTopicNotificationSent     EventTopic = "notification.sent"
)

// TopicRegistry validates event topics against a whitelist of allowed event names.
type TopicRegistry struct {
	allowedTopics map[string]bool
	mu            sync.RWMutex
}

// NewEventRegistry creates a registry with predefined allowed event topics.
func NewEventRegistry() *TopicRegistry {
	registry := &TopicRegistry{
		allowedTopics: make(map[string]bool),
	}

	registry.registerDefaultTopics()
	return registry
}

func (r *TopicRegistry) registerDefaultTopics() {
	topics := []EventTopic{
		EventTopicPollCreated,
		EventTopicPollUpdated,
		EventTopicPollDeleted,
		EventTopicPollVoteAdded,
		EventTopicPollVoteRemoved,
		EventTopicPollRankingSubmitted,
		EventTopicTripCreated,
		EventTopicTripUpdated,
		EventTopicTripDeleted,
		EventTopicMembershipAdded,
		EventTopicMembershipRemoved,
		EventTopicMembershipUpdated,
		EventTopicCommentCreated,
		EventTopicCommentUpdated,
		EventTopicCommentDeleted,
		EventTopicFileUploaded,
		EventTopicFileDeleted,
		EventTopicNotificationSent,
	}

	for _, topic := range topics {
		r.allowedTopics[string(topic)] = true
	}
}

// IsAllowed returns true if the topic is registered in the whitelist.
func (r *TopicRegistry) IsAllowed(topic string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.allowedTopics[topic]
}

// Register adds a new topic to the whitelist.
func (r *TopicRegistry) Register(topic string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.allowedTopics[topic] = true
}

// Unregister removes a topic from the whitelist.
func (r *TopicRegistry) Unregister(topic string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.allowedTopics, topic)
}

// GetAllTopics returns all registered topics.
func (r *TopicRegistry) GetAllTopics() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	topics := make([]string, 0, len(r.allowedTopics))
	for topic := range r.allowedTopics {
		topics = append(topics, topic)
	}
	return topics
}
