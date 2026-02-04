package config

import "os"

type Configuration struct {
	App         AppConfig
	Database    DatabaseConfig
	Auth        AuthConfig
	AWS         AWSConfig
	Temporal    TemporalConfig
	Redis       RedisConfig
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

	awsConfig, err := LoadAWSConfig()
	if err != nil {
		return nil, err
	}

	temporalConfig, err := LoadTemporalConfig()
	if err != nil {
		return nil, err
	}

	redisConfig, err := LoadRedisConfig()
	if err != nil {
		return nil, err
	}

	return &Configuration{
		App:         *appConfig,
		Database:    *databaseConfig,
		Auth:        *authConfig,
		AWS:         *awsConfig,
		Temporal:    *temporalConfig,
		Redis:       *redisConfig,
		Environment: os.Getenv("APP_ENVIRONMENT"),
	}, nil
}
