-- +goose Up
-- +goose StatementBegin
CREATE TABLE activity_categories (
    activity_id UUID NOT NULL,
    trip_id UUID NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (activity_id, category_name),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id, category_name) REFERENCES categories(trip_id, name) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_activity_categories_activity_id ON activity_categories(activity_id);
CREATE INDEX idx_activity_categories_trip_id ON activity_categories(trip_id);
CREATE INDEX idx_activity_categories_category_name ON activity_categories(category_name);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS activity_categories;
-- +goose StatementEnd