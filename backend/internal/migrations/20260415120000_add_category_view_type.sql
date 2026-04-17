-- +goose Up
-- +goose StatementBegin
ALTER TABLE categories
ADD COLUMN view_type VARCHAR(32) NOT NULL DEFAULT 'activity';

COMMENT ON COLUMN categories.view_type IS 'activity = list-style tab; moodboard = grid-style tab (user-created tabs only)';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE categories DROP COLUMN IF EXISTS view_type;
-- +goose StatementEnd
