-- +goose Up
-- +goose StatementBegin
ALTER TABLE trips
    ADD COLUMN cover_image UUID;

-- Create index on cover_image for efficient LEFT JOIN operations
CREATE INDEX idx_trips_cover_image ON trips(cover_image);

-- Create trigger to cascade delete images when trip is deleted
CREATE OR REPLACE FUNCTION delete_trip_images()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.cover_image IS NOT NULL THEN
        DELETE FROM images WHERE image_id = OLD.cover_image;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_trip_images
BEFORE DELETE ON trips
FOR EACH ROW
EXECUTE FUNCTION delete_trip_images();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS trigger_delete_trip_images ON trips;
DROP FUNCTION IF EXISTS delete_trip_images;
DROP INDEX IF EXISTS idx_trips_cover_image;
ALTER TABLE trips DROP COLUMN IF EXISTS cover_image;
-- +goose StatementEnd
