package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/services"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type CategoryController struct {
	categoryService services.CategoryServiceInterface
	validator       *validator.Validate
}

func NewCategoryController(categoryService services.CategoryServiceInterface, validator *validator.Validate) *CategoryController {
	return &CategoryController{
		categoryService: categoryService,
		validator:       validator,
	}
}

// @Summary      Get categories by trip
// @Description  Retrieves all categories for a trip
// @Tags         categories
// @Produce      json
// @Param        tripID path string true "Trip ID"
// @Success      200 {object} map[string]interface{} "Object with categories array"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/categories [get]
// @ID           getCategoriesByTripID
func (ctrl *CategoryController) GetCategoriesByTripID(c *fiber.Ctx) error {
	tripID, err := validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	userIDStr := c.Locals("userID")
	if userIDStr == nil {
		return errs.Unauthorized()
	}

	userID, err := validators.ValidateID(userIDStr.(string))
	if err != nil {
		return errs.Unauthorized()
	}

	categories, err := ctrl.categoryService.GetCategoriesByTripID(c.Context(), tripID, userID)
	if err != nil {
		return err
	}

	// Wrap in object for consistency
	return c.Status(http.StatusOK).JSON(fiber.Map{
		"categories": categories,
	})
}