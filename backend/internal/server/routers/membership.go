package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func MembershipRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	membershipService := services.NewMembershipService(routeParams.ServiceParams.Repository, routeParams.ServiceParams.Config)
	membershipController := controllers.NewMembershipController(membershipService, routeParams.Validator)

	// /api/v1/memberships
	membershipGroup := apiGroup.Group("/memberships")
	membershipGroup.Post("", membershipController.AddMember)

	// /api/v1/trips/:tripID/memberships
	tripMembershipGroup := apiGroup.Group("/trips/:tripID/memberships")
	tripMembershipGroup.Get("", membershipController.GetTripMembers)
	tripMembershipGroup.Post("/:userID/promote", membershipController.PromoteToAdmin)
	tripMembershipGroup.Post("/:userID/demote", membershipController.DemoteFromAdmin)

	// /api/v1/trips/:tripID/memberships/:userID
	tripMembershipIDGroup := tripMembershipGroup.Group("/:userID")
	tripMembershipIDGroup.Get("", membershipController.GetLatestMembership)
	tripMembershipIDGroup.Patch("", membershipController.UpdateMembership)
	tripMembershipIDGroup.Delete("", membershipController.RemoveMember)

	// /api/v1/users/:userID/trips
	userGroup := apiGroup.Group("/users/:userID")
	userGroup.Get("/trips", membershipController.GetUserTrips)

	return membershipGroup
}
