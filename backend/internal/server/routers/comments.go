package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func CommentRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	commentService := services.NewCommentService(routeParams.ServiceParams.Repository, routeParams.ServiceParams.Config)
	commentController := controllers.NewCommentController(commentService, routeParams.Validator)

	commentGroup := apiGroup.Group("/comments")
	commentGroup.Post("", commentController.CreateComment)
	commentGroup.Get("", commentController.GetPaginatedComments)

	commentIDGroup := commentGroup.Group("/:commentID")
	commentIDGroup.Patch("", commentController.UpdateComment)
	commentIDGroup.Delete("", commentController.DeleteComment)

	return commentGroup
}
