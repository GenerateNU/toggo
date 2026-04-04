package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func ActivityFeedRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	feedController := controllers.NewActivityFeedController(routeParams.ServiceParams.ActivityFeedService)

	// /api/v1/trips/:tripID/activity
	group := apiGroup.Group("/trips/:tripID/activity")
	group.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))

	// Registered before /:eventID to avoid parametric route shadowing.
	group.Get("/unread-count", feedController.GetUnreadCount)
	group.Get("", feedController.GetFeed)
	group.Delete("/:eventID", feedController.MarkRead)

	return group
}
