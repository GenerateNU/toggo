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

type NotificationPreferencesController struct {
	service   services.NotificationPreferencesServiceInterface
	validator *validator.Validate
}

func NewNotificationPreferencesController(service services.NotificationPreferencesServiceInterface, validator *validator.Validate) *NotificationPreferencesController {
	return &NotificationPreferencesController{
		service:   service,
		validator: validator,
	}
}

// @Summary      Get notification preferences
// @Description  Retrieves the notification preferences for the authenticated user
// @Tags         notification-preferences
// @Produce      json
// @Success      200 {object} models.NotificationPreferences
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/me/notification-preferences [get]
// @ID           getNotificationPreferences
func (n *NotificationPreferencesController) GetPreferences(c *fiber.Ctx) error {
	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	prefs, err := n.service.GetPreferences(c.Context(), userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(prefs)
}

// @Summary      Create notification preferences
// @Description  Creates notification preferences for the authenticated user
// @Tags         notification-preferences
// @Accept       json
// @Produce      json
// @Param        request body models.CreateNotificationPreferencesRequest true "Create notification preferences request"
// @Success      201 {object} models.NotificationPreferences
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      409 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/me/notification-preferences [post]
// @ID           createNotificationPreferences
func (n *NotificationPreferencesController) CreatePreferences(c *fiber.Ctx) error {
	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	var req models.CreateNotificationPreferencesRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(n.validator, req); err != nil {
		return err
	}

	prefs, err := n.service.CreatePreferences(c.Context(), userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(prefs)
}

// @Summary      Update notification preferences
// @Description  Updates notification preferences for the authenticated user
// @Tags         notification-preferences
// @Accept       json
// @Produce      json
// @Param        request body models.UpdateNotificationPreferencesRequest true "Update notification preferences request"
// @Success      200 {object} models.NotificationPreferences
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/me/notification-preferences [patch]
// @ID           updateNotificationPreferences
func (n *NotificationPreferencesController) UpdatePreferences(c *fiber.Ctx) error {
	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	var req models.UpdateNotificationPreferencesRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(n.validator, req); err != nil {
		return err
	}

	prefs, err := n.service.UpdatePreferences(c.Context(), userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(prefs)
}

// @Summary      Delete notification preferences
// @Description  Deletes notification preferences for the authenticated user
// @Tags         notification-preferences
// @Success      204 "No Content"
// @Failure      401 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/me/notification-preferences [delete]
// @ID           deleteNotificationPreferences
func (n *NotificationPreferencesController) DeletePreferences(c *fiber.Ctx) error {
	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	if err := n.service.DeletePreferences(c.Context(), userID); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Get or create default notification preferences
// @Description  Returns existing preferences or creates default preferences for the authenticated user
// @Tags         notification-preferences
// @Produce      json
// @Success      200 {object} models.NotificationPreferences
// @Failure      401 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/me/notification-preferences/default [post]
// @ID           getOrCreateDefaultNotificationPreferences
func (n *NotificationPreferencesController) GetOrCreateDefault(c *fiber.Ctx) error {
	userID, err := validators.ExtractUserID(c)
	if err != nil {
		return err
	}

	prefs, err := n.service.GetOrCreateDefaultPreferences(c.Context(), userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(prefs)
}
