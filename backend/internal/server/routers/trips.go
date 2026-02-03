package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func TripRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	tripService := services.NewTripService(routeParams.ServiceParams.Repository)
	tripController := controllers.NewTripController(tripService, routeParams.Validator)

	// /api/v1/trips
	tripGroup := apiGroup.Group("/trips")
	tripGroup.Post("", tripController.CreateTrip)
	tripGroup.Get("", tripController.GetAllTrips)

	// /api/v1/trips/:tripID
	tripIDGroup := tripGroup.Group("/:tripID")
	tripIDGroup.Get("", tripController.GetTrip)
	tripIDGroup.Patch("", tripController.UpdateTrip)
	tripIDGroup.Delete("", tripController.DeleteTrip)

	return tripGroup
}
