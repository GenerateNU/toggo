package types //nolint:revive

import (
	"net/http"
	"toggo/internal/config"
	"toggo/internal/realtime"
	"toggo/internal/repository"
	"toggo/internal/services"

	"github.com/go-playground/validator/v10"
	"go.temporal.io/sdk/client"
)

type RouteParams struct {
	Validator     *validator.Validate
	ServiceParams *ServiceParams
}

type ServiceParams struct {
	Repository          *repository.Repository
	Config              *config.Configuration
	EventPublisher      realtime.EventPublisher
	FileService         services.FileServiceInterface
	PollService         services.PollServiceInterface
	ActivityFeedService services.ActivityFeedServiceInterface
	HTTPClient          *http.Client
	TemporalClient      client.Client
}
