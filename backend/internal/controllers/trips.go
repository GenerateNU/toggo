package controllers

import (
	"errors"
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/utilities"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type TripController struct {
	tripService services.TripServiceInterface
	validator   *validator.Validate
}

func NewTripController(tripService services.TripServiceInterface, validator *validator.Validate) *TripController {
	return &TripController{
		tripService: tripService,
		validator:   validator,
	}
}

// @Summary      Create a trip
// @Description  Creates a new trip for the authenticated user
// @Tags         trips
// @Accept       json
// @Produce      json
// @Param        request body models.CreateTripRequest true "Create trip request"
// @Success      201 {object} models.Trip
// @Failure      401 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips [post]
// @ID           createTrip
func (ctrl *TripController) CreateTrip(c *fiber.Ctx) error {
	userIDValue := c.Locals("userID")
	if userIDValue == nil {
		return errs.Unauthorized()
	}

	userIDStr, ok := userIDValue.(string)
	if !ok {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	var req models.CreateTripRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	trip, err := ctrl.tripService.CreateTrip(c.Context(), userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(trip)
}

// @Summary      Get a trip
// @Description  Retrieves a trip by ID
// @Tags         trips
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Success      200 {object} models.TripAPIResponse
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID} [get]
// @ID           getTrip
func (ctrl *TripController) GetTrip(c *fiber.Ctx) error {
	id, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	trip, err := ctrl.tripService.GetTrip(c.Context(), id)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(trip)
}

// @Summary      Get all trips
// @Description  Retrieves trips with cursor-based pagination. Use limit and cursor query params.
// @Tags         trips
// @Produce      json
// @Param        limit  query int false "Max items per page (default 20, max 100)"
// @Param        cursor query string false "Opaque cursor from previous response next_cursor for next page"
// @Success      200 {object} models.TripCursorPageResult
// @Failure      400 {object} errs.APIError "Invalid cursor"
// @Failure      401 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips [get]
// @ID           getAllTrips
func (ctrl *TripController) GetAllTrips(c *fiber.Ctx) error {
	userIDValue := c.Locals("userID")
	if userIDValue == nil {
		return errs.Unauthorized()
	}

	userIDStr, ok := userIDValue.(string)
	if !ok {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	var params models.CursorPaginationParams
	if err := utilities.ParseAndValidateQueryParams(c, ctrl.validator, &params); err != nil {
		return err
	}

	limit, cursorToken := utilities.ExtractLimitAndCursor(&params)

	result, err := ctrl.tripService.GetTripsWithCursor(c.Context(), userID, limit, cursorToken)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidCursor) {
			return errs.BadRequest(err)
		}
		return err
	}
	return c.Status(http.StatusOK).JSON(result)
}

// @Summary      Update a trip
// @Description  Updates an existing trip by ID
// @Tags         trips
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.UpdateTripRequest true "Update trip request"
// @Success      200 {object} models.Trip
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID} [patch]
// @ID           updateTrip
func (ctrl *TripController) UpdateTrip(c *fiber.Ctx) error {
	var req models.UpdateTripRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	trip, err := ctrl.tripService.UpdateTrip(c.Context(), tripID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(trip)
}

// @Summary      Delete a trip
// @Description  Deletes a trip by ID
// @Tags         trips
// @Param        tripID path string true "Trip ID"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID} [delete]
// @ID           deleteTrip
func (ctrl *TripController) DeleteTrip(c *fiber.Ctx) error {
	userIDValue := c.Locals("userID")
	if userIDValue == nil {
		return errs.Unauthorized()
	}

	userIDStr, ok := userIDValue.(string)
	if !ok {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := ctrl.tripService.DeleteTrip(c.Context(), userID, tripID); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}
