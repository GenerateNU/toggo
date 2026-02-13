package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func TripRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	tripService := services.NewTripService(
		routeParams.ServiceParams.Repository,
		routeParams.ServiceParams.FileService,
		routeParams.ServiceParams.EventPublisher,
	)
	tripController := controllers.NewTripController(tripService, routeParams.Validator)

	// /api/v1/trips
	tripGroup := apiGroup.Group("/trips")
	tripGroup.Post("", tripController.CreateTrip)
	tripGroup.Get("", tripController.GetAllTrips)

	// /api/v1/trips/:tripID
	tripIDGroup := tripGroup.Group("/:tripID")
	tripIDGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripIDGroup.Get("", tripController.GetTrip)
	tripIDGroup.Patch("", tripController.UpdateTrip)
	tripIDGroup.Delete("", tripController.DeleteTrip)
	tripIDGroup.Post("/invites", tripController.CreateTripInvite)

	return tripGroup
}
