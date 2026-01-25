package tracing

import (
	"context"
	"fmt"
	"log"
	"toggo/internal/config"

	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func InitializeDatadogTracer(cfg *config.Configuration) (func(context.Context) error, error) {
	if !cfg.Tracing.Enabled {
		log.Println("Datadog tracing is disabled")
		return func(ctx context.Context) error { return nil }, nil
	}

	opts := []tracer.StartOption{
		tracer.WithService(cfg.Tracing.Service),
		tracer.WithEnv(cfg.Environment),
		tracer.WithAgentAddr(fmt.Sprintf("%s:%d", "datadog-agent", cfg.Tracing.Port)),
		tracer.WithServiceVersion(cfg.App.Version),
		tracer.WithRuntimeMetrics(),
	}

	tracer.Start(opts...)

	log.Printf("Datadog tracer initialized: service=%s, env=%s, version=%s",
		cfg.Tracing.Service, cfg.Environment, cfg.App.Version)

	return func(ctx context.Context) error {
		tracer.Stop()
		return nil
	}, nil
}

func ShutdownDatadogTracer(ctx context.Context) error {
	tracer.Stop()
	log.Println("Datadog tracer shut down successfully")
	return nil
}
