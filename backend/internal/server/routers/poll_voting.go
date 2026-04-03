package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func VotePollRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	pollService := services.NewPollVotingService(
		routeParams.ServiceParams.Repository,
		routeParams.ServiceParams.PollService,
		routeParams.ServiceParams.NotificationService,
	)

	votePollController := controllers.NewVotePollController(
		pollService,
		routeParams.Validator,
	)

	// /api/v1/trips/:tripID/vote-polls
	votePollGroup := apiGroup.Group("/trips/:tripID/vote-polls")
	votePollGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))

	votePollGroup.Post("", votePollController.CreatePoll)
	votePollGroup.Get("", votePollController.GetPollsByTripID)

	// /api/v1/trips/:tripID/vote-polls/:pollId
	pollIDGroup := votePollGroup.Group("/:pollId")

	pollIDGroup.Get("", votePollController.GetPoll)
	pollIDGroup.Patch("", votePollController.UpdatePoll)
	pollIDGroup.Delete("", votePollController.DeletePoll)

	// /api/v1/trips/:tripID/vote-polls/:pollId/options
	pollIDGroup.Post("/options", votePollController.AddOption)
	pollIDGroup.Delete("/options/:optionId", votePollController.DeleteOption)

	// /api/v1/trips/:tripID/vote-polls/:pollId/vote
	pollIDGroup.Post("/vote", votePollController.CastVote)

	return votePollGroup
}
