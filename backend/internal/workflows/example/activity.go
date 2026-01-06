package example

import (
	"context"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type UserActivities struct {
	Repository *repository.Repository
}

func (a *UserActivities) CreateUser(
	ctx context.Context,
	user *models.User,
) (*models.User, error) {
	return a.Repository.User.Create(ctx, user)
}

func (a *UserActivities) FindUser(
	ctx context.Context,
	id uuid.UUID,
) (*models.User, error) {
	return a.Repository.User.Find(ctx, id)
}

func (a *UserActivities) UpdateUser(
	ctx context.Context,
	id uuid.UUID,
	req *models.UpdateUserRequest,
) (*models.User, error) {
	return a.Repository.User.Update(ctx, id, req)
}

func (a *UserActivities) DeleteUser(
	ctx context.Context,
	id uuid.UUID,
) error {
	return a.Repository.User.Delete(ctx, id)
}
