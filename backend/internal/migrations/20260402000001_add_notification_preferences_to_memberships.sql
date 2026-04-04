-- +goose Up
-- +goose StatementBegin
ALTER TABLE memberships
    ADD COLUMN notify_new_pitches  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notify_new_polls    BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notify_new_comments BOOLEAN NOT NULL DEFAULT TRUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE memberships
    DROP COLUMN notify_new_pitches,
    DROP COLUMN notify_new_polls,
    DROP COLUMN notify_new_comments;
-- +goose StatementEnd
