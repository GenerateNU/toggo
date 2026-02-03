package realtime

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware handles JWT authentication for WebSocket connections.
type AuthMiddleware struct {
	jwtSecret string
}

// NewAuthMiddleware creates a new authentication middleware with the given JWT secret.
func NewAuthMiddleware(jwtSecret string) *AuthMiddleware {
	return &AuthMiddleware{
		jwtSecret: jwtSecret,
	}
}

// ValidateConnection validates the JWT token from the request and returns the user ID.
func (a *AuthMiddleware) ValidateConnection(r *http.Request) (string, error) {
	token := a.extractToken(r)
	if token == "" {
		return "", errors.New("missing authentication token")
	}

	userID, err := a.verifyToken(token)
	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}

	return userID, nil
}

func (a *AuthMiddleware) extractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			return parts[1]
		}
	}

	token := r.URL.Query().Get("token")
	if token != "" {
		return token
	}

	return ""
}

func (a *AuthMiddleware) verifyToken(tokenString string) (string, error) {
	parser := jwt.NewParser(jwt.WithExpirationRequired())
	token, err := parser.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(a.jwtSecret), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if userID, ok := claims["user_id"].(string); ok {
			return userID, nil
		}
		if sub, ok := claims["sub"].(string); ok {
			return sub, nil
		}

		return "", errors.New("user_id not found in token claims")
	}

	return "", errors.New("invalid token claims")
}

// GenerateTestToken creates a JWT token for testing purposes.
func GenerateTestToken(userID string, jwtSecret string, expirationMinutes int) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"sub":     userID,
		"exp":     time.Now().Add(time.Duration(expirationMinutes) * time.Minute).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}
