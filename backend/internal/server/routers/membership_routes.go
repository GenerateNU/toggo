package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func MembershipRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	membershipService := services.NewMembershipService(routeParams.ServiceParams.Repository)
	membershipController := controllers.NewMembershipController(membershipService, routeParams.Validator)

	// /api/v1/memberships
	membershipGroup := apiGroup.Group("/memberships")
	membershipGroup.Post("", membershipController.AddMember)

	// /api/v1/trips/:tripID/members
	tripGroup := apiGroup.Group("/trips/:tripID/members")
	tripGroup.Get("", membershipController.GetTripMembers)
	tripGroup.Post("/:userID/promote", membershipController.PromoteToAdmin)
	tripGroup.Post("/:userID/demote", membershipController.DemoteFromAdmin)

	// /api/v1/trips/:tripID/members/:userID
	tripMemberIDGroup := tripGroup.Group("/:userID")
	tripMemberIDGroup.Get("", membershipController.GetLatestMembership)
	tripMemberIDGroup.Delete("", membershipController.RemoveMember)

	// /api/v1/trips/:tripID/members/:userID/versions/:version
	tripMemberIDGroup.Patch("", membershipController.UpdateMembership)

	// /api/v1/users/:userID/trips
	userGroup := apiGroup.Group("/users/:userID")
	userGroup.Get("/trips", membershipController.GetUserTrips)

	return membershipGroup
}