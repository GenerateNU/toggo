package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func SetUpRoutes(app *fiber.App, routeParams types.RouteParams, middlewares ...fiber.Handler) {
	app.Get("/healthcheck", controllers.HealthcheckHandler(routeParams.ServiceParams.Repository.Health))

	apiGroup := app.Group("/api")

	// uncomment this until login/jwt is set up properly
	apiV0Group := apiGroup.Group("/v0")
	FileRoutes(apiV0Group, routeParams)
	// ^^^ is to skip auth for now, comment out later

	apiV1Group := apiGroup.Group("/v1", middlewares...)
	UserRoutes(apiV1Group, routeParams)
	NotificationRoutes(apiV1Group, routeParams)
	FileRoutes(apiV1Group, routeParams)
	CommentRoutes(apiV1Group, routeParams)

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
