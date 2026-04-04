-- +goose Up
-- +goose StatementBegin
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    upcoming_trip BOOLEAN DEFAULT true,
    voting_reminders BOOLEAN DEFAULT true,
    finalized_decisions BOOLEAN DEFAULT true,
    trip_activity BOOLEAN DEFAULT true,
    deadline_reminders BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS notification_preferences;
-- +goose StatementEnd
