-- +goose Up
-- +goose StatementBegin
ALTER TABLE trips ADD COLUMN location VARCHAR(255);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE trips DROP COLUMN location;
-- +goose StatementEnd
