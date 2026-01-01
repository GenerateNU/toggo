package server

import (
	"fmt"
	"toggo/internal/config"
	"toggo/internal/errs"
	"toggo/internal/server/middlewares"
	"toggo/internal/server/routers"

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

	routers.SetUpRoutes(app, config, db, middlewares.AuthRequired(config))

	return app
}
