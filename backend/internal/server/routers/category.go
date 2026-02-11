package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func CategoryRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	categoryService := services.NewCategoryService(routeParams.ServiceParams.Repository)
	categoryController := controllers.NewCategoryController(categoryService, routeParams.Validator)

	// /api/v1/trips/:tripID/categories
	tripCategoryGroup := apiGroup.Group("/trips/:tripID/categories")
	tripCategoryGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripCategoryGroup.Get("", categoryController.GetCategoriesByTripID)

	return tripCategoryGroup
}