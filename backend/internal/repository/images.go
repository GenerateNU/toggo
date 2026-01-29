package repository

import (
	"context"
	"database/sql"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var _ ImageRepository = (*imageRepository)(nil)

type imageRepository struct {
	db *bun.DB
}

// CreatePendingImages creates image records with pending status for all sizes
// Returns the created images or error if creation fails
func (r *imageRepository) CreatePendingImages(ctx context.Context, imageID uuid.UUID, fileKey string, sizes []models.ImageSize) ([]*models.Image, error) {
	images := make([]*models.Image, 0, len(sizes))
	for _, size := range sizes {
		images = append(images, &models.Image{
			ImageID: imageID,
			Size:    size,
			FileKey: buildSizedFileKey(fileKey, size),
			Status:  models.UploadStatusPending,
		})
	}

	_, err := r.db.NewInsert().
		Model(&images).
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return images, nil
}

// ConfirmUpload marks an image as confirmed after successful upload
func (r *imageRepository) ConfirmUpload(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.Image, error) {
	now := time.Now()
	image := &models.Image{}

	_, err := r.db.NewUpdate().
		Model(image).
		Set("status = ?", models.UploadStatusConfirmed).
		Set("confirmed_at = ?", now).
		Where("image_id = ? AND size = ?", imageID, size).
		Where("status = ?", models.UploadStatusPending).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	// Check if the image was actually updated
	err = r.db.NewSelect().
		Model(image).
		Where("image_id = ? AND size = ?", imageID, size).
		Where("status = ?", models.UploadStatusConfirmed).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}

	return image, nil
}

// ConfirmAllUploads marks all sizes of an image as confirmed
func (r *imageRepository) ConfirmAllUploads(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error) {
	now := time.Now()
	images := make([]*models.Image, 0)

	_, err := r.db.NewUpdate().
		Model((*models.Image)(nil)).
		Set("status = ?", models.UploadStatusConfirmed).
		Set("confirmed_at = ?", now).
		Where("image_id = ?", imageID).
		Where("status = ?", models.UploadStatusPending).
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	err = r.db.NewSelect().
		Model(&images).
		Where("image_id = ?", imageID).
		Where("status = ?", models.UploadStatusConfirmed).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	if len(images) == 0 {
		return nil, errs.ErrNotFound
	}
	return images, nil
}

// MarkFailed marks an image upload as failed
func (r *imageRepository) MarkFailed(ctx context.Context, imageID uuid.UUID, size models.ImageSize) error {
	result, err := r.db.NewUpdate().
		Model((*models.Image)(nil)).
		Set("status = ?", models.UploadStatusFailed).
		Where("image_id = ? AND size = ?", imageID, size).
		Exec(ctx)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errs.ErrNotFound
	}
	return nil
}

// FindByID retrieves all size variants of an image
func (r *imageRepository) FindByID(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error) {
	images := make([]*models.Image, 0)

	err := r.db.NewSelect().
		Model(&images).
		Where("image_id = ?", imageID).
		Where("status = ?", models.UploadStatusConfirmed).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	if len(images) == 0 {
		return nil, errs.ErrNotFound
	}

	return images, nil
}

// FindByIDAndSize retrieves a specific size variant of an image
func (r *imageRepository) FindByIDAndSize(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.Image, error) {
	image := &models.Image{}

	err := r.db.NewSelect().
		Model(image).
		Where("image_id = ? AND size = ?", imageID, size).
		Where("status = ?", models.UploadStatusConfirmed).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}

	return image, nil
}

// DeleteByID deletes all size variants of an image
func (r *imageRepository) DeleteByID(ctx context.Context, imageID uuid.UUID) error {
	result, err := r.db.NewDelete().
		Model((*models.Image)(nil)).
		Where("image_id = ?", imageID).
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errs.ErrNotFound
	}

	return nil
}

// CleanupPendingUploads removes pending uploads older than the specified duration
func (r *imageRepository) CleanupPendingUploads(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().Add(-olderThan)

	result, err := r.db.NewDelete().
		Model((*models.Image)(nil)).
		Where("status = ?", models.UploadStatusPending).
		Where("created_at < ?", cutoff).
		Exec(ctx)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

// FindByIDIncludingPending retrieves all size variants including pending ones
func (r *imageRepository) FindByIDIncludingPending(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error) {
	images := make([]*models.Image, 0)

	err := r.db.NewSelect().
		Model(&images).
		Where("image_id = ?", imageID).
		Where("status IN (?)", bun.In([]models.UploadStatus{models.UploadStatusPending, models.UploadStatusConfirmed})).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	if len(images) == 0 {
		return nil, errs.ErrNotFound
	}

	return images, nil
}

// buildSizedFileKey constructs the file key with size prefix
func buildSizedFileKey(fileKey string, size models.ImageSize) string {
	return string(size) + "/" + fileKey
}
