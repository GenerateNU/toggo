package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/utilities"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type NotificationController struct {
	notificationService services.NotificationService
	validator           *validator.Validate
}

func NewNotificationController(
	notificationService services.NotificationService,
	validator *validator.Validate,
) *NotificationController {
	return &NotificationController{
		notificationService: notificationService,
		validator:           validator,
	}
}

// @Summary      Send notification to user
// @Description  Sends a push notification to a single user
// @Tags         notifications
// @Accept       json
// @Produce      json
// @Param        request body models.SendNotificationRequest true "Notification request"
// @Success      200
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/notifications/send [post]
// @ID 			sendNotification
func (n *NotificationController) SendNotification(c *fiber.Ctx) error {
	var req models.SendNotificationRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := utilities.Validate(n.validator, req); err != nil {
		return err
	}

	if err := n.notificationService.SendNotification(c.Context(), req); err != nil {
		return errs.InternalServerError()
	}

	return c.SendStatus(http.StatusOK)
}

// @Summary      Send bulk notifications
// @Description  Sends push notifications to multiple users
// @Tags         notifications
// @Accept       json
// @Produce      json
// @Param        request body models.SendBulkNotificationRequest true "Bulk notification request"
// @Success      200 {object} models.NotificationResponse
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/notifications/send-bulk [post]
// @ID 			sendBulkNotification
func (n *NotificationController) SendBulkNotification(c *fiber.Ctx) error {
	var req models.SendBulkNotificationRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := utilities.Validate(n.validator, req); err != nil {
		return err
	}

	response, err := n.notificationService.SendNotificationBatch(c.Context(), req)
	if err != nil {
		return fiber.NewError(http.StatusInternalServerError, err.Error())
	}

	return c.Status(http.StatusOK).JSON(response)
}
