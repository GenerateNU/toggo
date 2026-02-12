package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

// SearchRoutes sets up routes for all search functionality
func SearchRoutes(router fiber.Router, params types.RouteParams) {
	searchGroup := router.Group("/search")

	placesService := services.NewPlacesService(
		params.ServiceParams.Config.GoogleMaps.Client,
		params.ServiceParams.Config.GoogleMaps.APIKey,
	)

	placesGroup := searchGroup.Group("/places")

	// GET /api/v1/search/places/
	placesGroup.Get("/typeahead", controllers.TypeaheadPlacesHandler(placesService))
	placesGroup.Post("/details", controllers.GetPlaceDetailsHandler(placesService))
	placesGroup.Get("/health", controllers.GoogleMapsHealthHandler(&params.ServiceParams.Config.GoogleMaps))

}
