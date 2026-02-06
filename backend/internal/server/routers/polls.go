
package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func PollRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	pollService := services.NewPollService(routeParams.ServiceParams.Repository)
	pollController := controllers.NewPollController(pollService, routeParams.Validator)

	// /api/v1/trips/:tripID/vote-polls
	pollGroup := apiGroup.Group("/trips/:id/vote-polls")
	pollGroup.Post("", pollController.CreatePoll)

	// /api/v1/trips/:tripID/vote-polls/:pollId
	pollIDGroup := pollGroup.Group("/:pollId")
	pollIDGroup.Get("", pollController.GetPoll)
	pollIDGroup.Patch("", pollController.UpdatePoll)
	pollIDGroup.Delete("", pollController.DeletePoll)

	// /api/v1/trips/:tripID/vote-polls/:pollId/options
	pollIDGroup.Post("/options", pollController.AddOption)
	pollIDGroup.Delete("/options/:optionId", pollController.DeleteOption)

	// /api/v1/trips/:tripID/vote-polls/:pollId/vote
	pollIDGroup.Post("/vote", pollController.CastVote)

	return pollGroup
}