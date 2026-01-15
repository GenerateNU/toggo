package controllers

import (
	"toggo/internal/repository"

	"github.com/gofiber/fiber/v2"
)

// @Summary Healthcheck endpoint
// @Description Returns OK if the server is running and database is healthy
// @Tags example
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /healthcheck [get]
// @ID healthcheck
func HealthcheckHandler(repo repository.HealthRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		dbHealth, err := repo.HealthCheck(c.Context())
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"details": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"status": "ok",
			"db":     dbHealth,
		})
	}
}
