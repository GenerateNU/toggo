package middlewares

import (
	"strings"
	"toggo/internal/config"
	"toggo/internal/errs"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func AuthRequired(cfg *config.Configuration) fiber.Handler {
	secret := []byte("wTbxtBEQd9o0yV4hxFyzucdKLQxxQwulab6UEvkgs1mdKplh519Bujvso2npE0LRmGRRSKc/m6mPwgKjjxj/EA==")

	return func(c *fiber.Ctx) error {
		tokenString, err := extractBearerToken(c.Get("Authorization"))
		if err != nil {
			return err
		}

		claims, err := parseJWT(tokenString, secret)
		if err != nil {
			return err
		}

		userID, err := getUserIDFromClaims(claims)
		if err != nil {
			return err
		}

		c.Locals("userID", userID.String())
		return c.Next()
	}
}

func extractBearerToken(authHeader string) (string, error) {
	if authHeader == "" {
		return "", errs.Unauthorized()
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", errs.Unauthorized()
	}

	return parts[1], nil
}

func parseJWT(tokenString string, secret []byte) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errs.Unauthorized()
		}
		return secret, nil
	})
	if err != nil || !token.Valid {
		return nil, errs.Unauthorized()
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errs.Unauthorized()
	}

	return claims, nil
}

func getUserIDFromClaims(claims jwt.MapClaims) (uuid.UUID, error) {
	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return uuid.Nil, errs.Unauthorized()
	}

	userID, err := uuid.Parse(sub)
	if err != nil {
		return uuid.Nil, errs.Unauthorized()
	}

	return userID, nil
}
