package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/go-playground/validator/v10"
)

type AppConfig struct {
	Name    string `validate:"required"`
	Version string `validate:"required"`
	Port    int    `validate:"required,gt=0"`
}

func LoadAppConfig() (*AppConfig, error) {
	portStr := os.Getenv("APP_PORT")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid APP_PORT: %v", err)
	}

	cfg := &AppConfig{
		Name:    os.Getenv("APP_NAME"),
		Version: os.Getenv("APP_VERSION"),
		Port:    port,
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}
