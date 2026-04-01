package controllers

import (
	"net/http"
	"net/url"

	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type CommentReactionController struct {
	reactionService services.CommentReactionServiceInterface
	validator       *validator.Validate
}

func NewCommentReactionController(reactionService services.CommentReactionServiceInterface, validator *validator.Validate) *CommentReactionController {
	return &CommentReactionController{
		reactionService: reactionService,
		validator:       validator,
	}
}

// @Summary      Add a reaction to a comment
// @Description  Adds an emoji reaction to a comment
// @Tags         comment-reactions
// @Accept       json
// @Produce      json
// @Param        commentID path string true "Comment ID"
// @Param        request body models.CreateCommentReactionRequest true "Create reaction request"
// @Success      201 {object} models.CommentReaction
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      409 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments/{commentID}/reactions [post]
// @ID           addCommentReaction
func (crt *CommentReactionController) AddReaction(c *fiber.Ctx) error {
	var req models.CreateCommentReactionRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(crt.validator, req); err != nil {
		return err
	}

	commentID, err := validators.ValidateID(c.Params("commentID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr := c.Locals("userID")
	if userIDStr == nil {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr.(string))
	if err != nil {
		return errs.Unauthorized()
	}

	reaction, err := crt.reactionService.AddReaction(c.Context(), commentID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(reaction)
}

// @Summary      Remove a reaction from a comment
// @Description  Removes the current user's emoji reaction from a comment
// @Tags         comment-reactions
// @Accept       json
// @Produce      json
// @Param        commentID path string true "Comment ID"
// @Param        request body models.DeleteCommentReactionRequest true "Delete reaction request"
// @Success      204 "No Content"
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments/{commentID}/reactions [delete]
// @ID           removeCommentReaction
func (crt *CommentReactionController) RemoveReaction(c *fiber.Ctx) error {
	var req models.DeleteCommentReactionRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(crt.validator, req); err != nil {
		return err
	}

	commentID, err := validators.ValidateID(c.Params("commentID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr := c.Locals("userID")
	if userIDStr == nil {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr.(string))
	if err != nil {
		return errs.Unauthorized()
	}

	if err := crt.reactionService.RemoveReaction(c.Context(), commentID, userID, req); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Get reactions summary for a comment
// @Description  Retrieves aggregated emoji reactions for a comment
// @Tags         comment-reactions
// @Produce      json
// @Param        commentID path string true "Comment ID"
// @Success      200 {object} models.CommentReactionsSummaryResponse
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments/{commentID}/reactions [get]
// @ID           getCommentReactionsSummary
func (crt *CommentReactionController) GetReactionSummary(c *fiber.Ctx) error {
	commentID, err := validators.ValidateID(c.Params("commentID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr := c.Locals("userID")
	if userIDStr == nil {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr.(string))
	if err != nil {
		return errs.Unauthorized()
	}

	resp, err := crt.reactionService.GetReactionSummary(c.Context(), commentID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(resp)
}

// @Summary      Get users who reacted with an emoji
// @Description  Retrieves users who reacted with a specific emoji on a comment
// @Tags         comment-reactions
// @Produce      json
// @Param        commentID path string true "Comment ID"
// @Param        emoji path string true "Emoji (URL-encoded)"
// @Success      200 {object} models.CommentReactionUsersResponse
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments/{commentID}/reactions/{emoji}/users [get]
// @ID           getCommentReactionUsers
func (crt *CommentReactionController) GetReactionUsers(c *fiber.Ctx) error {
	commentID, err := validators.ValidateID(c.Params("commentID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	emojiParam := c.Params("emoji")
	emoji, err := url.PathUnescape(emojiParam)
	if err != nil {
		// Keep consistent with invalid path params.
		return errs.BadRequest(err)
	}

	userIDStr := c.Locals("userID")
	if userIDStr == nil {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr.(string))
	if err != nil {
		return errs.Unauthorized()
	}

	resp, err := crt.reactionService.GetReactionUsers(c.Context(), commentID, userID, emoji)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(resp)
}

