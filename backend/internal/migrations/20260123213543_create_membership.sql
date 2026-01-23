-- +goose Up
-- +goose StatementBegin
CREATE TABLE memberships (
    user_id UUID NOT NULL,
    trip_id UUID NOT NULL,
    is_admin BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    budget_min INTEGER NOT NULL DEFAULT 0 CHECK (budget_min >= 0),
    budget_max INTEGER NOT NULL DEFAULT 0 CHECK (budget_max >= 0 AND budget_max >= budget_min),
    availability JSONB NOT NULL,
    PRIMARY KEY (user_id, trip_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS memberships;
-- +goose StatementEnd
