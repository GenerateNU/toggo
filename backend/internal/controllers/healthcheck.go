package controllers

import "github.com/gofiber/fiber/v2"

// @Summary Healthcheck endpoint
// @Description Returns OK if the server is running
// @Tags example
// @Produce json
// @Success 200 {string} string "ok"
// @Router /healthcheck [get]
func HealthcheckHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
	})
}
