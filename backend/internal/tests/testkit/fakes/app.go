package fakes

import (
	"context"
	_ "embed"
	"fmt"
	"sync"
	"toggo/internal/config"
	"toggo/internal/database"
	"toggo/internal/errs"
	"toggo/internal/repository"
	"toggo/internal/server/middlewares"
	"toggo/internal/server/routers"
	"toggo/internal/types"
	utilities "toggo/internal/validators"

	"github.com/gofiber/fiber/v2"
	"github.com/uptrace/bun"
)

var (
	sharedApp     *fiber.App
	sharedDB      *bun.DB
	sharedCleanup func()
	once          sync.Once
)

func GetSharedTestApp() *fiber.App {
	once.Do(func() {
		ctx := context.Background()
		sharedApp, sharedDB, sharedCleanup = createTestApp(ctx)
	})
	return sharedApp
}

func GetSharedDB() *bun.DB {
	GetSharedTestApp()
	return sharedDB
}

func CleanupSharedTestApp() {
	if sharedCleanup != nil {
		sharedCleanup()
	}
}

func createTestApp(ctx context.Context) (*fiber.App, *bun.DB, func()) {
	cfg := loadConfigOrPanic()

	db := connectAndMigrateDBOrPanic(ctx, cfg)

	app := fiber.New(fiber.Config{
		ServerHeader: "TestApp",
		AppName:      "TestApp API",
		ErrorHandler: errs.ErrorHandler,
	})

	setupRoutesAndMiddlewares(app, cfg, db)

	cleanup := func() {
		_ = db.Close()
	}

	return app, db, cleanup
}

func loadConfigOrPanic() *config.Configuration {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}
	return cfg
}

func connectAndMigrateDBOrPanic(ctx context.Context, cfg *config.Configuration) *bun.DB {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=disable",
		cfg.Database.Username,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.Name,
	)
	db, err := database.NewDB(ctx, dsn)
	if err != nil {
		panic(fmt.Sprintf("failed to connect to database: %v", err))
	}
	if err := db.PingContext(ctx); err != nil {
		panic(fmt.Sprintf("failed to ping database: %v", err))
	}
	if err := database.ApplyGooseMigrations(ctx, cfg.Database.Host, cfg.Database.Port, cfg.Database.Username, cfg.Database.Password, cfg.Database.Name); err != nil {
		panic(fmt.Sprintf("failed to migrate test DB: %v", err))
	}
	return db
}

func setupRoutesAndMiddlewares(app *fiber.App, cfg *config.Configuration, db *bun.DB) {
	routeParams := types.RouteParams{
		Validator: utilities.NewValidator(),
		ServiceParams: &types.ServiceParams{
			Repository: repository.NewRepository(db),
			Config:     cfg,
		},
	}
	middlewares.SetUpMiddlewares(app, cfg)
	routers.SetUpRoutes(app, routeParams, middlewares.AuthRequired(cfg))
}
