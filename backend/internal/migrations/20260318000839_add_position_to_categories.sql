-- +goose Up
ALTER TABLE categories ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- Assign unique positions per trip before adding the constraint
UPDATE categories c1
SET position = (
    SELECT COUNT(*)
    FROM categories c2
    WHERE c2.trip_id = c1.trip_id
    AND (c2.name < c1.name OR (c2.name = c1.name AND c2.ctid < c1.ctid))
);

ALTER TABLE categories ADD CONSTRAINT categories_trip_id_position_unique UNIQUE (trip_id, position);
DROP TABLE IF EXISTS trip_tabs;

-- +goose Down
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_trip_id_position_unique;
ALTER TABLE categories DROP COLUMN IF EXISTS position;