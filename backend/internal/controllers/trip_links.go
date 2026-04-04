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

type PitchLinkController struct {
	linkService services.PitchLinkServiceInterface
	validator   *validator.Validate
}

func NewPitchLinkController(linkService services.PitchLinkServiceInterface, validator *validator.Validate) *PitchLinkController {
	return &PitchLinkController{
		linkService: linkService,
		validator:   validator,
	}
}

func (ctrl *PitchLinkController) AddLink(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	pitchID, err := validators.ValidateID(c.Params("pitchID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userID, err := validators.ValidateID(c.Locals("userID").(string))
	if err != nil {
		return errs.Unauthorized()
	}

	var req models.CreatePitchLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := validators.Validate(ctrl.validator, req); err != nil {
		return err
	}

	link, err := ctrl.linkService.AddLink(c.Context(), tripID, pitchID, userID, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(link)
}

func (ctrl *PitchLinkController) GetLinks(c *fiber.Ctx) error {
	pitchID, err := validators.ValidateID(c.Params("pitchID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	links, err := ctrl.linkService.GetLinks(c.Context(), pitchID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(models.PitchLinksResponse{Items: links})
}

func (ctrl *PitchLinkController) DeleteLink(c *fiber.Ctx) error {
	pitchID, err := validators.ValidateID(c.Params("pitchID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	linkID, err := validators.ValidateID(c.Params("linkID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := ctrl.linkService.DeleteLink(c.Context(), pitchID, linkID); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}
