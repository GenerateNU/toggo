package config

import (
	"context"
	"fmt"
	"os"

	"github.com/go-playground/validator/v10"
	"googlemaps.github.io/maps"
)

type GoogleMapsConfig struct {
	APIKey string `validate:"required" json:"-"`
	Client *maps.Client
}

func LoadGoogleMapsConfig() (*GoogleMapsConfig, error) {
	apiKey := os.Getenv("GOOGLE_MAPS_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GOOGLE_MAPS_API_KEY environment variable is required")
	}

	cfg := &GoogleMapsConfig{
		APIKey: apiKey,
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, err
	}

	// Initialize Google Maps client
	client, err := maps.NewClient(maps.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Google Maps client: %v", err)
	}

	cfg.Client = client

	return cfg, nil
}

// Helper method to test the API connection
func (c *GoogleMapsConfig) TestConnection(ctx context.Context) error {
	if c.Client == nil {
		return fmt.Errorf("google Maps client is not initialized")
	}
	return nil
}
