-- +goose Up
-- +goose StatementBegin
ALTER TABLE trips
    ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE trips
    DROP COLUMN IF EXISTS currency;
-- +goose StatementEnd
