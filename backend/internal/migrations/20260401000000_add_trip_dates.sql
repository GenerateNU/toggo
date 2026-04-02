-- +goose Up
ALTER TABLE trips
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

CREATE INDEX idx_trips_dates ON trips(start_date, end_date);

-- +goose Down
DROP INDEX IF EXISTS idx_trips_dates;
ALTER TABLE trips DROP COLUMN IF EXISTS end_date;
ALTER TABLE trips DROP COLUMN IF EXISTS start_date;
