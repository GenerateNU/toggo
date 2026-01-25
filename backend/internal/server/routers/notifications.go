package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func NotificationRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	expoClient := services.NewExpoClient("")

	notificationService := services.NewNotificationService(
		routeParams.ServiceParams.Repository.User,
		expoClient,
	)

	notificationController := controllers.NewNotificationController(
		notificationService,
		routeParams.Validator,
	)

	notificationGroup := apiGroup.Group("/notifications")
	notificationGroup.Post("/send", notificationController.SendNotification)
	notificationGroup.Post("/send-bulk", notificationController.SendBulkNotification)

	return notificationGroup
}
