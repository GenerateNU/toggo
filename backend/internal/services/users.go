package services

import (
	"context"
	"log"
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
}

var _ UserServiceInterface = (*UserService)(nil)

type UserService struct {
	*repository.Repository
}

func NewUserService(repo *repository.Repository) UserServiceInterface {
	return &UserService{Repository: repo}
}

func (u *UserService) CreateUser(ctx context.Context, userBody models.CreateUserRequest, userID uuid.UUID) (*models.User, error) {
	log.Printf("CreateUser Service: Input phone number: %s", userBody.PhoneNumber)

	phone, err := utilities.NormalizeUSPhone(userBody.PhoneNumber)
	if err != nil {
		log.Printf("CreateUser Service: Phone normalization failed: %v", err)
		return nil, errs.InvalidRequestData(map[string]string{"phone_number": err.Error()})
	}

	log.Printf("CreateUser Service: Normalized phone: %s", phone)

	username := strings.ToLower(strings.TrimSpace(userBody.Username))
	name := userBody.Name

	log.Printf("CreateUser Service: Creating user with username: %s, name: %s, phone: %s", username, name, phone)

	user, err := u.User.Create(ctx, &models.User{
		Name:        name,
		Username:    username,
		PhoneNumber: phone,
		Timezone:    "UTC",
		ID:          userID,
	})

	if err != nil {
		log.Printf("CreateUser Service: Repository create failed: %v", err)
	}

	return user, err
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
