package middlewares

import (
	"toggo/internal/config"
	"toggo/internal/utilities"

	"github.com/gofiber/fiber/v2"
)

func AuthRequired(cfg *config.Configuration) fiber.Handler {
	secret := []byte(cfg.Auth.JWTSecretKey)

	return func(c *fiber.Ctx) error {
		tokenString, err := utilities.ExtractBearerToken(c.Get("Authorization"))
		if err != nil {
			return err
		}

		claims, err := utilities.ParseJWT(tokenString, secret)
		if err != nil {
			return err
		}

		userID, err := utilities.GetUserIDFromClaims(claims)
		if err != nil {
			return err
		}

		c.Locals("userID", userID.String())
		return c.Next()
	}
}
