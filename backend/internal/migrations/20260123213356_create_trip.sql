-- +goose Up
-- +goose StatementBegin
CREATE TABLE trips (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    budget_min INTEGER NOT NULL DEFAULT 0 CHECK (budget_min >= 0),
    budget_max INTEGER NOT NULL DEFAULT 0 CHECK (budget_max >= 0 AND budget_max >= budget_min),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS trips; 
-- +goose StatementEnd
