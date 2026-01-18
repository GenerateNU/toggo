package models

import "github.com/google/uuid"

type ImageSize string

const (
	ImageSizeLarge  ImageSize = "large"
	ImageSizeMedium ImageSize = "medium"
	ImageSizeSmall  ImageSize = "small"
)

type Image struct {
	ImageID uuid.UUID `bun:"image_id,pk,type:uuid" json:"image_id"`
	Size    ImageSize `bun:"size,pk,type:image_size" json:"size"`
	FileKey string    `bun:"file_key,unique" json:"file_key"`
}
