package config

import "os"

type Configuration struct {
	App         AppConfig
	Database    DatabaseConfig
	Auth        AuthConfig
	Environment string
}

func LoadConfiguration() (*Configuration, error) {
	appConfig, err := LoadAppConfig()
	if err != nil {
		return nil, err
	}

	databaseConfig, err := LoadDatabaseConfig()
	if err != nil {
		return nil, err
	}

	authConfig, err := LoadAuthConfig()
	if err != nil {
		return nil, err
	}

	return &Configuration{
		App:         *appConfig,
		Database:    *databaseConfig,
		Auth:        *authConfig,
		Environment: os.Getenv("APP_ENVIRONMENT"),
	}, nil
}
