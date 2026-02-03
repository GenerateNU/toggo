package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func CommentRoutes(apiGroup fiber.Router, routeParams types.RouteParams, fileService services.FileServiceInterface) fiber.Router {
	commentService := services.NewCommentService(routeParams.ServiceParams.Repository, fileService)
	commentController := controllers.NewCommentController(commentService, routeParams.Validator)

	// /api/v1/comments
	commentGroup := apiGroup.Group("/comments")
	commentGroup.Post("", commentController.CreateComment)

	// /api/v1/comments/:commentID
	commentIDGroup := commentGroup.Group("/:commentID")
	commentIDGroup.Patch("", commentController.UpdateComment)
	commentIDGroup.Delete("", commentController.DeleteComment)

	// /api/v1/trips/:tripID/:entityType/:entityID/comments
	tripGroup := apiGroup.Group("/trips/:tripID/:entityType/:entityID/comments")
	tripGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripGroup.Get("", commentController.GetPaginatedComments)

	return commentGroup
}
