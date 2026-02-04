package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

// TestRoutes registers routes without authentication for testing realtime functionality.
// These routes should NOT be enabled in production.
func TestRoutes(apiGroup fiber.Router, routeParams types.RouteParams, fileService services.FileServiceInterface) fiber.Router {
	tripService := services.NewTripService(routeParams.ServiceParams.Repository, fileService, routeParams.ServiceParams.EventPublisher)
	tripController := controllers.NewTripController(tripService, routeParams.Validator)

	// /api/test/trips - No auth required
	testGroup := apiGroup.Group("/test")
	tripGroup := testGroup.Group("/trips")

	// Only expose update and get for testing
	tripGroup.Get("/:tripID", tripController.GetTrip)
	tripGroup.Patch("/:tripID", tripController.UpdateTrip)

	return testGroup
}
