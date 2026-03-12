-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_time_of_day') THEN
        CREATE TYPE activity_time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'night');
    END IF;
END $$;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS time_of_day activity_time_of_day NULL;

CREATE INDEX IF NOT EXISTS idx_activities_trip_time_of_day ON activities(trip_id, time_of_day);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_activities_trip_time_of_day;

ALTER TABLE activities
    DROP COLUMN IF EXISTS time_of_day;

DROP TYPE IF EXISTS activity_time_of_day;
-- +goose StatementEnd
