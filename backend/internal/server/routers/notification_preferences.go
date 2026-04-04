package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func NotificationPreferencesRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	service := services.NewNotificationPreferencesService(routeParams.ServiceParams.Repository)
	controller := controllers.NewNotificationPreferencesController(service, routeParams.Validator)

	// /api/v1/users/me/notification-preferences
	prefsGroup := apiGroup.Group("/users/me/notification-preferences")
	prefsGroup.Get("", controller.GetPreferences)
	prefsGroup.Post("", controller.CreatePreferences)
	prefsGroup.Patch("", controller.UpdatePreferences)
	prefsGroup.Delete("", controller.DeletePreferences)
	prefsGroup.Post("/default", controller.GetOrCreateDefault)

	return prefsGroup
}
