-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
ALTER TABLE trips ADD COLUMN location VARCHAR(255);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
ALTER TABLE trips DROP COLUMN location;
-- +goose StatementEnd
