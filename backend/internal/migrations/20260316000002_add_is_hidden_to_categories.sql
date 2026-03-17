-- +goose Up
-- +goose StatementBegin
ALTER TABLE categories
    ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE categories
    DROP COLUMN IF EXISTS is_hidden;
-- +goose StatementEnd
