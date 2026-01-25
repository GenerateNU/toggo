package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func SetUpRoutes(app *fiber.App, routeParams types.RouteParams, middlewares ...fiber.Handler) {
	app.Get("/healthcheck", controllers.HealthcheckHandler(routeParams.ServiceParams.Repository.Health))

	apiGroup := app.Group("/api")
	apiV1Group := apiGroup.Group("/v1", middlewares...)
	UserRoutes(apiV1Group, routeParams)
	NotificationRoutes(apiV1Group, routeParams)

	// 404 handler for routes not matched
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
