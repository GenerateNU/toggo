package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type TripTabController struct {
	tripTabService services.TripTabServiceInterface
	validator      *validator.Validate
}

func NewTripTabController(tripTabService services.TripTabServiceInterface, validator *validator.Validate) *TripTabController {
	return &TripTabController{
		tripTabService: tripTabService,
		validator:      validator,
	}
}

// @Summary      Get trip tabs
// @Description  Retrieves all tabs for a trip ordered by position
// @Tags         trip-tabs
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Success      200 {array} models.TripTab
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/tabs [get]
// @ID           getTripTabs
func (ctrl *TripTabController) GetTabs(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	tabs, err := ctrl.tripTabService.GetTabs(c.Context(), tripID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"tabs": tabs})
}

// @Summary      Create trip tab
// @Description  Adds a new customizable tab to a trip
// @Tags         trip-tabs
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.CreateTripTabRequest true "Create tab request"
// @Success      201 {object} models.TripTab
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/tabs [post]
// @ID           createTripTab
func (ctrl *TripTabController) CreateTab(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var req models.CreateTripTabRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	tab, err := ctrl.tripTabService.CreateTab(c.Context(), tripID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(tab)
}

// @Summary      Reorder trip tabs
// @Description  Updates the position of tabs for a trip
// @Tags         trip-tabs
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.UpdateTripTabOrderRequest true "Reorder request"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/tabs/reorder [put]
// @ID           reorderTripTabs
func (ctrl *TripTabController) ReorderTabs(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var req models.UpdateTripTabOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	if err := ctrl.tripTabService.ReorderTabs(c.Context(), tripID, userID, req); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Delete trip tab
// @Description  Deletes a customizable tab from a trip
// @Tags         trip-tabs
// @Param        tripID path string true "Trip ID"
// @Param        tabID path string true "Tab ID"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/tabs/{tabID} [delete]
// @ID           deleteTripTab
func (ctrl *TripTabController) DeleteTab(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	tabID, err := validators.ValidateID(c.Params("tabID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	if err := ctrl.tripTabService.DeleteTab(c.Context(), tripID, tabID, userID); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}