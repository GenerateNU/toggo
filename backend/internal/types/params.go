package types //nolint:revive

import (
	"toggo/internal/config"
	"toggo/internal/realtime"
	"toggo/internal/repository"
	"toggo/internal/services"

	"github.com/go-playground/validator/v10"
)

type RouteParams struct {
	Validator     *validator.Validate
	ServiceParams *ServiceParams
}

type ServiceParams struct {
	Repository     *repository.Repository
	Config         *config.Configuration
	EventPublisher realtime.EventPublisher
	FileService    services.FileServiceInterface
}
