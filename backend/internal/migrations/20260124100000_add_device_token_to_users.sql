-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
ADD COLUMN device_token VARCHAR(255),
ADD COLUMN device_token_updated_at TIMESTAMP;

-- Creating index on device_token for fast lookups when sending in bulk
CREATE INDEX idx_users_device_token ON users(device_token)
WHERE device_token IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_device_token;

ALTER TABLE users
DROP COLUMN device_token_updated_at,
DROP COLUMN device_token;
-- +goose StatementEnd
