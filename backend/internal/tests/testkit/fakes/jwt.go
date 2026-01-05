package fakes

import (
	"time"

	"toggo/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type GenerateJWTOptions struct {
	UserID        string
	ValidDuration time.Duration
	SecretKey     string
	Expired       bool
}

func GenerateJWT(opts GenerateJWTOptions) string {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		panic("failed to load config: " + err.Error())
	}

	userID := opts.UserID
	if userID == "" {
		userID = uuid.NewString()
	}

	secret := opts.SecretKey
	if secret == "" {
		secret = cfg.Auth.JWTSecretKey
	}

	now := time.Now()
	expiration := now.Add(opts.ValidDuration)
	if opts.Expired {
		expiration = now.Add(-time.Hour)
	}

	claims := jwt.MapClaims{
		"sub": userID,
		"iat": now.Unix(),
		"exp": expiration.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		panic("failed to sign JWT: " + err.Error())
	}
	return signed
}

func GenerateValidJWT(userID string, validDuration time.Duration) string {
	return GenerateJWT(GenerateJWTOptions{
		UserID:        userID,
		ValidDuration: validDuration,
	})
}

func GenerateExpiredJWT() string {
	return GenerateJWT(GenerateJWTOptions{
		Expired: true,
	})
}

func GenerateInvalidJWT(userID string, validDuration time.Duration) string {
	return GenerateJWT(GenerateJWTOptions{
		UserID:        userID,
		ValidDuration: validDuration,
		SecretKey:     "invalid_secret_key",
	})
}
