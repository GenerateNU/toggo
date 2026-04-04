-- +goose Up
-- +goose StatementBegin
ALTER TABLE trips ADD COLUMN rank_poll_id UUID REFERENCES polls(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trips_rank_poll_id ON trips(rank_poll_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_trips_rank_poll_id;
ALTER TABLE trips DROP COLUMN rank_poll_id;
-- +goose StatementEnd
