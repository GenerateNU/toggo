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

type PitchController struct {
	pitchService services.PitchServiceInterface
	validator    *validator.Validate
}

func NewPitchController(pitchService services.PitchServiceInterface, validator *validator.Validate) *PitchController {
	return &PitchController{
		pitchService: pitchService,
		validator:    validator,
	}
}

// @Summary      Create a pitch
// @Description  Creates a new pitch for the trip and returns a presigned URL to upload the audio file
// @Tags         pitches
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.CreatePitchRequest true "Create pitch request"
// @Success      201 {object} models.CreatePitchResponse
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/pitches [post]
// @ID           createPitch
func (ctrl *PitchController) CreatePitch(c *fiber.Ctx) error {
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

	var req models.CreatePitchRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}
	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	resp, err := ctrl.pitchService.Create(c.Context(), tripID, userID, req)
	if err != nil {
		return err
	}
	return c.Status(http.StatusCreated).JSON(resp)
}

// @Summary      Get all pitches for a trip
// @Description  Returns pitches for the trip with cursor-based pagination
// @Tags         pitches
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        limit  query int false "Max items per page (default 20, max 100)"
// @Param        cursor query string false "Opaque cursor from previous response next_cursor"
// @Success      200 {object} models.PitchCursorPageResult
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/pitches [get]
// @ID           listPitches
func (ctrl *PitchController) ListPitches(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var params models.GetPitchesQueryParams
	if err := utilities.ParseAndValidateQueryParams(c, ctrl.validator, &params); err != nil {
		return err
	}
	limit, cursorToken := utilities.ExtractLimitAndCursor(&params)

	result, err := ctrl.pitchService.List(c.Context(), tripID, limit, cursorToken)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidCursor) {
			return errs.BadRequest(err)
		}
		return err
	}
	return c.Status(http.StatusOK).JSON(result)
}

// @Summary      Get a pitch by ID
// @Description  Returns a single pitch with a presigned URL for the audio file
// @Tags         pitches
// @Produce      json
// @Param        tripID  path string true "Trip ID"
// @Param        pitchID path string true "Pitch ID"
// @Success      200 {object} models.PitchAPIResponse
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/pitches/{pitchID} [get]
// @ID           getPitch
func (ctrl *PitchController) GetPitch(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}
	pitchID, err := validators.ValidateID(c.Params("pitchID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pitch, err := ctrl.pitchService.GetByID(c.Context(), tripID, pitchID)
	if err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return err
	}
	return c.Status(http.StatusOK).JSON(pitch)
}

// @Summary      Update a pitch
// @Description  Updates pitch metadata (title, description, duration)
// @Tags         pitches
// @Accept       json
// @Produce      json
// @Param        tripID  path string true "Trip ID"
// @Param        pitchID path string true "Pitch ID"
// @Param        request body models.UpdatePitchRequest true "Update pitch request"
// @Success      200 {object} models.PitchAPIResponse
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/pitches/{pitchID} [patch]
// @ID           updatePitch
func (ctrl *PitchController) UpdatePitch(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}
	pitchID, err := validators.ValidateID(c.Params("pitchID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var req models.UpdatePitchRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}
	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	pitch, err := ctrl.pitchService.Update(c.Context(), tripID, pitchID, req)
	if err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return err
	}
	return c.Status(http.StatusOK).JSON(pitch)
}

// @Summary      Delete a pitch
// @Description  Deletes a pitch by ID
// @Tags         pitches
// @Param        tripID  path string true "Trip ID"
// @Param        pitchID path string true "Pitch ID"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/pitches/{pitchID} [delete]
// @ID           deletePitch
func (ctrl *PitchController) DeletePitch(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}
	pitchID, err := validators.ValidateID(c.Params("pitchID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := ctrl.pitchService.Delete(c.Context(), tripID, pitchID); err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return err
	}
	return c.SendStatus(http.StatusNoContent)
}
