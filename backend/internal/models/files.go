package models

type PresignedURLRequest struct {
	FileKey string      `json:"fileKey" validate:"required,min=1"`
	Sizes   []ImageSize `json:"sizes" validate:"required,min=1,dive,image_size"`
}

type BulkPresignedURLRequest struct {
	Files []PresignedURLRequest `json:"files" validate:"required,min=1,dive"`
}

type PresignedURLResponse struct {
	Size ImageSize `json:"size"`
	URL  string    `json:"url"`
}

type FilePresignedURLResponse struct {
	FileKey string                 `json:"fileKey"`
	URLs    []PresignedURLResponse `json:"urls"`
}

type BulkPresignedURLResponse struct {
	Files []FilePresignedURLResponse `json:"files"`
}

type S3HealthCheckResponse struct {
	Status     string `json:"status"`
	BucketName string `json:"bucketName"`
	Region     string `json:"region"`
}
