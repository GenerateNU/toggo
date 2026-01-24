package services

import (
	"context"
	"strings"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities"

	"github.com/google/uuid"
)

type UserServiceInterface interface {
	CreateUser(ctx context.Context, userBody models.CreateUserRequest, userID uuid.UUID) (*models.User, error)
	GetUser(ctx context.Context, id uuid.UUID) (*models.User, error)
	UpdateUser(ctx context.Context, id uuid.UUID, userBody models.UpdateUserRequest) (*models.User, error)
	DeleteUser(ctx context.Context, id uuid.UUID) error
	UpdateDeviceToken(ctx context.Context, id uuid.UUID, deviceToken string) (*models.User, error)
}

var _ UserServiceInterface = (*UserService)(nil)

type UserService struct {
	*repository.Repository
}

func NewUserService(repo *repository.Repository) UserServiceInterface {
	return &UserService{Repository: repo}
}

func (u *UserService) CreateUser(ctx context.Context, userBody models.CreateUserRequest, userID uuid.UUID) (*models.User, error) {
	phone, err := utilities.NormalizeUSPhone(userBody.PhoneNumber)
	if err != nil {
		return nil, errs.InvalidRequestData(map[string]string{"phone_number": err.Error()})
	}

	username := strings.ToLower(strings.TrimSpace(userBody.Username))
	name := userBody.Name

	return u.User.Create(ctx, &models.User{
		Name:        name,
		Username:    username,
		PhoneNumber: phone,
		ID:          userID,
	})
}

func (u *UserService) GetUser(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user, err := u.User.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errs.ErrNotFound
	}
	return user, nil
}

func (u *UserService) UpdateUser(ctx context.Context, id uuid.UUID, userBody models.UpdateUserRequest) (*models.User, error) {
	if userBody.PhoneNumber != nil {
		normalized, err := utilities.NormalizeUSPhone(*userBody.PhoneNumber)
		if err != nil {
			return nil, errs.InvalidRequestData(map[string]string{"phone_number": err.Error()})
		}
		userBody.PhoneNumber = &normalized
	}

	if userBody.Username != nil {
		normalized := strings.ToLower(strings.TrimSpace(*userBody.Username))
		userBody.Username = &normalized
	}

	return u.User.Update(ctx, id, &userBody)
}

func (u *UserService) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return u.User.Delete(ctx, id)
}

func (u *UserService) UpdateDeviceToken(ctx context.Context, id uuid.UUID, deviceToken string) (*models.User, error) {
	deviceToken = strings.TrimSpace(deviceToken)
	return u.User.UpdateDeviceToken(ctx, id, deviceToken)
}
