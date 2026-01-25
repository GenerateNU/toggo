package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func UserRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	userService := services.NewUserService(routeParams.ServiceParams.Repository)
	userController := controllers.NewUserController(userService, routeParams.Validator)

	// /api/v1/users
	userGroup := apiGroup.Group("/users")
	userGroup.Post("", userController.CreateUser)
	userGroup.Get("/me", userController.GetMe)

	// /api/v1/users/:userID
	userIDGroup := userGroup.Group("/:userID")
	userIDGroup.Get("", userController.GetUser)
	userIDGroup.Patch("", userController.UpdateUser)
	userIDGroup.Delete("", userController.DeleteUser)

	return userGroup
}
