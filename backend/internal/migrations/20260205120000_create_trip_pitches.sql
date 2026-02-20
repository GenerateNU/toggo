-- +goose Up
-- +goose StatementBegin
CREATE TABLE trip_pitches (
    id UUID PRIMARY KEY,
    trip_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    audio_s3_key TEXT NOT NULL,
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_pitches_trip_id ON trip_pitches(trip_id);
CREATE INDEX idx_trip_pitches_user_id ON trip_pitches(user_id);
CREATE INDEX idx_trip_pitches_trip_created_id ON trip_pitches(trip_id, created_at DESC, id DESC);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for trip_pitches table
CREATE TRIGGER update_trip_pitches_updated_at BEFORE UPDATE ON trip_pitches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_trip_pitches_updated_at ON trip_pitches;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP INDEX IF EXISTS idx_trip_pitches_trip_created_id;
DROP INDEX IF EXISTS idx_trip_pitches_user_id;
DROP INDEX IF EXISTS idx_trip_pitches_trip_id;
DROP TABLE IF EXISTS trip_pitches;
-- +goose StatementEnd
