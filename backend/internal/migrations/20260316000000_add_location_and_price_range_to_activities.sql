-- +goose Up
-- +goose StatementBegin
ALTER TABLE activities
    ADD COLUMN location_name    TEXT             NULL,
    ADD COLUMN location_lat     DOUBLE PRECISION NULL,
    ADD COLUMN location_lng     DOUBLE PRECISION NULL,
    ADD COLUMN estimated_price  NUMERIC(12, 2)   NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE activities
    DROP COLUMN IF EXISTS location_name,
    DROP COLUMN IF EXISTS location_lat,
    DROP COLUMN IF EXISTS location_lng,
    DROP COLUMN IF EXISTS estimated_price;
-- +goose StatementEnd
