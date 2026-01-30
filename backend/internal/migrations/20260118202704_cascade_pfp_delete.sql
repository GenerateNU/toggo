-- +goose Up
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN profile_picture;

ALTER TABLE users 
ADD COLUMN profile_picture UUID;

CREATE INDEX idx_users_profile_picture ON users(profile_picture);

CREATE OR REPLACE FUNCTION delete_user_images()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.profile_picture IS NOT NULL THEN
        DELETE FROM images WHERE image_id = OLD.profile_picture;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_user_images
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION delete_user_images();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER trigger_delete_user_images ON users;
DROP FUNCTION delete_user_images;
DROP INDEX idx_users_profile_picture;
ALTER TABLE users DROP COLUMN profile_picture;
ALTER TABLE users ADD COLUMN profile_picture TEXT;
-- +goose StatementEnd