-- +goose Up
-- +goose StatementBegin
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL,
    proposed_by UUID NULL,  -- Changed to NULL
    name VARCHAR(255) NOT NULL,
    thumbnail_url TEXT NULL,
    media_url TEXT NULL,
    description TEXT NULL,
    dates JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (proposed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX idx_activities_trip_id ON activities(trip_id);
CREATE INDEX idx_activities_proposed_by ON activities(proposed_by);
CREATE INDEX idx_activities_created_at ON activities(created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS activities;
-- +goose StatementEnd