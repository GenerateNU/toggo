-- +goose Up
-- +goose StatementBegin
ALTER TABLE trips ADD COLUMN cover_image UUID;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE trips DROP COLUMN cover_image;
-- +goose StatementEnd
