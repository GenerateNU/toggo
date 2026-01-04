package services

import (
	"context"
	errors "toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type UserServiceInterface interface {
	CreateUser(ctx context.Context, userBody models.CreateUserRequest, userID uuid.UUID) (*models.User, error)
	GetUser(ctx context.Context, id uuid.UUID) (*models.User, error)
	UpdateUser(ctx context.Context, id uuid.UUID, userBody models.UpdateUserRequest) (*models.User, error)
	DeleteUser(ctx context.Context, id uuid.UUID) error
}

var _ UserServiceInterface = (*UserService)(nil)

type UserService struct {
	*repository.Repository
}

func NewUserService(repo *repository.Repository) UserServiceInterface {
	return &UserService{Repository: repo}
}

func (u *UserService) CreateUser(ctx context.Context, userBody models.CreateUserRequest, userID uuid.UUID) (*models.User, error) {
	return u.User.Create(ctx, &models.User{
		Name:  userBody.Name,
		Email: userBody.Email,
		ID:    userID,
	})
}

func (u *UserService) GetUser(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user, err := u.User.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.ErrNotFound
	}
	return user, nil
}

func (u *UserService) UpdateUser(ctx context.Context, id uuid.UUID, userBody models.UpdateUserRequest) (*models.User, error) {
	return u.User.Update(ctx, id, &userBody)
}

func (u *UserService) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return u.User.Delete(ctx, id)
}
