-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
  ADD COLUMN apple_maps_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN google_maps_enabled BOOLEAN NOT NULL DEFAULT TRUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users
  DROP COLUMN apple_maps_enabled,
  DROP COLUMN google_maps_enabled;
-- +goose StatementEnd
