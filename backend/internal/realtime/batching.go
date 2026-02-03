package realtime

import (
	"sync"
	"time"
)

// EventBatcher collects events in 200ms windows and collapses them into snapshots.
type EventBatcher struct {
	hub         *Hub
	buffers     map[string][]Event
	mu          sync.RWMutex
	batchPeriod time.Duration
}

// NewEventBatcher creates a batcher with 200ms batch windows.
func NewEventBatcher(hub *Hub) *EventBatcher {
	return &EventBatcher{
		hub:         hub,
		buffers:     make(map[string][]Event),
		batchPeriod: 200 * time.Millisecond,
	}
}

// Run starts the periodic batch flushing ticker.
func (b *EventBatcher) Run() {
	ticker := time.NewTicker(b.batchPeriod)
	defer ticker.Stop()

	for range ticker.C {
		b.flushAll()
	}
}

// AddEvent adds an event to the batch buffer for the event's trip.
func (b *EventBatcher) AddEvent(event *Event) {
	b.mu.Lock()
	defer b.mu.Unlock()

	tripID := event.TripID
	if b.buffers[tripID] == nil {
		b.buffers[tripID] = make([]Event, 0)
	}
	b.buffers[tripID] = append(b.buffers[tripID], *event)
}

func (b *EventBatcher) flushAll() {
	b.mu.Lock()
	batches := b.buffers
	b.buffers = make(map[string][]Event)
	b.mu.Unlock()

	for tripID, events := range batches {
		if len(events) > 0 {
			snapshot := b.collapseEvents(events)
			b.hub.BroadcastToTrip(tripID, snapshot)
		}
	}
}

func (b *EventBatcher) collapseEvents(events []Event) []Event {
	eventMap := make(map[string]*Event)

	for i := range events {
		event := &events[i]
		key := event.Topic + ":" + event.TripID
		eventMap[key] = event
	}

	collapsed := make([]Event, 0, len(eventMap))
	for _, event := range eventMap {
		collapsed = append(collapsed, *event)
	}

	return collapsed
}
