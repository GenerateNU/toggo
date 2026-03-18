package server

import (
	"fmt"
	"toggo/internal/config"
	"toggo/internal/errs"
	"toggo/internal/realtime"
	"toggo/internal/repository"
	"toggo/internal/server/middlewares"
	"toggo/internal/server/routers"
	"toggo/internal/services"
	"toggo/internal/types"
	"toggo/internal/validators"

	"github.com/gofiber/fiber/v2"
	"github.com/uptrace/bun"
)

func CreateApp(config *config.Configuration, db *bun.DB, publisher realtime.EventPublisher, wsHandler *realtime.WSHandler) *fiber.App {
	app := fiber.New(fiber.Config{
		ServerHeader: config.App.Name,
		AppName:      fmt.Sprintf("%s API %s", config.App.Name, config.App.Version),
		ErrorHandler: errs.ErrorHandler,
	})

	middlewares.SetUpMiddlewares(app, config)

	// Register WebSocket route before other routes
	if wsHandler != nil {
		app.Use("/ws", wsHandler.Middleware())
		app.Get("/ws", wsHandler.Handler())
	}

	repository := repository.NewRepository(db)

	validator := validators.NewValidator()

	awsCfg := &config.AWS
	fileService := services.NewFileService(services.FileServiceConfig{
		PresignClient: awsCfg.PresignClient,
		S3Client:      awsCfg.S3Client,
		ImageRepo:     repository.Image,
		BucketName:    awsCfg.BucketName,
		Region:        awsCfg.Region,
	})

	routeParams := types.RouteParams{
		Validator: validator,
		ServiceParams: &types.ServiceParams{
			Repository:     repository,
			Config:         config,
			EventPublisher: publisher,
			FileService:    fileService,
			PollService:    services.NewPollService(repository, publisher),
			HTTPClient:     services.DefaultHTTPClient(),
		},
	}

	routers.SetUpRoutes(app, routeParams, middlewares.AuthRequired(config))

	return app
}
