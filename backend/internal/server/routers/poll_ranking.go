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
		routeParams.ServiceParams.EventPublisher,
	)
	rankPollController := controllers.NewRankPollController(rankPollService, routeParams.Validator)

	rankPollGroup := apiGroup.Group("/trips/:tripID/rank-polls")
	rankPollGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	rankPollGroup.Post("", rankPollController.CreateRankPoll)
	pollIDGroup := rankPollGroup.Group("/:pollId")
	pollIDGroup.Get("", rankPollController.GetRankPollResults)
	pollIDGroup.Patch("", rankPollController.UpdateRankPoll)
	pollIDGroup.Delete("", rankPollController.DeleteRankPoll)
	pollIDGroup.Post("/options", rankPollController.AddOption)
	pollIDGroup.Delete("/options/:optionId", rankPollController.DeleteOption)
	pollIDGroup.Post("/rank", rankPollController.SubmitRanking)
	pollIDGroup.Get("/voters", rankPollController.GetPollVoters)

	return rankPollGroup
}
