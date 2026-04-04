-- +goose Up
-- +goose StatementBegin
ALTER TABLE trips ADD COLUMN rank_poll_id UUID REFERENCES polls(id) ON DELETE SET NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE trips DROP COLUMN rank_poll_id;
-- +goose StatementEnd
