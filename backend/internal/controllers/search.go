package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/utilities"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// SearchController handles full-text search endpoints for trips, activities, and trip members.
type SearchController struct {
	searchService services.SearchServiceInterface
	validator     *validator.Validate
}

// NewSearchController creates a new SearchController.
func NewSearchController(searchService services.SearchServiceInterface, v *validator.Validate) *SearchController {
	return &SearchController{
		searchService: searchService,
		validator:     v,
	}
}

func (ctrl *SearchController) requireUserID(c *fiber.Ctx) (uuid.UUID, error) {
	v := c.Locals("userID")
	if v == nil {
		return uuid.Nil, errs.Unauthorized()
	}
	s, ok := v.(string)
	if !ok {
		return uuid.Nil, errs.Unauthorized()
	}
	id, err := validators.ValidateID(s)
	if err != nil {
		return uuid.Nil, errs.Unauthorized()
	}
	return id, nil
}

// parseSearchParams extracts and validates the common search query parameters.
func (ctrl *SearchController) parseSearchParams(c *fiber.Ctx) (*models.SearchParams, error) {
	var params models.SearchParams
	if err := utilities.ParseAndValidateQueryParams(c, ctrl.validator, &params); err != nil {
		return nil, err
	}
	return &params, nil
}

// @Summary      Search trips
// @Description  Full-text search over trips the authenticated user is a member of. Ordered by relevance then recency.
// @Tags         search
// @Produce      json
// @Param        q      query string true  "Search query (1-255 chars)"
// @Param        limit  query int    false "Max items per page (default 20, max 100)"
// @Param        offset query int    false "Pagination offset (default 0)"
// @Success      200 {object} models.SearchTripsResult
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/search/trips [get]
// @ID           searchTrips
func (ctrl *SearchController) SearchTrips(c *fiber.Ctx) error {
	userID, err := ctrl.requireUserID(c)
	if err != nil {
		return err
	}

	params, err := ctrl.parseSearchParams(c)
	if err != nil {
		return err
	}

	result, err := ctrl.searchService.SearchTrips(c.Context(), userID, params.Query, params.GetLimit(), params.Offset)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(result)
}

// @Summary      Search activities in a trip
// @Description  Full-text search over activities within a specific trip. Ordered by relevance then recency.
// @Tags         search
// @Produce      json
// @Param        tripID path   string true  "Trip ID"
// @Param        q      query  string true  "Search query (1-255 chars)"
// @Param        limit  query  int    false "Max items per page (default 20, max 100)"
// @Param        offset query  int    false "Pagination offset (default 0)"
// @Success      200 {object} models.SearchActivitiesResult
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/search/trips/{tripID}/activities [get]
// @ID           searchActivities
func (ctrl *SearchController) SearchActivities(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	params, err := ctrl.parseSearchParams(c)
	if err != nil {
		return err
	}

	result, err := ctrl.searchService.SearchActivities(c.Context(), tripID, params.Query, params.GetLimit(), params.Offset)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(result)
}

// @Summary      Search trip members
// @Description  Full-text search over members of a specific trip, matching on name and username.
// @Tags         search
// @Produce      json
// @Param        tripID path   string true  "Trip ID"
// @Param        q      query  string true  "Search query (1-255 chars)"
// @Param        limit  query  int    false "Max items per page (default 20, max 100)"
// @Param        offset query  int    false "Pagination offset (default 0)"
// @Success      200 {object} models.SearchMembersResult
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/search/trips/{tripID}/members [get]
// @ID           searchTripMembers
func (ctrl *SearchController) SearchTripMembers(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	params, err := ctrl.parseSearchParams(c)
	if err != nil {
		return err
	}

	result, err := ctrl.searchService.SearchTripMembers(c.Context(), tripID, params.Query, params.GetLimit(), params.Offset)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(result)
}
