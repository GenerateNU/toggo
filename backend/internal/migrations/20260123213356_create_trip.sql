-- +goose Up
-- +goose StatementBegin
CREATE TABLE trips (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    budget_min INTEGER NOT NULL DEFAULT 0 CHECK (budget_min >= 0),
    budget_max INTEGER NOT NULL DEFAULT 0 CHECK (budget_max >= 0 AND budget_max >= budget_min),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create function to auto-update updated_at (if not already created)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for trips table
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
DROP TABLE IF EXISTS trips; 
-- +goose StatementEnd