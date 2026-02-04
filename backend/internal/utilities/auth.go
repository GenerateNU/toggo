package utilities

import (
	"toggo/internal/errs"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// ExtractBearerToken extracts the token from the Authorization header.
func ExtractBearerToken(authHeader string) (string, error) {
	if authHeader == "" {
		return "", errs.Unauthorized()
	}

	parts := len(authHeader)
	if parts < 7 || authHeader[:7] != "Bearer " {
		return "", errs.Unauthorized()
	}

	return authHeader[7:], nil
}

// ParseJWT parses and validates a JWT token.
func ParseJWT(tokenString string, secret []byte) (jwt.MapClaims, error) {
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

// GetUserIDFromClaims extracts the user ID from JWT claims.
func GetUserIDFromClaims(claims jwt.MapClaims) (uuid.UUID, error) {
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
