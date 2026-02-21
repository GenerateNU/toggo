package controllers

import (
	"errors"
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type RankPollController struct {
	rankPollService services.RankPollServiceInterface
	validator       *validator.Validate
}

func NewRankPollController(rankPollService services.RankPollServiceInterface, validator *validator.Validate) *RankPollController {
	return &RankPollController{
		rankPollService: rankPollService,
		validator:       validator,
	}
}

// @Summary      Create a rank poll
// @Description  Creates a new ranking poll with initial options
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        request body models.CreatePollRequest true "Create rank poll request"
// @Success      201 {object} models.RankPollAPIResponse
// @Failure      400,401,403,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls [post]
// @ID           createRankPoll
func (rc *RankPollController) CreateRankPoll(c *fiber.Ctx) error {
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

	if err := validators.Validate(rc.validator, req); err != nil {
		return err
	}

	if req.PollType != models.PollTypeRank {
		return errs.BadRequest(errors.New("poll_type must be 'rank'"))
	}

	poll, err := rc.rankPollService.CreateRankPoll(c.Context(), tripID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(poll)
}

// @Summary      Get rank poll results
// @Description  Retrieves a rank poll with Borda count scores and user's personal ranking
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Success      200 {object} models.RankPollResultsResponse
// @Failure      400,401,403,404,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls/{pollId} [get]
// @ID           getRankPollResults
func (rc *RankPollController) GetRankPollResults(c *fiber.Ctx) error {
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

	results, err := rc.rankPollService.GetRankPollResults(c.Context(), tripID, pollID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(results)
}

// @Summary      Update a rank poll
// @Description  Updates poll metadata (question, deadline)
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        request body models.UpdatePollRequest true "Update rank poll request"
// @Success      200 {object} models.RankPollAPIResponse
// @Failure      400,401,403,404,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls/{pollId} [patch]
// @ID           updateRankPoll
func (rc *RankPollController) UpdateRankPoll(c *fiber.Ctx) error {
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

	if err := validators.Validate(rc.validator, req); err != nil {
		return err
	}

	poll, err := rc.rankPollService.UpdateRankPoll(c.Context(), tripID, pollID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(poll)
}

// @Summary      Delete a rank poll
// @Description  Deletes a rank poll and all associated options and rankings
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Success      200 {object} models.RankPollAPIResponse
// @Failure      400,401,403,404,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls/{pollId} [delete]
// @ID           deleteRankPoll
func (rc *RankPollController) DeleteRankPoll(c *fiber.Ctx) error {
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

	poll, err := rc.rankPollService.DeleteRankPoll(c.Context(), tripID, pollID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(poll)
}

// @Summary      Add a rank poll option
// @Description  Adds an option to a rank poll (only if no rankings exist yet)
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        request body models.CreatePollOptionRequest true "Create option request"
// @Success      201 {object} models.PollOptionAPIResponse
// @Failure      400,401,403,404,409,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls/{pollId}/options [post]
// @ID           addRankPollOption
func (rc *RankPollController) AddOption(c *fiber.Ctx) error {
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

	if err := validators.Validate(rc.validator, req); err != nil {
		return err
	}

	option, err := rc.rankPollService.AddPollOption(c.Context(), tripID, pollID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(option)
}

// @Summary      Delete a rank poll option
// @Description  Removes an option from a rank poll (only if no rankings exist yet)
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        optionId path string true "Option ID"
// @Success      200 {object} models.PollOptionAPIResponse
// @Failure      400,401,403,404,409,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls/{pollId}/options/{optionId} [delete]
// @ID           deleteRankPollOption
func (rc *RankPollController) DeleteOption(c *fiber.Ctx) error {
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

	option, err := rc.rankPollService.DeletePollOption(c.Context(), tripID, pollID, optionID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(option)
}

// @Summary      Submit ranking
// @Description  Submits or replaces the user's full ranking for a poll
// @Tags         polls
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Param        request body models.SubmitRankingRequest true "Submit ranking request"
// @Success      200 {object} map[string]interface{}
// @Failure      400,401,403,404,422,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls/{pollId}/rank [post]
// @ID           submitRanking
func (rc *RankPollController) SubmitRanking(c *fiber.Ctx) error {
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

	var req models.SubmitRankingRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(rc.validator, req); err != nil {
		return err
	}

	if err := rc.rankPollService.SubmitRanking(c.Context(), tripID, pollID, userID, req); err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Ranking submitted successfully",
	})
}

// @Summary      Get poll voters
// @Description  Returns who has voted vs who hasn't for a rank poll
// @Tags         polls
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        pollId path string true "Poll ID"
// @Success      200 {object} models.PollVotersResponse
// @Failure      400,401,403,404,500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/rank-polls/{pollId}/voters [get]
// @ID           getRankPollVoters
func (rc *RankPollController) GetPollVoters(c *fiber.Ctx) error {
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

	voters, err := rc.rankPollService.GetPollVoters(c.Context(), tripID, pollID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(voters)
}
