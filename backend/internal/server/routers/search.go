package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
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

	placesCtrl := controllers.NewPlacesController(placesService, &params.ServiceParams.Config.GoogleMaps)
	placesGroup := searchGroup.Group("/places")

	placesGroup.Get("/typeahead", placesCtrl.TypeaheadPlaces)
	placesGroup.Post("/details", placesCtrl.GetPlaceDetails)
	placesGroup.Get("/health", placesCtrl.GoogleMapsHealth)

	searchService := services.NewSearchService(params.ServiceParams.Repository, params.ServiceParams.FileService)
	searchCtrl := controllers.NewSearchController(searchService, params.Validator)

	searchGroup.Get("/trips", searchCtrl.SearchTrips)

	tripSearch := searchGroup.Group("/trips/:tripID", middlewares.TripMemberRequired(params.ServiceParams.Repository))
	tripSearch.Get("/activities", searchCtrl.SearchActivities)
	tripSearch.Get("/members", searchCtrl.SearchTripMembers)
}
