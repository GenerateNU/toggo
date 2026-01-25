package middlewares

import (
	"toggo/internal/config"

	"github.com/gofiber/fiber/v2"
	fibertrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gofiber/fiber.v2"
)

func TracingMiddleware(cfg *config.TracingConfig) fiber.Handler {
	if !cfg.Enabled {
		return func(c *fiber.Ctx) error {
			return c.Next()
		}
	}

	return fibertrace.Middleware(
		fibertrace.WithServiceName("toggo-api"),
	)
}
