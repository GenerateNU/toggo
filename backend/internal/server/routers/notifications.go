package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func NotificationRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	notificationController := controllers.NewNotificationController(
		routeParams.ServiceParams.NotificationService,
		routeParams.Validator,
	)

	notificationGroup := apiGroup.Group("/notifications")
	notificationGroup.Post("/send", notificationController.SendNotification)
	notificationGroup.Post("/send-bulk", notificationController.SendBulkNotification)

	return notificationGroup
}
