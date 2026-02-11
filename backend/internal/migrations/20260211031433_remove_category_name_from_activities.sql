-- +goose Up
-- +goose StatementBegin
ALTER TABLE activities DROP COLUMN IF EXISTS category_name;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE activities ADD COLUMN category_name VARCHAR(255) NULL;
-- +goose StatementEnd