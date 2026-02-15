-- +goose Up
-- +goose StatementBegin
CREATE TABLE poll_votes (
	poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
	option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	PRIMARY KEY (poll_id, option_id, user_id)
);

CREATE INDEX idx_poll_votes_option_id ON poll_votes (option_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes (user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_poll_votes_user_id;
DROP INDEX IF EXISTS idx_poll_votes_option_id;

DROP TABLE IF EXISTS poll_votes;
-- +goose StatementEnd