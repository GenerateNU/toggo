package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func ActivityRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	// Create category service first (needed by activity service)
	categoryService := services.NewCategoryService(routeParams.ServiceParams.Repository)
	
	// Create activity service
	activityService := services.NewActivityService(
		routeParams.ServiceParams.Repository,
		routeParams.ServiceParams.FileService,
		categoryService,
	)
	activityController := controllers.NewActivityController(activityService, routeParams.Validator)

	// /api/v1/trips/:tripID/activities
	tripActivityGroup := apiGroup.Group("/trips/:tripID/activities")
	tripActivityGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripActivityGroup.Post("", activityController.CreateActivity)
	tripActivityGroup.Get("", activityController.GetActivitiesByTripID)

	// /api/v1/trips/:tripID/activities/:activityID
	tripActivityIDGroup := tripActivityGroup.Group("/:activityID")
	tripActivityIDGroup.Get("", activityController.GetActivity)
	tripActivityIDGroup.Patch("", activityController.UpdateActivity)
	tripActivityIDGroup.Delete("", activityController.DeleteActivity)

	// /api/v1/trips/:tripID/activities/:activityID/categories
	activityCategoryGroup := tripActivityIDGroup.Group("/categories")
	activityCategoryGroup.Get("", activityController.GetActivityCategories)

	// /api/v1/trips/:tripID/activities/:activityID/categories/:categoryName
	activityCategoryGroup.Patch("/:categoryName", activityController.AddCategoryToActivity)
	activityCategoryGroup.Delete("/:categoryName", activityController.RemoveCategoryFromActivity)

	return tripActivityGroup
}