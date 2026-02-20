-- +goose Up
-- +goose StatementBegin
-- Add composite FK to enforce trip_id consistency between activities and activity_categories
ALTER TABLE activity_categories 
ADD CONSTRAINT activity_categories_activity_trip_fk 
FOREIGN KEY (activity_id, trip_id) REFERENCES activities(id, trip_id) ON DELETE CASCADE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE activity_categories DROP CONSTRAINT IF EXISTS activity_categories_activity_trip_fk;
-- +goose StatementEnd