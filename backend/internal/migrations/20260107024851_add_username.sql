-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
DROP COLUMN email;

ALTER TABLE users
ADD COLUMN username VARCHAR(255) NOT NULL UNIQUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users
DROP COLUMN username;

ALTER TABLE users
ADD COLUMN email VARCHAR(255) NOT NULL UNIQUE;
-- +goose StatementEnd
