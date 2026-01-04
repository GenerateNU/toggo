package types

import (
	"toggo/internal/config"
	"toggo/internal/repository"

	"github.com/go-playground/validator/v10"
)

type RouteParams struct {
	Validator     *validator.Validate
	ServiceParams *ServiceParams
}

type ServiceParams struct {
	Repository *repository.Repository
	Config     *config.Configuration
}
