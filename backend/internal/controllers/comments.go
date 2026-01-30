package controllers

import (
	"net/http"
	"strconv"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/utilities"

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

	if err := utilities.Validate(cmt.validator, req); err != nil {
		return err
	}

	comment, err := cmt.commentService.CreateComment(c.Context(), req)
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

	id, err := utilities.ValidateID(c.Params("commentID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := utilities.Validate(cmt.validator, req); err != nil {
		return err
	}

	comment, err := cmt.commentService.UpdateComment(c.Context(), id, req)
	if err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return err
	}

	return c.Status(http.StatusOK).JSON(comment)
}

// @Summary      Delete a comment
// @Description  Deletes a comment by ID
// @Tags         comments
// @Param        commentID path string true "Comment ID"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments/{commentID} [delete]
// @ID           deleteComment
func (cmt *CommentController) DeleteComment(c *fiber.Ctx) error {
	id, err := utilities.ValidateID(c.Params("commentID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := cmt.commentService.DeleteComment(c.Context(), id); err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Get comments
// @Description  Retrieves paginated comments for a trip entity
// @Tags         comments
// @Produce      json
// @Param        trip_id query string true "Trip ID"
// @Param        entity_type query string true "Entity type (activity, pitch)"
// @Param        entity_id query string true "Entity ID"
// @Param        limit query int false "Max results"
// @Param        cursor query string false "Cursor timestamp (RFC3339)"
// @Success      200 {array} models.CommentAPIResponse
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/comments [get]
// @ID           getPaginatedComments
func (cmt *CommentController) GetPaginatedComments(c *fiber.Ctx) error {
	tripIDStr := c.Query("trip_id")
	entityTypeStr := c.Query("entity_type")
	entityIDStr := c.Query("entity_id")

	validationErrs := map[string]string{}

	if tripIDStr == "" {
		validationErrs["trip_id"] = "trip_id is required"
	}

	if entityTypeStr == "" {
		validationErrs["entity_type"] = "entity_type is required"
	}

	if entityIDStr == "" {
		validationErrs["entity_id"] = "entity_id is required"
	}

	if len(validationErrs) > 0 {
		return errs.InvalidRequestData(validationErrs)
	}

	tripID, err := utilities.ValidateID(tripIDStr)
	if err != nil {
		validationErrs["trip_id"] = "trip_id must be a valid UUID"
	}

	entityID, err := utilities.ValidateID(entityIDStr)
	if err != nil {
		validationErrs["entity_id"] = "entity_id must be a valid UUID"
	}

	entityType := models.EntityType(entityTypeStr)
	if entityType != models.Activity && entityType != models.Pitch {
		validationErrs["entity_type"] = "entity_type must be one of: activity, pitch"
	}

	limitStr := c.Query("limit")
	var limit *int
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil || parsedLimit <= 0 {
			validationErrs["limit"] = "limit must be a positive integer"
		} else {
			limit = &parsedLimit
		}
	}

	cursorStr := c.Query("cursor")
	var cursor *string
	if cursorStr != "" {
		if _, err := time.Parse(time.RFC3339, cursorStr); err != nil {
			validationErrs["cursor"] = "cursor must be a valid RFC3339 timestamp"
		} else {
			cursor = &cursorStr
		}
	}

	if len(validationErrs) > 0 {
		return errs.InvalidRequestData(validationErrs)
	}

	comments, err := cmt.commentService.GetPaginatedComments(c.Context(), tripID, entityType, entityID, limit, cursor)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(comments)
}
