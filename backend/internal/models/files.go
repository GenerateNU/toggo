package models

import "github.com/google/uuid"

// ---- Upload Request/Response (PUT presigned URLs) ----

type UploadURLRequest struct {
	FileKey     string      `json:"fileKey" validate:"required,min=1"`
	Sizes       []ImageSize `json:"sizes" validate:"required,min=1,dive,image_size"`
	ContentType string      `json:"contentType" validate:"required,min=1"`
}

type UploadURLResponse struct {
	ImageID    uuid.UUID        `json:"imageId"`
	FileKey    string           `json:"fileKey"`
	UploadURLs []SizedUploadURL `json:"uploadUrls"`
	ExpiresAt  string           `json:"expiresAt"`
}

type SizedUploadURL struct {
	Size ImageSize `json:"size"`
	URL  string    `json:"url"`
}

// ---- Confirm Upload Request/Response ----

type ConfirmUploadRequest struct {
	ImageID uuid.UUID  `json:"imageId" validate:"required"`
	Size    *ImageSize `json:"size,omitempty"` // Optional: if nil, confirm all sizes
}

type ConfirmUploadResponse struct {
	ImageID   uuid.UUID `json:"imageId"`
	Status    string    `json:"status"`
	Confirmed int       `json:"confirmed"`
}

// ---- Get File Response ----

type GetFileResponse struct {
	ImageID     uuid.UUID `json:"imageId"`
	Size        ImageSize `json:"size"`
	URL         string    `json:"url"`
	ContentType string    `json:"contentType,omitempty"`
}

type GetFileAllSizesResponse struct {
	ImageID uuid.UUID         `json:"imageId"`
	Files   []GetFileResponse `json:"files"`
}

// ---- S3 Health Check ----

type S3HealthCheckResponse struct {
	Status     string `json:"status"`
	BucketName string `json:"bucketName"`
	Region     string `json:"region"`
}
