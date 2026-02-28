package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func ExpoWebhooks(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	slackNotifier := services.NewSlackNotifier(
		routeParams.ServiceParams.Config.ExpoNotification.SlackToken,
	)

	expoController := controllers.NewExpoDeployWebhookController(
		routeParams.Validator,
		slackNotifier,
		routeParams.ServiceParams.Config.ExpoNotification,
	)

	webhookGroup := apiGroup.Group("/expo/webhooks")

	webhookGroup.Use(
		middlewares.ExpoWebhookVerify(routeParams.ServiceParams.Config.ExpoNotification),
	)

	webhookGroup.Post("/build", expoController.HandleBuildWebhook)

	webhookGroup.Post("/submission", expoController.HandleSubmissionWebhook)

	return webhookGroup
}
