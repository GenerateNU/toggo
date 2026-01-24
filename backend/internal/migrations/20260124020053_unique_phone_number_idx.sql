-- +goose Up
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_phone_number;
CREATE UNIQUE INDEX idx_users_phone_number ON users (phone_number);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_phone_number;
CREATE INDEX idx_users_phone_number ON users (phone_number);
-- +goose StatementEnd
