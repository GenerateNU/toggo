-- +goose Up
-- +goose StatementBegin
CREATE TABLE poll_categories (
    poll_id UUID NOT NULL,
    trip_id UUID NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (poll_id, category_name),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id, category_name) REFERENCES categories(trip_id, name) ON DELETE CASCADE
);

ALTER TABLE polls ADD COLUMN IF NOT EXISTS notify BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes for common queries
CREATE INDEX idx_poll_categories_poll_id ON poll_categories(poll_id);
CREATE INDEX idx_poll_categories_trip_id ON poll_categories(trip_id);
CREATE INDEX idx_poll_categories_category_name ON poll_categories(category_name);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop indexes first
DROP INDEX IF EXISTS idx_poll_categories_poll_id;
DROP INDEX IF EXISTS idx_poll_categories_trip_id;
DROP INDEX IF EXISTS idx_poll_categories_category_name;

-- Drop table
DROP TABLE IF EXISTS poll_categories;

-- Remove added columns from polls table
ALTER TABLE polls DROP COLUMN IF EXISTS notify;
ALTER TABLE polls DROP COLUMN IF EXISTS is_anonymous;
-- +goose StatementEnd