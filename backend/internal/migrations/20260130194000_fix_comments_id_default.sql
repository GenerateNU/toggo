-- +goose Up
-- +goose StatementBegin
ALTER TABLE comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE comments ALTER COLUMN id DROP DEFAULT;
-- +goose StatementEnd
