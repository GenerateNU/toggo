package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func RankPollRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	rankPollService := services.NewRankPollService(
		routeParams.ServiceParams.Repository,
		routeParams.ServiceParams.PollService,
		routeParams.ServiceParams.NotificationService,
	)
	rankPollController := controllers.NewRankPollController(rankPollService, routeParams.Validator)

	// /api/v1/trips/:tripID/rank-polls
	rankPollGroup := apiGroup.Group("/trips/:tripID/rank-polls")
	rankPollGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	rankPollGroup.Post("", rankPollController.CreateRankPoll)

	// /api/v1/trips/:tripID/rank-polls/:pollId
	pollIDGroup := rankPollGroup.Group("/:pollId")
	pollIDGroup.Get("", rankPollController.GetRankPollResults)
	pollIDGroup.Patch("", rankPollController.UpdateRankPoll)
	pollIDGroup.Delete("", rankPollController.DeleteRankPoll)

	// /api/v1/trips/:tripID/rank-polls/:pollId/options
	pollIDGroup.Post("/options", rankPollController.AddOption)
	pollIDGroup.Delete("/options/:optionId", rankPollController.DeleteOption)

	// /api/v1/trips/:tripID/rank-polls/:pollId/rank
	pollIDGroup.Post("/rank", rankPollController.SubmitRanking)

	// /api/v1/trips/:tripID/rank-polls/:pollId/voters
	pollIDGroup.Get("/voters", rankPollController.GetPollVoters)

	// /api/v1/trips/:tripID/rank-polls/:pollId/options/:optionId/ranks/:rankPosition/voters
	pollIDGroup.Get("/options/:optionId/ranks/:rankPosition/voters", rankPollController.GetChoiceVoters)

	return rankPollGroup
}
