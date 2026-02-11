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

type ActivityController struct {
	activityService services.ActivityServiceInterface
	validator       *validator.Validate
}

func NewActivityController(activityService services.ActivityServiceInterface, validator *validator.Validate) *ActivityController {
	return &ActivityController{
		activityService: activityService,
		validator:       validator,
	}
}

// @Summary      Create activity
// @Description  Creates a new activity for a trip
// @Tags         activities
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.CreateActivityRequest true "Create activity request"
// @Success      201 {object} models.Activity
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities [post]
// @ID           createActivity
func (ctrl *ActivityController) CreateActivity(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var req models.CreateActivityRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	// Override tripID from URL (security measure - use tripID from path, not body)
	req.TripID = tripID

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	
	if err != nil {
		return errs.Unauthorized()
	}

	activity, err := ctrl.activityService.CreateActivity(c.Context(), req, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(activity)
}

// @Summary      Get activity by ID
// @Description  Retrieves a specific activity
// @Tags         activities
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        activityID path string true "Activity ID"
// @Success      200 {object} models.ActivityAPIResponse
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/{activityID} [get]
// @ID           getActivity
func (ctrl *ActivityController) GetActivity(c *fiber.Ctx) error {
	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	activity, err := ctrl.activityService.GetActivity(c.Context(), activityID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(activity)
}

// @Summary      Get activities by trip
// @Description  Retrieves paginated activities for a trip
// @Tags         activities
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        limit query int false "Max items per page (default 20, max 100)"
// @Param        cursor query string false "Opaque cursor returned in next_cursor"
// @Success      200 {object} models.ActivityCursorPageResult
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities [get]
// @ID           getActivitiesByTripID
func (ctrl *ActivityController) GetActivitiesByTripID(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
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

	result, err := ctrl.activityService.GetActivitiesByTripID(c.Context(), tripID, userID, limit, cursorToken)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidCursor) {
			return errs.BadRequest(err)
		}
		return err
	}

	return c.Status(http.StatusOK).JSON(result)
}

// @Summary      Update activity
// @Description  Updates an existing activity
// @Tags         activities
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        activityID path string true "Activity ID"
// @Param        request body models.UpdateActivityRequest true "Update activity request"
// @Success      200 {object} models.Activity
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/{activityID} [put]
// @ID           updateActivity
func (ctrl *ActivityController) UpdateActivity(c *fiber.Ctx) error {
	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var req models.UpdateActivityRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	activity, err := ctrl.activityService.UpdateActivity(c.Context(), activityID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(activity)
}

// @Summary      Delete activity
// @Description  Deletes an activity
// @Tags         activities
// @Param        tripID path string true "Trip ID"
// @Param        activityID path string true "Activity ID"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/{activityID} [delete]
// @ID           deleteActivity
func (ctrl *ActivityController) DeleteActivity(c *fiber.Ctx) error {
	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	if err := ctrl.activityService.DeleteActivity(c.Context(), activityID, userID); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Get activity categories
// @Description  Retrieves categories for an activity with pagination
// @Tags         activities
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        activityID path string true "Activity ID"
// @Param        limit query int false "Max items per page (default 20, max 100)"
// @Param        cursor query string false "Opaque cursor returned in next_cursor"
// @Success      200 {object} models.ActivityCategoriesPageResult
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/{activityID}/categories [get]
// @ID           getActivityCategories
func (ctrl *ActivityController) GetActivityCategories(c *fiber.Ctx) error {
	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
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

	result, err := ctrl.activityService.GetActivityCategories(c.Context(), activityID, userID, limit, cursorToken)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidCursor) {
			return errs.BadRequest(err)
		}
		return err
	}

	return c.Status(http.StatusOK).JSON(result)
}

// @Summary      Add category to activity
// @Description  Adds a category to an activity (idempotent)
// @Tags         activities
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        activityID path string true "Activity ID"
// @Param        categoryName path string true "Category Name"
// @Success      200 {object} map[string]string
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/{activityID}/categories/{categoryName} [put]
// @ID           addCategoryToActivity
func (ctrl *ActivityController) AddCategoryToActivity(c *fiber.Ctx) error {
	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	// Use request model for validation
	req := models.AddCategoryToActivityRequest{
		CategoryName: c.Params("categoryName"),
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	if err := ctrl.activityService.AddCategoryToActivity(c.Context(), activityID, userID, req.CategoryName); err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Category added successfully",
	})
}

// @Summary      Remove category from activity
// @Description  Removes a category from an activity
// @Tags         activities
// @Param        tripID path string true "Trip ID"
// @Param        activityID path string true "Activity ID"
// @Param        categoryName path string true "Category Name"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/{activityID}/categories/{categoryName} [delete]
// @ID           removeCategoryFromActivity
func (ctrl *ActivityController) RemoveCategoryFromActivity(c *fiber.Ctx) error {
	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	// Use request model for validation
	req := models.AddCategoryToActivityRequest{
		CategoryName: c.Params("categoryName"),
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	if err := ctrl.activityService.RemoveCategoryFromActivity(c.Context(), activityID, userID, req.CategoryName); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}