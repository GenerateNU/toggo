package middlewares

import (
	"toggo/internal/config"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/favicon"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	fibermiddleware "github.com/oapi-codegen/fiber-middleware"
)

func SetUpMiddlewares(app *fiber.App, config *config.Configuration) {
	setupLoggingMiddleware(app)
	setupCORSMiddleware(app)
	setupStaticMiddlewares(app)
}

func setupLoggingMiddleware(app *fiber.App) {
	app.Use(logger.New(logger.Config{
		Format:     "${time} | ${status} | ${method} | ${path} | ${latency}\n",
		TimeFormat: "02-Jan-2006 15:04:05",
		TimeZone:   "Local",
	}))
}

func setupCORSMiddleware(app *fiber.App) {
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))
}

func setupStaticMiddlewares(app *fiber.App) {
	app.Use(favicon.New())
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	app.Use(helmet.New())
	app.Use(limiter.New())
}

func setupOpenAPIValidation(app *fiber.App) {
	openapi, err := openapi3.NewLoader().LoadFromFile("./openapi.yaml")
	if err != nil {
		panic(err)
	}
	app.Use(fibermiddleware.OapiRequestValidator(openapi))
}
