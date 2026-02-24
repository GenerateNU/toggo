-- +goose Up
-- +goose StatementBegin
CREATE TABLE poll_rankings (
    poll_id UUID NOT NULL,
    user_id UUID NOT NULL,
    option_id UUID NOT NULL,
    rank_position INT NOT NULL CHECK (rank_position > 0),
    PRIMARY KEY (poll_id, user_id, option_id),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE
);

CREATE INDEX idx_poll_rankings_poll_user ON poll_rankings(poll_id, user_id);
CREATE INDEX idx_poll_rankings_option_id ON poll_rankings(option_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_poll_rankings_option_id;
DROP INDEX IF EXISTS idx_poll_rankings_poll_user;
DROP TABLE IF EXISTS poll_rankings;
-- +goose StatementEnd