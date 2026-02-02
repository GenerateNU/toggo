package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type MembershipController struct {
	membershipService services.MembershipServiceInterface
	validator         *validator.Validate
}

func NewMembershipController(membershipService services.MembershipServiceInterface, validator *validator.Validate) *MembershipController {
	return &MembershipController{
		membershipService: membershipService,
		validator:         validator,
	}
}

// @Summary      Add member to trip
// @Description  Adds a user as a member of a trip
// @Tags         memberships
// @Accept       json
// @Produce      json
// @Param        request body models.CreateMembershipRequest true "Create membership request"
// @Success      201 {object} models.Membership
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/memberships [post]
// @ID           addMember
func (ctrl *MembershipController) AddMember(c *fiber.Ctx) error {
	var req models.CreateMembershipRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	membership, err := ctrl.membershipService.AddMember(c.Context(), req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(membership)
}

// @Summary      Get trip members
// @Description  Retrieves all members of a trip
// @Tags         memberships
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Success      200 {object} models.GetTripMembersResponse
// @Failure      400 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/members [get]
// @ID           getTripMembers
func (ctrl *MembershipController) GetTripMembers(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	members, err := ctrl.membershipService.GetTripMembers(c.Context(), tripID)
	if err != nil {
		return err
	}

	// Return structured response
	response := models.GetTripMembersResponse{
		Data: members,
	}

	return c.Status(http.StatusOK).JSON(response)
}

// @Summary      Get user's trips
// @Description  Retrieves all trips a user is a member of
// @Tags         memberships
// @Produce      json
// @Param        userID path string true "User ID"
// @Success      200 {array} models.Membership
// @Failure      400 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/{userID}/trips [get]
// @ID           getUserTrips
func (ctrl *MembershipController) GetUserTrips(c *fiber.Ctx) error {
	userID, err := validators.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	trips, err := ctrl.membershipService.GetUserTrips(c.Context(), userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(trips)
}

// @Summary      Get membership
// @Description  Retrieves the membership for a user in a trip
// @Tags         memberships
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        userID path string true "User ID"
// @Success      200 {object} models.Membership
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/members/{userID} [get]
// @ID           getMembership
func (ctrl *MembershipController) GetLatestMembership(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	membership, err := ctrl.membershipService.GetMembership(c.Context(), tripID, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(membership)
}

// @Summary      Update membership
// @Description  Updates a membership
// @Tags         memberships
// @Accept       json
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Param        userID path string true "User ID"
// @Param        request body models.UpdateMembershipRequest true "Update membership request"
// @Success      200 {object} models.Membership
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/members/{userID} [patch]
// @ID           updateMembership
func (ctrl *MembershipController) UpdateMembership(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var req models.UpdateMembershipRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	membership, err := ctrl.membershipService.UpdateMembership(c.Context(), userID, tripID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(membership)
}

// @Summary      Remove member from trip
// @Description  Removes a user from a trip
// @Tags         memberships
// @Param        tripID path string true "Trip ID"
// @Param        userID path string true "User ID"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/members/{userID} [delete]
// @ID           removeMember
func (ctrl *MembershipController) RemoveMember(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := ctrl.membershipService.RemoveMember(c.Context(), tripID, userID); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Promote member to admin
// @Description  Promotes a member to admin role
// @Tags         memberships
// @Param        tripID path string true "Trip ID"
// @Param        userID path string true "User ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/members/{userID}/promote [post]
// @ID           promoteToAdmin
func (ctrl *MembershipController) PromoteToAdmin(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := ctrl.membershipService.PromoteToAdmin(c.Context(), tripID, userID); err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Member promoted to admin successfully",
	})
}

// @Summary      Demote admin to member
// @Description  Demotes an admin to regular member role
// @Tags         memberships
// @Param        tripID path string true "Trip ID"
// @Param        userID path string true "User ID"
// @Success      200 {object} map[string]string
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/members/{userID}/demote [post]
// @ID           demoteFromAdmin
func (ctrl *MembershipController) DemoteFromAdmin(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := ctrl.membershipService.DemoteFromAdmin(c.Context(), tripID, userID); err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Admin demoted to member successfully",
	})
}
