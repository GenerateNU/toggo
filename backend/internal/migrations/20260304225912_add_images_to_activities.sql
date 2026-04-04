-- +goose Up
-- +goose StatementBegin
CREATE TABLE activity_images (
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    image_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (activity_id, image_id)
);

CREATE INDEX idx_activity_images_activity_id 
    ON activity_images(activity_id);

CREATE INDEX idx_activity_images_image_id 
    ON activity_images(image_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS activity_images;
-- +goose StatementEnd