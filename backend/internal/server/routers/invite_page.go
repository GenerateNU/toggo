package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/services"
	"toggo/internal/templates"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

// relaxCOEP overrides helmet's default require-corp policy for server-rendered
// HTML pages that load cross-origin resources (Tailwind CDN, S3 presigned images).
func relaxCOEP(c *fiber.Ctx) error {
	c.Set("Cross-Origin-Embedder-Policy", "credentialless")
	c.Set("Cross-Origin-Resource-Policy", "cross-origin")
	return c.Next()
}

func InvitePageRoutes(app *fiber.App, routeParams types.RouteParams) {
	invitePageService := services.NewInvitePageService(
		routeParams.ServiceParams.Repository,
		routeParams.ServiceParams.FileService,
		routeParams.ServiceParams.Config.App,
	)
	invitePageController := controllers.NewInvitePageController(invitePageService)
	wellKnownController := controllers.NewWellKnownController(routeParams.ServiceParams.Config.App)

	// GET /invite/:code — universal link landing page (iOS intercepts if app is installed)
	app.Get("/invite/:code", relaxCOEP, invitePageController.InvitePage)

	// GET /join — legacy invite link, kept for backwards compatibility
	app.Get("/join", relaxCOEP, invitePageController.JoinPage)

	// GET /.well-known/* — required for iOS universal links validation
	app.Get("/.well-known/apple-app-site-association", wellKnownController.AppleAppSiteAssociation)

	// GET /static/* — embedded assets for server-rendered pages (logo, favicon, etc.)
	app.Get("/static/*", relaxCOEP, templates.ServeStatic())
}
