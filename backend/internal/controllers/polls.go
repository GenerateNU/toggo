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

type PollController struct {
	pollService services.PollServiceInterface
	validator   *validator.Validate
}

// NewPollController creates a poll controller with the given service and validator.
func NewPollController(pollService services.PollServiceInterface, validator *validator.Validate) *PollController {
	return &PollController{
		pollService: pollService,
		validator:   validator,
	}
}

// @Summary      Create a poll
// @Description  Creates a new poll with initial options
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.CreatePollRequest true "Create poll request"
// @Success      201 {object} models.PollAPIResponse
// @Failure      400,401,403,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls [post]
// @ID           createPoll
func (pc *PollController) CreatePoll(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	var req models.CreatePollRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(pc.validator, req); err != nil {
		return err
	}

	poll, err := pc.pollService.CreatePoll(c.Context(), tripID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(poll)
}

// @Summary      Get polls for a trip
// @Description  Retrieves all polls for a trip with cursor-based pagination
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        limit  query int false "Max items per page (default 20, max 100)"
// @Param        cursor query string false "Opaque cursor returned in next_cursor"
// @Success      200 {object} models.PollCursorPageResult
// @Failure      400,401,403,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls [get]
// @ID           getPollsByTripID
func (pc *PollController) GetPollsByTripID(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	var params models.CursorPaginationParams
	if err := utilities.ParseAndValidateQueryParams(c, pc.validator, &params); err != nil {
		return err
	}

	limit, cursorToken := utilities.ExtractLimitAndCursor(&params)

	result, err := pc.pollService.GetPollsByTripID(c.Context(), tripID, userID, limit, cursorToken)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidCursor) {
			return errs.BadRequest(err)
		}
		return err
	}

	return c.Status(http.StatusOK).JSON(result)
}

// @Summary      Get poll results
// @Description  Retrieves a poll with vote counts and the caller's votes
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Success      200 {object} models.PollAPIResponse
// @Failure      400,401,403,404,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls/{pollId} [get]
// @ID           getPoll
func (pc *PollController) GetPoll(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pollID, err := validators.ValidateID(c.Params("pollId"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	poll, err := pc.pollService.GetPoll(c.Context(), tripID, pollID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(poll)
}

// @Summary      Update a poll
// @Description  Updates poll metadata (question, deadline)
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        request body models.UpdatePollRequest true "Update poll request"
// @Success      200 {object} models.PollAPIResponse
// @Failure      400,401,403,404,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls/{pollId} [patch]
// @ID           updatePoll
func (pc *PollController) UpdatePoll(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pollID, err := validators.ValidateID(c.Params("pollId"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	var req models.UpdatePollRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(pc.validator, req); err != nil {
		return err
	}

	poll, err := pc.pollService.UpdatePoll(c.Context(), tripID, pollID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(poll)
}

// @Summary      Delete a poll
// @Description  Deletes a poll and all associated options and votes, returns the deleted poll
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Success      200 {object} models.PollAPIResponse
// @Failure      400,401,403,404,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls/{pollId} [delete]
// @ID           deletePoll
func (pc *PollController) DeletePoll(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pollID, err := validators.ValidateID(c.Params("pollId"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	poll, err := pc.pollService.DeletePoll(c.Context(), tripID, pollID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(poll)
}

// @Summary      Add a poll option
// @Description  Adds an option to a poll (only if no votes exist yet)
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        request body models.CreatePollOptionRequest true "Create option request"
// @Success      201 {object} models.PollOption
// @Failure      400,401,403,404,409,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls/{pollId}/options [post]
// @ID           addPollOption
func (pc *PollController) AddOption(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pollID, err := validators.ValidateID(c.Params("pollId"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	var req models.CreatePollOptionRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(pc.validator, req); err != nil {
		return err
	}

	option, err := pc.pollService.AddOption(c.Context(), tripID, pollID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(option)
}

// @Summary      Delete a poll option
// @Description  Removes an option from a poll and returns the deleted option
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        optionId path string true "Option ID"
// @Success      200 {object} models.PollOption
// @Failure      400,401,403,404,409,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls/{pollId}/options/{optionId} [delete]
// @ID           deletePollOption
func (pc *PollController) DeleteOption(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pollID, err := validators.ValidateID(c.Params("pollId"))
	if err != nil {
		return errs.InvalidUUID()
	}

	optionID, err := validators.ValidateID(c.Params("optionId"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	option, err := pc.pollService.DeleteOption(c.Context(), tripID, pollID, optionID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(option)
}

// @Summary      Cast a vote
// @Description  Casts or replaces the user's vote(s) on a poll
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        request body models.CastVoteRequest true "Vote request"
// @Success      200 {object} models.PollAPIResponse
// @Failure      400,401,403,404,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/vote-polls/{pollId}/vote [post]
// @ID           castVote
func (pc *PollController) CastVote(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pollID, err := validators.ValidateID(c.Params("pollId"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	var req models.CastVoteRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(pc.validator, req); err != nil {
		return err
	}

	poll, err := pc.pollService.CastVote(c.Context(), tripID, pollID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(poll)
}

// getUserID retrieves the authenticated user ID from the request context, validates it, and returns the parsed UUID.
// If the user ID is missing, not a valid UUID string, or an unsupported type, it returns uuid.Nil and an Unauthorized error.
func getUserID(c *fiber.Ctx) (uuid.UUID, error) {
	val := c.Locals("userID")
	if val == nil {
		return uuid.Nil, errs.Unauthorized()
	}

	switch v := val.(type) {
	case string:
		userID, err := validators.ValidateID(v)
		if err != nil {
			return uuid.Nil, errs.Unauthorized()
		}
		return userID, nil
	case uuid.UUID:
		return v, nil
	default:
		return uuid.Nil, errs.Unauthorized()
	}
}