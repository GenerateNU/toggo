package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/services"
	"toggo/internal/validators"

	"github.com/gofiber/fiber/v2"
)

type ActivityFeedController struct {
	feedService services.ActivityFeedServiceInterface
}

func NewActivityFeedController(feedService services.ActivityFeedServiceInterface) *ActivityFeedController {
	return &ActivityFeedController{feedService: feedService}
}

// @Summary      Get trip activity feed
// @Description  Returns events in the trip that occurred after the caller's last-seen cursor. Advances the cursor on each call.
// @Tags         activity-feed
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Success      200 {array} realtime.Event
// @Failure      401 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activity [get]
// @ID           getTripActivityFeed
func (ctrl *ActivityFeedController) GetFeed(c *fiber.Ctx) error {
	userID, tripID, err := ctrl.extractIDs(c)
	if err != nil {
		return err
	}

	events, err := ctrl.feedService.GetFeed(c.Context(), userID, tripID)
	if err != nil {
		return errs.InternalServerError()
	}

	return c.Status(http.StatusOK).JSON(events)
}

// @Summary      Get unread activity count
// @Description  Returns the number of unseen events in the trip feed since the caller's last-seen cursor.
// @Tags         activity-feed
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Success      200 {object} map[string]int64
// @Failure      401 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activity/unread-count [get]
// @ID           getUnreadActivityCount
func (ctrl *ActivityFeedController) GetUnreadCount(c *fiber.Ctx) error {
	userID, tripID, err := ctrl.extractIDs(c)
	if err != nil {
		return err
	}

	count, err := ctrl.feedService.GetUnreadCount(c.Context(), userID, tripID)
	if err != nil {
		return errs.InternalServerError()
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"unread_count": count})
}

// @Summary      Mark activity event as read
// @Description  Removes a specific event from the caller's trip activity feed.
// @Tags         activity-feed
// @Param        tripID  path string true "Trip ID"
// @Param        eventID path string true "Event ID"
// @Success      204
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/activity/{eventID} [delete]
// @ID           markActivityEventRead
func (ctrl *ActivityFeedController) MarkRead(c *fiber.Ctx) error {
	userID, tripID, err := ctrl.extractIDs(c)
	if err != nil {
		return err
	}

	eventID := c.Params("eventID")
	if eventID == "" {
		return errs.BadRequest(fiber.NewError(http.StatusBadRequest, "eventID is required"))
	}

	if err := ctrl.feedService.MarkRead(c.Context(), userID, tripID, eventID); err != nil {
		return errs.InternalServerError()
	}

	return c.SendStatus(http.StatusNoContent)
}

func (ctrl *ActivityFeedController) extractIDs(c *fiber.Ctx) (userID, tripID string, err error) {
	userIDVal, ok := c.Locals("userID").(string)
	if !ok || userIDVal == "" {
		return "", "", errs.Unauthorized()
	}

	tripIDParam := c.Params("tripID")
	if _, err := validators.ValidateID(tripIDParam); err != nil {
		return "", "", errs.BadRequest(err)
	}

	return userIDVal, tripIDParam, nil
}
