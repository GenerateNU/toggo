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

type CommentController struct {
	commentService services.CommentServiceInterface
	validator      *validator.Validate
}

func NewCommentController(commentService services.CommentServiceInterface, validator *validator.Validate) *CommentController {
	return &CommentController{
		commentService: commentService,
		validator:      validator,
	}
}

// @Summary      Create a comment
// @Description  Creates a new comment
// @Tags         comments
// @Accept       json
// @Produce      json
// @Param        request body models.CreateCommentRequest true "Create comment request"
// @Success      201 {object} models.Comment
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments [post]
// @ID           createComment
func (cmt *CommentController) CreateComment(c *fiber.Ctx) error {
	var req models.CreateCommentRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(cmt.validator, req); err != nil {
		return err
	}

	userIDStr := c.Locals("userID")
	if userIDStr == nil {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr.(string))
	if err != nil {
		return errs.Unauthorized()
	}

	comment, err := cmt.commentService.CreateComment(c.Context(), req, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(comment)
}

// @Summary      Update a comment
// @Description  Updates an existing comment by ID
// @Tags         comments
// @Accept       json
// @Produce      json
// @Param        commentID path string true "Comment ID"
// @Param        request body models.UpdateCommentRequest true "Update comment request"
// @Success      200 {object} models.Comment
// @Failure      401 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments/{commentID} [patch]
// @ID           updateComment
func (cmt *CommentController) UpdateComment(c *fiber.Ctx) error {
	var req models.UpdateCommentRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	id, err := validators.ValidateID(c.Params("commentID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := validators.Validate(cmt.validator, req); err != nil {
		return err
	}

	userIDStr := c.Locals("userID")
	if userIDStr == nil {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr.(string))
	if err != nil {
		return errs.Unauthorized()
	}

	comment, err := cmt.commentService.UpdateComment(c.Context(), id, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(comment)
}

// @Summary      Delete a comment
// @Description  Deletes a comment by ID
// @Tags         comments
// @Param        commentID path string true "Comment ID"
// @Success      204 "No Content"
// @Failure      401 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments/{commentID} [delete]
// @ID           deleteComment
func (cmt *CommentController) DeleteComment(c *fiber.Ctx) error {
	id, err := validators.ValidateID(c.Params("commentID"))
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

	if err := cmt.commentService.DeleteComment(c.Context(), id, userID); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Get comments
// @Description  Retrieves paginated comments for a trip entity
// @Tags         comments
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        entityType path string true "Entity type (activity, pitch)"
// @Param        entityID path string true "Entity ID"
// @Param        limit query int false "Max items per page (default 20, max 100)"
// @Param        cursor query string false "Opaque cursor returned in next_cursor"
// @Success      200 {object} models.PaginatedCommentsResponse
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/{entityType}/{entityID}/comments [get]
// @ID           getPaginatedComments
func (cmt *CommentController) GetPaginatedComments(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	entityID, err := validators.ValidateID(c.Params("entityID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	entityType, err := utilities.ParseEntityTypeParam(c, "entityType", "entity_type", models.Activity, models.Pitch)
	if err != nil {
		return err
	}

	var params models.GetCommentsQueryParams
	if err := utilities.ParseAndValidateQueryParams(c, cmt.validator, &params); err != nil {
		return err
	}

	limit, cursorToken := utilities.ExtractLimitAndCursor(&params.CursorPaginationParams)

	response, err := cmt.commentService.GetPaginatedComments(c.Context(), tripID, entityType, entityID, limit, cursorToken)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidCursor) {
			return errs.BadRequest(err)
		}
		return err
	}

	return c.Status(http.StatusOK).JSON(response)
}
