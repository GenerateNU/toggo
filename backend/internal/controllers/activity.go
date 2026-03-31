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
	"github.com/google/uuid"
)

type ActivityController struct {
	activityService   services.ActivityServiceInterface
	linkParserService services.LinkParserServiceInterface
	validator         *validator.Validate
}

func NewActivityController(activityService services.ActivityServiceInterface, linkParserService services.LinkParserServiceInterface, validator *validator.Validate) *ActivityController {
	return &ActivityController{
		activityService:   activityService,
		linkParserService: linkParserService,
		validator:         validator,
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

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
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
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	activity, err := ctrl.activityService.GetActivity(c.Context(), tripID, activityID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(activity)
}

// @Summary      Get activities by trip
// @Description  Retrieves paginated activities for a trip, optionally filtered by category, time of day, and/or date
// @Tags         activities
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        category query string false "Filter by category name"
// @Param        time_of_day query string false "Filter by time of day (morning, afternoon, evening)"
// @Param        date query string false "Filter by calendar date (YYYY-MM-DD); activity must have a date range containing this day"
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

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	var params models.CursorPaginationParams
	if err := utilities.ParseAndValidateQueryParams(c, ctrl.validator, &params); err != nil {
		return err
	}

	limit, cursorToken := utilities.ExtractLimitAndCursor(&params)

	categoryName := c.Query("category")
	timeOfDayStr := c.Query("time_of_day")
	dateStr := c.Query("date")
	if err := validators.ValidateActivityTimeOfDay(timeOfDayStr); err != nil {
		return err
	}
	if err := validators.ValidateActivityDateFilter(dateStr); err != nil {
		return err
	}

	filterParams := models.ActivityQueryParams{}
	if categoryName != "" {
		filterParams.Category = &categoryName
	}
	if timeOfDayStr != "" {
		tod := models.ActivityTimeOfDay(timeOfDayStr)
		filterParams.TimeOfDay = &tod
	}
	if dateStr != "" {
		filterParams.Date = &dateStr
	}

	result, err := ctrl.activityService.GetActivitiesWithFilters(c.Context(), tripID, userID, filterParams, limit, cursorToken)

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
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

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

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	activity, err := ctrl.activityService.UpdateActivity(c.Context(), tripID, activityID, userID, req)
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
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	if err := ctrl.activityService.DeleteActivity(c.Context(), tripID, activityID, userID); err != nil {
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
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	var params models.CursorPaginationParams
	if err := utilities.ParseAndValidateQueryParams(c, ctrl.validator, &params); err != nil {
		return err
	}

	limit, cursorToken := utilities.ExtractLimitAndCursor(&params)

	result, err := ctrl.activityService.GetActivityCategories(c.Context(), tripID, activityID, userID, limit, cursorToken)
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
// @Success      200 {object} models.AddCategoryResponse
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/{activityID}/categories/{categoryName} [put]
// @ID           addCategoryToActivity
func (ctrl *ActivityController) AddCategoryToActivity(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

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

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	if err := ctrl.activityService.AddCategoryToActivity(c.Context(), tripID, activityID, userID, req.CategoryName); err != nil {
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
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

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

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	if err := ctrl.activityService.RemoveCategoryFromActivity(c.Context(), tripID, activityID, userID, req.CategoryName); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// RSVPActivity handles RSVP requests for an activity.
// @Summary RSVP to activity
// @Description Allows a user to RSVP to a specific activity within a trip.
// @Tags activities
// @Accept json
// @Produce json
// @Param tripID path string true "Trip ID"
// @Param activityID path string true "Activity ID"
// @Param request body models.ActivityRSVPRequestPayload true "RSVP request payload"
// @Success 200 {object} models.ActivityRSVPAPIResponse
// @Failure 400 {object} errs.APIError
// @Failure 401 {object} errs.APIError
// @Failure 403 {object} errs.APIError
// @Failure 404 {object} errs.APIError
// @Failure 422 {object} errs.APIError
// @Failure 500 {object} errs.APIError
// @Router /api/v1/trips/{tripID}/activities/{activityID}/rsvp [post]
func (ctrl *ActivityController) RSVPActivity(c *fiber.Ctx) error {
	input, err := ctrl.parseRSVPRequest(c)
	if err != nil {
		return err
	}

	rsvp, err := ctrl.activityService.UpdateActivityRSVP(
		c.Context(),
		input.TripID,
		input.ActivityID,
		input.UserID,
		input.Payload,
	)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(rsvp)
}

// GetActivityRSVPs retrieves RSVPs for an activity with pagination and optional status filtering.
// @Summary Get activity RSVPs
// @Description Returns paginated RSVPs for a specific activity within a trip, optionally filtered by RSVP status.
// @Tags activities
// @Produce json
// @Param tripID path string true "Trip ID"
// @Param activityID path string true "Activity ID"
// @Param limit query int false "Max items per page (default 20, max 100)"
// @Param cursor query string false "Opaque cursor returned in next_cursor"
// @Param status query string false "Filter by RSVP status"
// @Success 200 {object} models.ActivityRSVPsPageResult
// @Failure 400 {object} errs.APIError
// @Failure 401 {object} errs.APIError
// @Failure 403 {object} errs.APIError
// @Failure 404 {object} errs.APIError
// @Failure 422 {object} errs.APIError
// @Failure 500 {object} errs.APIError
// @Router /api/v1/trips/{tripID}/activities/{activityID}/rsvps [get]
func (ctrl *ActivityController) GetActivityRSVPs(c *fiber.Ctx) error {
	input, err := ctrl.parseRSVPPaginationRequest(c)
	if err != nil {
		return err
	}

	rsvps, err := ctrl.activityService.GetActivityRSVPs(
		c.Context(),
		input.TripID,
		input.ActivityID,
		input.UserID,
		input.Limit,
		input.Cursor,
		input.Status,
	)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(rsvps)
}

// @Summary      Parse link into activity data
// @Description  Fetches a URL and extracts structured activity fields (name, description, thumbnail) for form autofill. Supports Airbnb, Booking.com, TikTok, Instagram, and generic travel blog URLs.
// @Tags         activities
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.ParseLinkRequest true "URL to parse"
// @Success      200 {object} models.ParsedActivityData
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activities/parse-link [post]
// @ID           parseActivityLink
func (ctrl *ActivityController) ParseActivityLink(c *fiber.Ctx) error {
	var req models.ParseLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	parsed, err := ctrl.linkParserService.ParseLink(c.Context(), req.URL)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidURL), errors.Is(err, services.ErrForbiddenURL):
			return errs.BadRequest(err)
		case errors.Is(err, services.ErrNetworkFailure), errors.Is(err, services.ErrUpstreamError):
			return errs.NewAPIError(http.StatusBadGateway, err)
		default:
			return errs.InternalServerError()
		}
	}

	return c.Status(http.StatusOK).JSON(parsed)
}

func (ctrl *ActivityController) parseTripAndActivityIDs(
	c *fiber.Ctx,
) (uuid.UUID, uuid.UUID, error) {

	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return uuid.Nil, uuid.Nil, errs.InvalidUUID()
	}

	activityID, err := validators.ValidateID(c.Params("activityID"))
	if err != nil {
		return uuid.Nil, uuid.Nil, errs.InvalidUUID()
	}

	return tripID, activityID, nil
}

func (ctrl *ActivityController) parseRSVPRequest(
	c *fiber.Ctx,
) (*models.RSVPRequestInput, error) {
	tripID, activityID, err := ctrl.parseTripAndActivityIDs(c)
	if err != nil {
		return nil, err
	}

	var payload models.ActivityRSVPRequestPayload
	if err := c.BodyParser(&payload); err != nil {
		return nil, errs.InvalidJSON()
	}

	if err := validators.ValidateRSVPStatus(string(payload.Status)); err != nil {
		return nil, err
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return nil, err
	}

	return &models.RSVPRequestInput{
		TripID:     tripID,
		ActivityID: activityID,
		UserID:     userID,
		Payload:    payload,
	}, nil
}

func (ctrl *ActivityController) parseRSVPPaginationRequest(
	c *fiber.Ctx,
) (*models.RSVPPaginationInput, error) {

	tripID, activityID, err := ctrl.parseTripAndActivityIDs(c)
	if err != nil {
		return nil, err
	}

	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return nil, err
	}

	var pagination models.CursorPaginationParams
	if err := utilities.ParseAndValidateQueryParams(c, ctrl.validator, &pagination); err != nil {
		return nil, err
	}

	limit, cursor := utilities.ExtractLimitAndCursor(&pagination)

	status := c.Query("status")
	if status != "" {
		if err := validators.ValidateRSVPStatus(status); err != nil {
			return nil, err
		}
	}

	return &models.RSVPPaginationInput{
		TripID:     tripID,
		ActivityID: activityID,
		UserID:     userID,
		Limit:      limit,
		Cursor:     cursor,
		Status:     status,
	}, nil
}
