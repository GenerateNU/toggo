-- +goose Up
-- +goose StatementBegin
CREATE TYPE upload_status AS ENUM ('pending', 'confirmed', 'failed');

ALTER TABLE images
    ADD COLUMN status upload_status NOT NULL DEFAULT 'pending',
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_created_at ON images(created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_images_created_at;
DROP INDEX IF EXISTS idx_images_status;

ALTER TABLE images
    DROP COLUMN IF EXISTS confirmed_at,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS status;

DROP TYPE IF EXISTS upload_status;
-- +goose StatementEnd
