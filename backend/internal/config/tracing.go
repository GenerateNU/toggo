package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type TracingConfig struct {
	Enabled   bool
	Host      string
	Port      int
	Service   string
	DBSpanTag bool
}

func LoadTracingConfig() (*TracingConfig, error) {
	cfg := &TracingConfig{
		Host:    os.Getenv("DATADOG_AGENT_HOST"),
		Service: os.Getenv("DATADOG_SERVICE"),
	}

	if v := os.Getenv("DATADOG_ENABLED"); v != "" {
		enabled, err := strconv.ParseBool(strings.TrimSpace(v))
		if err != nil {
			return nil, fmt.Errorf("invalid DATADOG_ENABLED: %v", err)
		}
		cfg.Enabled = enabled
	}

	if v := os.Getenv("DATADOG_TRACE_SQL"); v != "" {
		dbSpan, err := strconv.ParseBool(strings.TrimSpace(v))
		if err != nil {
			return nil, fmt.Errorf("invalid DATADOG_TRACE_SQL: %v", err)
		}
		cfg.DBSpanTag = dbSpan
	}

	port := 8126
	if v := os.Getenv("DATADOG_AGENT_PORT"); v != "" {
		p, err := strconv.Atoi(strings.TrimSpace(v))
		if err != nil {
			return nil, fmt.Errorf("invalid DATADOG_AGENT_PORT: %v", err)
		}
		port = p
	}
	cfg.Port = port

	return cfg, nil
}
