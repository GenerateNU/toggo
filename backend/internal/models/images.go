package models

import (
	"time"

	"github.com/google/uuid"
)

type ImageSize string

const (
	ImageSizeLarge  ImageSize = "large"
	ImageSizeMedium ImageSize = "medium"
	ImageSizeSmall  ImageSize = "small"
)

type UploadStatus string

const (
	UploadStatusPending   UploadStatus = "pending"
	UploadStatusConfirmed UploadStatus = "confirmed"
	UploadStatusFailed    UploadStatus = "failed"
)

type Image struct {
	ImageID     uuid.UUID    `bun:"image_id,pk,type:uuid" json:"image_id"`
	Size        ImageSize    `bun:"size,pk,type:image_size" json:"size"`
	FileKey     string       `bun:"file_key,unique" json:"file_key"`
	Status      UploadStatus `bun:"status,type:upload_status,default:'pending'" json:"status"`
	CreatedAt   time.Time    `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	ConfirmedAt *time.Time   `bun:"confirmed_at" json:"confirmed_at,omitempty"`
}
