-- +goose Up
-- +goose StatementBegin
ALTER TABLE trips ADD COLUMN pitch_deadline TIMESTAMP WITH TIME ZONE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE trips DROP COLUMN pitch_deadline;
-- +goose StatementEnd