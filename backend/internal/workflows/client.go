package workflows

import (
	"fmt"
	"toggo/internal/config"

	"go.temporal.io/sdk/client"
)

func NewTemporalClient(config *config.Configuration) (client.Client, error) {
	c, err := client.Dial(client.Options{
		HostPort: fmt.Sprint(config.Temporal.Host, ":", config.Temporal.Port),
	})
	if err != nil {
		return nil, fmt.Errorf("unable to connect to Temporal: %w", err)
	}
	return c, nil
}
