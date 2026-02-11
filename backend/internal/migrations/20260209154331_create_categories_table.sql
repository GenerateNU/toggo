-- +goose Up
-- +goose StatementBegin
CREATE TABLE categories (
    trip_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (trip_id, name),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- No additional indexes needed - PK covers all query patterns
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS categories;
-- +goose StatementEnd