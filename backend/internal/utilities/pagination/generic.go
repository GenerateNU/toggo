package pagination

import (
	"context"
	"toggo/internal/models"
)

// FileKeyExtractorFunc defines a function type for extracting file keys from database response objects
type FileKeyExtractorFunc[T any] func(item T) *string

// PageResultBuilder defines how to build paginated results
type PageResultBuilder[T any, R any] interface {
	BuildPageResult(items []R, nextCursor *models.TimeUUIDCursor, limit int) (*T, error)
}

// FileServiceInterface minimal interface for batch file operations
type FileServiceInterface interface {
	GetFilesByKeys(ctx context.Context, req models.GetFilesByKeysRequest) (*models.GetFilesByKeysResponse, error)
}

// Generic cursor parsing helper
func ParseCursor(cursorToken string) (*models.TimeUUIDCursor, error) {
	if cursorToken == "" {
		return nil, nil
	}
	return DecodeTimeUUIDCursor(cursorToken)
}

// Generic file URL fetching helper
func FetchFileURLs[T any](
	ctx context.Context,
	fileService FileServiceInterface,
	items []T,
	extractor FileKeyExtractorFunc[T],
	size models.ImageSize,
) map[string]string {
	fileKeys := make([]string, 0, len(items))
	for _, item := range items {
		if key := extractor(item); key != nil && *key != "" {
			fileKeys = append(fileKeys, *key)
		}
	}

	if len(fileKeys) == 0 {
		return nil
	}

	batchResp, err := fileService.GetFilesByKeys(ctx, models.GetFilesByKeysRequest{
		FileKeys: fileKeys,
		Size:     size,
	})
	if err != nil {
		return nil
	}

	fileURLMap := make(map[string]string)
	for _, file := range batchResp.Files {
		fileURLMap[file.FileKey] = file.URL
	}
	return fileURLMap
}

// Generic page result building helper
func BuildPageResult[T any](
	items []T,
	nextCursor *models.TimeUUIDCursor,
	limit int,
) (*struct {
	Items      []T     `json:"items"`
	NextCursor *string `json:"next_cursor,omitempty"`
	Limit      int     `json:"limit"`
}, error) {
	result := &struct {
		Items      []T     `json:"items"`
		NextCursor *string `json:"next_cursor,omitempty"`
		Limit      int     `json:"limit"`
	}{
		Items: items,
		Limit: limit,
	}

	if nextCursor != nil {
		token, err := EncodeTimeUUIDCursor(*nextCursor)
		if err != nil {
			return nil, err
		}
		result.NextCursor = &token
	}

	return result, nil
}
