-- +goose Up
ALTER TABLE trips
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

-- +goose Down
ALTER TABLE trips DROP COLUMN IF EXISTS end_date;
ALTER TABLE trips DROP COLUMN IF EXISTS start_date;
