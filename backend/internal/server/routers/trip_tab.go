package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func TripTabRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	tripTabController := controllers.NewTripTabController(
		routeParams.ServiceParams.TripTabService,
		routeParams.Validator,
	)

	// /api/v1/trips/:tripID/tabs
	tripTabGroup := apiGroup.Group("/trips/:tripID/tabs")
	tripTabGroup.Get("", tripTabController.GetTabs)
	tripTabGroup.Post("", tripTabController.CreateTab)
	tripTabGroup.Put("/reorder", tripTabController.ReorderTabs)
	tripTabGroup.Delete("/:tabID", tripTabController.DeleteTab)

	return tripTabGroup
}