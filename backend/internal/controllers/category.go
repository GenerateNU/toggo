package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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
// @Success      200 {object} models.CategoryListResponse
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

	includeHidden := c.QueryBool("include_hidden", false)

	categories, err := ctrl.categoryService.GetCategoriesByTripID(c.Context(), tripID, userID, includeHidden)
	if err != nil {
		return err
	}

	// Return typed response
	return c.Status(http.StatusOK).JSON(models.CategoryListResponse{
		Categories: categories,
	})
}

// @Summary      Hide category
// @Description  Hides a category from all members (admin only)
// @Tags         categories
// @Param        tripID path string true "Trip ID"
// @Param        name path string true "Category name"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/categories/{name}/hide [put]
// @ID           hideCategory
func (ctrl *CategoryController) HideCategory(c *fiber.Ctx) error {
	tripID, userID, err := ctrl.parseTripAndUserIDs(c)
	if err != nil {
		return err
	}

	name := c.Params("name")
	if name == "" {
		return errs.BadRequest(nil)
	}

	if err := ctrl.categoryService.SetCategoryVisibility(c.Context(), tripID, userID, name, true); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Show category
// @Description  Makes a previously hidden category visible again (admin only)
// @Tags         categories
// @Param        tripID path string true "Trip ID"
// @Param        name path string true "Category name"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      401 {object} errs.APIError
// @Failure      403 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/trips/{tripID}/categories/{name}/show [put]
// @ID           showCategory
func (ctrl *CategoryController) ShowCategory(c *fiber.Ctx) error {
	tripID, userID, err := ctrl.parseTripAndUserIDs(c)
	if err != nil {
		return err
	}

	name := c.Params("name")
	if name == "" {
		return errs.BadRequest(nil)
	}

	if err := ctrl.categoryService.SetCategoryVisibility(c.Context(), tripID, userID, name, false); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

func (ctrl *CategoryController) parseTripAndUserIDs(c *fiber.Ctx) (tripID, userID uuid.UUID, err error) {
	tripID, err = validators.ValidateID(c.Params("tripID"))
	if err != nil {
		return tripID, userID, errs.InvalidUUID()
	}

	userID, err = validators.ExtractUserID(c)
	if err != nil {
		return tripID, userID, err
	}

	return tripID, userID, nil
}
