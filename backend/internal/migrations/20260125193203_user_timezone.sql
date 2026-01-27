-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN timezone VARCHAR(255) DEFAULT 'UTC';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN timezone;
-- +goose StatementEnd
