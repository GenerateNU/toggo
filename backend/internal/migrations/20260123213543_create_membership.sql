-- +goose Up
-- +goose StatementBegin
CREATE TABLE memberships (
    user_id UUID NOT NULL,
    trip_id UUID NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_admin BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    budget_min INT NOT NULL CHECK (budget_min >= 0),
    budget_max INT NOT NULL CHECK (budget_max >= 0 AND budget_max >= budget_min),
    availability JSONB NOT NULL,
    PRIMARY KEY (user_id, trip_id, version),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Index to efficiently find the latest version for a user-trip pair
CREATE INDEX idx_memberships_user_trip ON memberships(user_id, trip_id, version DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS memberships;
-- +goose StatementEnd
