-- +goose Up
-- +goose StatementBegin
ALTER TABLE categories ADD COLUMN label VARCHAR(255) NOT NULL DEFAULT '';
UPDATE categories SET label = name;
ALTER TABLE categories ALTER COLUMN label DROP DEFAULT;
ALTER TABLE categories ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE categories DROP COLUMN IF EXISTS label;
ALTER TABLE categories DROP COLUMN IF EXISTS is_default;
-- +goose StatementEnd