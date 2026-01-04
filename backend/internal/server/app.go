package server

import (
	"fmt"
	"toggo/internal/config"
	"toggo/internal/errs"
	"toggo/internal/repository"
	"toggo/internal/server/middlewares"
	"toggo/internal/server/routers"
	"toggo/internal/types"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/uptrace/bun"
)

func CreateApp(config *config.Configuration, db *bun.DB) *fiber.App {
	app := fiber.New(fiber.Config{
		ServerHeader: config.App.Name,
		AppName:      fmt.Sprintf("%s API %s", config.App.Name, config.App.Version),
		ErrorHandler: errs.ErrorHandler,
	})

	middlewares.SetUpMiddlewares(app, config)

	repository := repository.NewRepository(db)

	validator := validator.New()

	routeParams := types.RouteParams{
		Validator: validator,
		ServiceParams: &types.ServiceParams{
			Repository: repository,
			Config:     config,
		},
	}

	routers.SetUpRoutes(app, routeParams, middlewares.AuthRequired(config))

	return app
}
