package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func CategoryRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	categoryService := services.NewCategoryService(routeParams.ServiceParams.Repository, routeParams.ServiceParams.EventPublisher)
	categoryController := controllers.NewCategoryController(categoryService, routeParams.Validator)

	// /api/v1/trips/:tripID/categories
	tripCategoryGroup := apiGroup.Group("/trips/:tripID/categories")
	tripCategoryGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripCategoryGroup.Get("", categoryController.GetCategoriesByTripID)
	tripCategoryGroup.Post("", categoryController.CreateCategory)
	tripCategoryGroup.Delete("/:name", categoryController.DeleteCategory)
	tripCategoryGroup.Put("/:name/hide", categoryController.HideCategory)
	tripCategoryGroup.Put("/:name/show", categoryController.ShowCategory)

	// /api/v1/trips/:tripID/tabs
	tripTabGroup := apiGroup.Group("/trips/:tripID/tabs")
	tripTabGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripTabGroup.Get("", categoryController.GetTabs)
	tripTabGroup.Put("/reorder", categoryController.ReorderTabs)

	return tripCategoryGroup
}
