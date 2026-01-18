-- +goose Up
CREATE TYPE image_size AS ENUM ('large', 'medium', 'small');

CREATE TABLE images (
    image_id UUID NOT NULL,
    size image_size NOT NULL,
    file_key TEXT NOT NULL,
    PRIMARY KEY (image_id, size)
);

CREATE INDEX idx_images_image_id ON images(image_id);

-- +goose Down
DROP TABLE images;
DROP TYPE image_size;