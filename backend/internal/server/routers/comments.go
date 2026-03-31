package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func CommentRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	commentService := services.NewCommentService(routeParams.ServiceParams.Repository, routeParams.ServiceParams.FileService, routeParams.ServiceParams.EventPublisher)
	commentController := controllers.NewCommentController(commentService, routeParams.Validator)
	reactionService := services.NewCommentReactionService(routeParams.ServiceParams.Repository, routeParams.ServiceParams.FileService)
	reactionController := controllers.NewCommentReactionController(reactionService, routeParams.Validator)

	// /api/v1/comments
	commentGroup := apiGroup.Group("/comments")
	commentGroup.Post("", commentController.CreateComment)

	// /api/v1/comments/:commentID
	commentIDGroup := commentGroup.Group("/:commentID")
	commentIDGroup.Patch("", commentController.UpdateComment)
	commentIDGroup.Delete("", commentController.DeleteComment)
	commentIDGroup.Post("/reactions", reactionController.AddReaction)
	commentIDGroup.Delete("/reactions", reactionController.RemoveReaction)
	commentIDGroup.Get("/reactions", reactionController.GetReactionSummary)
	commentIDGroup.Get("/reactions/:emoji/users", reactionController.GetReactionUsers)

	// /api/v1/trips/:tripID/:entityType/:entityID/comments
	tripGroup := apiGroup.Group("/trips/:tripID/:entityType/:entityID/comments")
	tripGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripGroup.Get("", commentController.GetPaginatedComments)

	return commentGroup
}
