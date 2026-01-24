package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/utilities"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type UserController struct {
	userService services.UserServiceInterface
	validator   *validator.Validate
}

func NewUserController(userService services.UserServiceInterface, validator *validator.Validate) *UserController {
	return &UserController{
		userService: userService,
		validator:   validator,
	}
}

// @Summary      Create a new user
// @Description  Creates a new user with the provided payload
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        request body models.CreateUserRequest true "Create user request"
// @Success      201 {object} models.User
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users [post]
// @ID 			createUser
func (u *UserController) CreateUser(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := utilities.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	var req models.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := utilities.Validate(u.validator, req); err != nil {
		return err
	}

	user, err := u.userService.CreateUser(c.Context(), req, userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(user)
}

// @Summary      Update a user
// @Description  Updates an existing user by ID
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        userID path string true "User ID"
// @Param        request body models.UpdateUserRequest true "Update user request"
// @Success      200 {object} models.User
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/{userID} [patch]
// @ID 			updateUser
func (u *UserController) UpdateUser(c *fiber.Ctx) error {
	var req models.UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	id, err := utilities.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := utilities.Validate(u.validator, req); err != nil {
		return err
	}

	updatedUser, err := u.userService.UpdateUser(c.Context(), id, req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(updatedUser)
}

// @Summary      Get current user
// @Description  Retrieves the authenticated user (from JWT claims)
// @Tags         users
// @Produce      json
// @Success      200 {object} models.User
// @Failure      401 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/me [get]
// @ID 		getCurrentUser
func (u *UserController) GetMe(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return errs.Unauthorized()
	}

	userID, err := utilities.ValidateID(userIDStr)
	if err != nil {
		return errs.Unauthorized()
	}

	user, err := u.userService.GetUser(c.Context(), userID)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(user)
}

// @Summary      Get a user
// @Description  Retrieves a user by ID
// @Tags         users
// @Produce      json
// @Param        userID path string true "User ID"
// @Success      200 {object} models.User
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/{userID} [get]
// @ID 			getUser
func (u *UserController) GetUser(c *fiber.Ctx) error {
	id, err := utilities.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	user, err := u.userService.GetUser(c.Context(), id)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(user)
}

// @Summary      Delete a user
// @Description  Deletes a user by ID
// @Tags         users
// @Param        userID path string true "User ID"
// @Success      204 "No Content"
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/{userID} [delete]
// @ID 			deleteUser
func (u *UserController) DeleteUser(c *fiber.Ctx) error {
	id, err := utilities.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	if err := u.userService.DeleteUser(c.Context(), id); err != nil {
		return err
	}

	return c.SendStatus(http.StatusNoContent)
}

// @Summary      Update user device token
// @Description  Updates the device token for push notifications
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        userID path string true "User ID"
// @Param        request body models.UpdateDeviceTokenRequest true "Update device token request"
// @Success      200 {object} models.User
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/users/{userID}/device-token [patch]
// @ID 			updateDeviceToken
func (u *UserController) UpdateDeviceToken(c *fiber.Ctx) error {
	id, err := utilities.ValidateID(c.Params("userID"))
	if err != nil {
		return errs.InvalidUUID()
	}

	var req models.UpdateDeviceTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := utilities.Validate(u.validator, req); err != nil {
		return err
	}

	user, err := u.userService.UpdateDeviceToken(c.Context(), id, req.DeviceToken)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(user)
}
