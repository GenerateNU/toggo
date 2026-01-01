package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/go-playground/validator/v10"
)

type DatabaseConfig struct {
	Host       string `validate:"required"`
	Port       int    `validate:"required,gt=0"`
	Username   string `validate:"required"`
	Password   string `validate:"required"`
	Name       string `validate:"required"`
	RequireSSL bool
}

func LoadDatabaseConfig() (*DatabaseConfig, error) {
	portStr := os.Getenv("DB_PORT")
	if portStr == "" {
		return nil, fmt.Errorf("DB_PORT is required")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid DB_PORT: %v", err)
	}

	requireSSL := os.Getenv("DB_SSLMODE") == "require"

	cfg := &DatabaseConfig{
		Host:       os.Getenv("DB_HOST"),
		Port:       port,
		Username:   os.Getenv("DB_USER"),
		Password:   os.Getenv("DB_PASSWORD"),
		Name:       os.Getenv("DB_DATABASE"),
		RequireSSL: requireSSL,
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid DatabaseConfig: %w", err)
	}

	return cfg, nil
}

func (c *DatabaseConfig) DSN() string {
	sslMode := "disable"
	if c.RequireSSL {
		sslMode = "require"
	}

	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.Username, c.Password, c.Name, sslMode,
	)
}

func (c *DatabaseConfig) PostgresURI() string {
	sslMode := "disable"
	if c.RequireSSL {
		sslMode = "require"
	}

	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.Username, c.Password, c.Host, c.Port, c.Name, sslMode,
	)
}
