-- +goose Up
-- +goose StatementBegin
-- Add unique constraint on (id, trip_id) to support composite FK from activity_categories
ALTER TABLE activities ADD CONSTRAINT activities_id_trip_id_unique UNIQUE (id, trip_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_id_trip_id_unique;
-- +goose StatementEnd