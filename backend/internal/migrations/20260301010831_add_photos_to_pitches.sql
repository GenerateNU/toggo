-- +goose Up
-- +goose StatementBegin
CREATE TABLE pitch_images (
    pitch_id UUID NOT NULL REFERENCES trip_pitches(id) ON DELETE CASCADE,
    -- image_id references images(image_id) at the application level;
    -- no DB-level FK because images table uses a composite PK (image_id, size)
    image_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (pitch_id, image_id)
);

-- Indexes for efficient reads
CREATE INDEX idx_pitch_images_pitch_id ON pitch_images(pitch_id);
CREATE INDEX idx_pitch_images_image_id ON pitch_images(image_id);

-- Prevent duplicate associations (enforced by composite PK above)

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_pitch_images_image_id;
DROP INDEX IF EXISTS idx_pitch_images_pitch_id;
DROP TABLE IF EXISTS pitch_images;
-- +goose StatementEnd
