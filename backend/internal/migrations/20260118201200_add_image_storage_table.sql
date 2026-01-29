-- +goose Up
-- +goose StatementBegin
CREATE TYPE image_size AS ENUM ('large', 'medium', 'small');

CREATE TABLE images (
    image_id UUID NOT NULL,
    size image_size NOT NULL,
    file_key TEXT NOT NULL UNIQUE,
    PRIMARY KEY (image_id, size)
);


CREATE UNIQUE INDEX idx_images_image_id ON images(image_id) WHERE size = 'small';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE images;
DROP TYPE image_size;
-- +goose StatementEnd