package config

import (
	"fmt"
	"os"
	"strconv"
)

type RedisConfig struct {
	Address  string
	Password string
	DB       int
}

func LoadRedisConfig() (*RedisConfig, error) {
	address := os.Getenv("REDIS_ADDRESS")
	if address == "" {
		address = "localhost:6379"
	}

	password := os.Getenv("REDIS_PASSWORD")

	dbStr := os.Getenv("REDIS_DB")
	db := 0
	if dbStr != "" {
		parsedDB, err := strconv.Atoi(dbStr)
		if err != nil {
			return nil, fmt.Errorf("invalid REDIS_DB value: %w", err)
		}
		if parsedDB < 0 {
			return nil, fmt.Errorf("REDIS_DB must be non-negative, got: %d", parsedDB)
		}
		db = parsedDB
	}

	return &RedisConfig{
		Address:  address,
		Password: password,
		DB:       db,
	}, nil
}
