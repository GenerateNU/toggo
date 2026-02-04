package models

import "github.com/google/uuid"

// ---- Upload Request/Response (PUT presigned URLs) ----

type UploadURLRequest struct {
	FileKey     string      `json:"fileKey" validate:"required,min=1"`
	Sizes       []ImageSize `json:"sizes" validate:"required,min=1,max=3,dive,image_size"`
	ContentType string      `json:"contentType" validate:"required,min=1"`
}

type UploadURLResponse struct {
	ImageID    uuid.UUID        `json:"imageId"`
	FileKey    string           `json:"fileKey"`
	UploadURLs []SizedUploadURL `json:"uploadUrls" maxItems:"3"`
	ExpiresAt  string           `json:"expiresAt"`
}

type SizedUploadURL struct {
	Size ImageSize `json:"size"`
	URL  string    `json:"url"`
}

// ---- Confirm Upload Request/Response ----

type ConfirmUploadRequest struct {
	ImageID uuid.UUID  `json:"imageId" validate:"required"`
	Size    *ImageSize `json:"size,omitempty" validate:"omitempty,image_size"` // Optional: if nil, confirm all sizes
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
	Files   []GetFileResponse `json:"files" maxItems:"3"`
}

// ---- Batch File Operations ----

type GetFilesByKeysRequest struct {
	FileKeys []string  `json:"fileKeys" validate:"required,min=1"`
	Size     ImageSize `json:"size" validate:"required,image_size"`
}

type FileKeyResponse struct {
	FileKey string `json:"fileKey"`
	URL     string `json:"url"`
}

type GetFilesByKeysResponse struct {
	Files []FileKeyResponse `json:"files"`
}

// ---- S3 Health Check ----

type S3HealthCheckResponse struct {
	Status     string `json:"status"`
	BucketName string `json:"bucketName"`
	Region     string `json:"region"`
	// Error contains the underlying error message when status is "unhealthy"
	Error string `json:"error,omitempty"`
}
