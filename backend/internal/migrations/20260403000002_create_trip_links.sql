-- +goose Up
-- +goose StatementBegin
CREATE TABLE pitch_links (
    id UUID PRIMARY KEY,
    pitch_id UUID NOT NULL REFERENCES trip_pitches(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_pitch_links_pitch_id ON pitch_links(pitch_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_pitch_links_pitch_id;
DROP TABLE pitch_links;
-- +goose StatementEnd