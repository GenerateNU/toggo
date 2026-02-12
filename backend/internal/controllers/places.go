package controllers

import (
	"net/http"
	"toggo/internal/config"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/gofiber/fiber/v2"
)

// @Summary Get detailed information about a place
// @Description Retrieves detailed information about a specific place using Google Maps Places API. Accepts either a place_id (from typeahead results) or input text for direct search. Returns address, coordinates, photos, ratings, opening hours, and more.
// @Tags places
// @Accept json
// @Produce json
// @Param request body models.PlaceDetailsRequest true "Place details request (provide either place_id or input)"
// @Success 200 {object} models.PlaceDetailsResponse
// @Failure 400 {object} errs.APIError
// @Failure 500 {object} errs.APIError
// @Router /api/v1/search/places/details [post]
// @Security BearerAuth
// @ID getPlaceDetails
func GetPlaceDetailsHandler(placesService services.PlacesServiceInterface) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req models.PlaceDetailsRequest

		if err := c.BodyParser(&req); err != nil {
			return errs.BadRequest(err)
		}

		// Custom validation: at least one of place_id or input must be provided
		if req.PlaceID == "" && req.Input == "" {
			return errs.BadRequest(fiber.NewError(fiber.StatusBadRequest, "either place_id or input is required"))
		}

		response, err := placesService.GetPlaceDetails(c.Context(), req)
		if err != nil {
			return errs.NewAPIError(http.StatusInternalServerError, err)
		}

		return c.JSON(response)
	}
}

// @Summary Typeahead search for places
// @Description Quick typeahead/autocomplete endpoint for real-time place search as users type. Returns a list of place predictions with place IDs that can be used to fetch detailed information.
// @Tags places
// @Produce json
// @Param q query string true "Search query (e.g., 'Eiffel Tower', 'Paris')"
// @Param limit query int false "Maximum number of results (default: 5, max: 20)"
// @Param language query string false "Language code (e.g., 'en', 'fr', 'es')"
// @Success 200 {object} models.PlacesSearchResponse
// @Failure 400 {object} errs.APIError
// @Failure 500 {object} errs.APIError
// @Router /api/v1/search/places/typeahead [get]
// @Security BearerAuth
// @ID typeaheadPlaces
func TypeaheadPlacesHandler(placesService services.PlacesServiceInterface) fiber.Handler {
	return func(c *fiber.Ctx) error {
		query := c.Query("q")
		if query == "" {
			return errs.BadRequest(fiber.NewError(fiber.StatusBadRequest, "query parameter 'q' is required"))
		}

		limit := c.QueryInt("limit", 5)
		if limit < 1 || limit > 20 {
			return errs.BadRequest(fiber.NewError(fiber.StatusBadRequest, "query parameter limit should be in 1 <= limit <= 20"))
		}

		req := models.PlacesSearchRequest{
			Input:    query,
			Limit:    limit,
			Language: c.Query("language", ""),
		}

		response, err := placesService.SearchPlaces(c.Context(), req)
		if err != nil {
			return errs.NewAPIError(http.StatusInternalServerError, err)
		}

		return c.JSON(response)
	}
}

// @Summary Google Maps health check
// @Description Checks if Google Maps API is connected and accessible
// @Tags places
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/search/places/health [get]
// @Security BearerAuth
// @ID googleMapsHealth
func GoogleMapsHealthHandler(googleMapsConfig *config.GoogleMapsConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := googleMapsConfig.TestConnection(c.Context())
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":    "error",
				"connected": false,
				"details":   "Google Maps API connection failed",
			})
		}
		return c.JSON(fiber.Map{
			"status":    "ok",
			"connected": true,
		})
	}
}
