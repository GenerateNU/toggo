package realtime

import (
	"errors"
	"net/http"
	"time"
	"toggo/internal/utilities"

	"github.com/golang-jwt/jwt/v5"
)

// JWTAuth handles JWT authentication for WebSocket connections.
type JWTAuth struct {
	jwtSecret []byte
}

// NewAuthMiddleware creates a new authentication middleware with the given JWT secret.
func NewAuthMiddleware(jwtSecret string) *JWTAuth {
	if jwtSecret == "" {
		panic("jwtSecret cannot be empty")
	}
	return &JWTAuth{
		jwtSecret: []byte(jwtSecret),
	}
}

// ValidateConnection validates the JWT token from the request and returns the user ID.
func (a *JWTAuth) ValidateConnection(r *http.Request) (string, error) {
	token := a.extractToken(r)
	if token == "" {
		return "", errors.New("missing authentication token")
	}

	userID, err := a.verifyToken(token)
	if err != nil {
		return "", err
	}

	return userID, nil
}

func (a *JWTAuth) extractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		tokenString, err := utilities.ExtractBearerToken(authHeader)
		if err == nil {
			return tokenString
		}
	}

	token := r.URL.Query().Get("token")
	if token != "" {
		return token
	}

	return ""
}

func (a *JWTAuth) verifyToken(tokenString string) (string, error) {
	claims, err := utilities.ParseJWT(tokenString, a.jwtSecret)
	if err != nil {
		return "", err
	}

	userID, err := utilities.GetUserIDFromClaims(claims)
	if err != nil {
		return "", err
	}

	return userID.String(), nil
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
