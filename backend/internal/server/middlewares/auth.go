package middlewares

import (
	"strings"
	"toggo/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func AuthRequired(cfg *config.Configuration) fiber.Handler {
	secret := []byte(cfg.Auth.JWTSecretKey)

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return unauthorized(c, "missing authorization header")
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return unauthorized(c, "invalid authorization format")
		}

		tokenString := parts[1]

		// Parse the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			return unauthorized(c, "invalid or expired token")
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return unauthorized(c, "invalid token claims")
		}

		userIDRaw, ok := claims["sub"]
		if !ok {
			return unauthorized(c, "missing user ID in token")
		}

		userIDStr, ok := userIDRaw.(string)
		if !ok || userIDStr == "" {
			return unauthorized(c, "invalid user ID in token")
		}

		// Validate UUID
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			return unauthorized(c, "user ID is not a valid UUID")
		}

		// Forward valid UUID as string
		c.Locals("userID", userID.String())

		return c.Next()
	}
}

func unauthorized(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": message,
	})
}
