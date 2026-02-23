-- +goose Up
-- +goose StatementBegin

-- GIN index for full-text search on trips.name
CREATE INDEX idx_trips_fts ON trips USING GIN (to_tsvector('english', name));

-- GIN index for full-text search on activities.name
CREATE INDEX idx_activities_fts ON activities USING GIN (to_tsvector('english', name));

-- GIN index for full-text search on users by name and username (used for member search)
CREATE INDEX idx_users_fts ON users USING GIN (to_tsvector('english', name || ' ' || username));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_users_fts;
DROP INDEX IF EXISTS idx_activities_fts;
DROP INDEX IF EXISTS idx_trips_fts;

-- +goose StatementEnd
