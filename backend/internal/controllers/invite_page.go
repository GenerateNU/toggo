package controllers

import (
	"net/http"
	"toggo/internal/services"
	"toggo/internal/templates"

	"github.com/gofiber/fiber/v2"
)

type InvitePageController struct {
	invitePageService services.InvitePageServiceInterface
}

func NewInvitePageController(invitePageService services.InvitePageServiceInterface) *InvitePageController {
	return &InvitePageController{
		invitePageService: invitePageService,
	}
}

// JoinPage handles GET /join
// If ?code= is present, fetches trip data and renders the invite page.
// If no code, renders the "enter code" form.
func (ctrl *InvitePageController) JoinPage(c *fiber.Ctx) error {
	code := c.Query("code")

	if code == "" {
		return ctrl.renderEnterCodePage(c)
	}

	return ctrl.renderTripInvitePage(c, code)
}

func (ctrl *InvitePageController) renderEnterCodePage(c *fiber.Ctx) error {
	view := templates.JoinEnterCodeView{
		AppName:         "Toggo",
		PageTitle:       "Join a Trip — Toggo",
		MetaDescription: "Enter your invite code to join a trip on Toggo.",
		CanonicalURL:    "",
	}

	html, err := templates.RenderJoinEnterCodePage(view)
	if err != nil {
		return c.Status(http.StatusInternalServerError).SendString("Failed to render page")
	}

	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.Status(http.StatusOK).Send(html)
}

func (ctrl *InvitePageController) renderTripInvitePage(c *fiber.Ctx, code string) error {
	data, err := ctrl.invitePageService.GetTripInvitePageData(c.Context(), code)
	if err != nil {
		return c.Status(http.StatusInternalServerError).SendString("Something went wrong")
	}

	metaDesc := "You've been invited to join a trip on Toggo!"
	metaImage := ""
	if data.TripName != "" {
		if data.InviterName != "" {
			metaDesc = data.InviterName + " has invited you to join " + data.TripName + " on Toggo!"
		} else {
			metaDesc = "You've been invited to join " + data.TripName + " on Toggo!"
		}
	}
	if data.CoverImageURL != nil {
		metaImage = *data.CoverImageURL
	}

	view := templates.TripInviteView{
		AppName:         "Toggo",
		PageTitle:       "Join " + data.TripName + " — Toggo",
		MetaDescription: metaDesc,
		MetaImage:       metaImage,
		CanonicalURL:    data.CanonicalURL,
		Data:            data,
	}

	html, err := templates.RenderTripInvitePage(view)
	if err != nil {
		return c.Status(http.StatusInternalServerError).SendString("Failed to render page")
	}

	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.Status(http.StatusOK).Send(html)
}
