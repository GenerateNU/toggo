package workflows

import (
	"crypto/tls"
	"fmt"
	"toggo/internal/config"

	"go.temporal.io/sdk/client"
)

func NewTemporalClient(config *config.Configuration) (client.Client, error) {
	clientOptions := client.Options{
		HostPort: fmt.Sprintf("%s:%d", config.Temporal.Host, config.Temporal.Port),
	}

	if config.Environment == "prod" {
		clientOptions.Namespace = config.Temporal.Namespace
		clientOptions.ConnectionOptions = client.ConnectionOptions{TLS: &tls.Config{}}
		clientOptions.Credentials = client.NewAPIKeyStaticCredentials(config.Temporal.APIKey)
	}

	c, err := client.Dial(clientOptions)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to Temporal: %w", err)
	}
	return c, nil
}
