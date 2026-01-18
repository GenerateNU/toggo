-- +goose Up
ALTER TABLE users ADD COLUMN profile_picture TEXT;

-- +goose Down
ALTER TABLE users DROP COLUMN profile_picture;