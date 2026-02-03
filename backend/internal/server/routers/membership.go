package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func MembershipRoutes(apiGroup fiber.Router, routeParams types.RouteParams, fileService services.FileServiceInterface) fiber.Router {
	membershipService := services.NewMembershipService(routeParams.ServiceParams.Repository, fileService)
	membershipController := controllers.NewMembershipController(membershipService, routeParams.Validator)

	// /api/v1/memberships
	membershipGroup := apiGroup.Group("/memberships")
	membershipGroup.Post("", membershipController.AddMember)

	// /api/v1/trips/:tripID/memberships
	tripMembershipGroup := apiGroup.Group("/trips/:tripID/memberships")
	tripMembershipGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripMembershipGroup.Get("", membershipController.GetTripMembers)
	tripMembershipGroup.Post("/:userID/promote", membershipController.PromoteToAdmin)
	tripMembershipGroup.Post("/:userID/demote", membershipController.DemoteFromAdmin)

	// /api/v1/trips/:tripID/memberships/:userID
	tripMembershipIDGroup := tripMembershipGroup.Group("/:userID")
	tripMembershipIDGroup.Get("", membershipController.GetLatestMembership)
	tripMembershipIDGroup.Patch("", membershipController.UpdateMembership)
	tripMembershipIDGroup.Delete("", membershipController.RemoveMember)

	return membershipGroup
}
