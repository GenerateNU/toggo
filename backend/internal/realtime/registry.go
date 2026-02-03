package realtime

import (
	"errors"
	"sync"
)

var (
	ErrInvalidTopic = errors.New("topic not registered in event registry")
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
	topics := []string{
		"poll.created",
		"poll.updated",
		"poll.deleted",
		"poll.vote_added",
		"poll.vote_removed",
		"trip.created",
		"trip.updated",
		"trip.deleted",
		"membership.added",
		"membership.removed",
		"membership.updated",
		"comment.created",
		"comment.updated",
		"comment.deleted",
		"file.uploaded",
		"file.deleted",
		"notification.sent",
	}

	for _, topic := range topics {
		r.allowedTopics[topic] = true
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
