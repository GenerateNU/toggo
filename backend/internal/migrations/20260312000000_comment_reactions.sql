-- +goose Up
-- +goose StatementBegin
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_comment_reactions_comment
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_reactions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT comment_reactions_comment_user_emoji_unique
        UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX idx_comment_reactions_comment_id
    ON comment_reactions(comment_id);

CREATE INDEX idx_comment_reactions_comment_id_emoji
    ON comment_reactions(comment_id, emoji);

CREATE INDEX idx_comment_reactions_user_id
    ON comment_reactions(user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_comment_reactions_user_id;
DROP INDEX IF EXISTS idx_comment_reactions_comment_id_emoji;
DROP INDEX IF EXISTS idx_comment_reactions_comment_id;
DROP TABLE IF EXISTS comment_reactions;
-- +goose StatementEnd

