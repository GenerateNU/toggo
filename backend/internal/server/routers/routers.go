package routers

import (
	"toggo/internal/config"
	"toggo/internal/controllers"

	"github.com/MarceloPetrucio/go-scalar-api-reference"
	"github.com/gofiber/fiber/v2"
	"github.com/uptrace/bun"
)

func SetUpRoutes(app *fiber.App, cfg *config.Configuration, db *bun.DB, middlewares ...fiber.Handler) {
	app.Get("/healthcheck", controllers.HealthcheckHandler)
	app.Get("/", func(c *fiber.Ctx) error {
		htmlContent, err := scalar.ApiReferenceHTML(&scalar.Options{
			SpecURL: "./openapi.yaml",
			CustomOptions: scalar.CustomOptions{
				PageTitle: "Toggo API",
			},
			DarkMode: true,
		})

		if err != nil {
			return err
		}
		c.Type("html")
		return c.SendString(htmlContent)
	})
	apiGroup := app.Group("/api")

	// TODO: more routes will be added here
	_ = apiGroup.Group("/v1", middlewares...)

	// 404 handler
	setUpNotFoundHandler(app)
}

func setUpNotFoundHandler(app *fiber.App) {
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Route not found",
			"path":  c.Path(),
		})
	})
}
