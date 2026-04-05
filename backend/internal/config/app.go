package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/go-playground/validator/v10"
)

type AppConfig struct {
	Name            string `validate:"required"`
	Version         string `validate:"required"`
	Port            int    `validate:"required,gt=0"`
	PublicURL       string
	DeepLinkBaseURL string
	AppleTeamID     string
	IOSBundleID     string
}

func LoadAppConfig() (*AppConfig, error) {
	portStr := os.Getenv("APP_PORT")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid APP_PORT: %v", err)
	}

	cfg := &AppConfig{
		Name:            os.Getenv("APP_NAME"),
		Version:         os.Getenv("APP_VERSION"),
		Port:            port,
		PublicURL:       os.Getenv("APP_PUBLIC_URL"),
		DeepLinkBaseURL: os.Getenv("DEEPLINK_BASE_URL"),
		AppleTeamID:     os.Getenv("APPLE_TEAM_ID"),
		IOSBundleID:     os.Getenv("IOS_BUNDLE_ID"),
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}
