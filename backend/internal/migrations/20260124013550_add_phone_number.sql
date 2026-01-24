-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
ADD COLUMN phone_number VARCHAR(32) NOT NULL;

CREATE INDEX idx_users_phone_number ON users (phone_number);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_phone_number;

ALTER TABLE users
DROP COLUMN phone_number;
-- +goose StatementEnd
