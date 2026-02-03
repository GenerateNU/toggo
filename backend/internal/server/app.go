package server

import (
	"fmt"
	"toggo/internal/config"
	"toggo/internal/errs"
	"toggo/internal/realtime"
	"toggo/internal/repository"
	"toggo/internal/server/middlewares"
	"toggo/internal/server/routers"
	"toggo/internal/types"
	"toggo/internal/validators"

	"github.com/gofiber/fiber/v2"
	"github.com/uptrace/bun"
)

func CreateApp(config *config.Configuration, db *bun.DB, publisher realtime.EventPublisher, wsHandler *realtime.FiberWSHandler) *fiber.App {
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

	routeParams := types.RouteParams{
		Validator: validator,
		ServiceParams: &types.ServiceParams{
			Repository:     repository,
			Config:         config,
			EventPublisher: publisher,
		},
	}

	routers.SetUpRoutes(app, routeParams, middlewares.AuthRequired(config))

	return app
}
