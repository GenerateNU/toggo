package controllers

import (
	"toggo/internal/config"

	"github.com/gofiber/fiber/v2"
)

type WellKnownController struct {
	appleTeamID string
	iosBundleID string
}

func NewWellKnownController(cfg config.AppConfig) *WellKnownController {
	return &WellKnownController{
		appleTeamID: cfg.AppleTeamID,
		iosBundleID: cfg.IOSBundleID,
	}
}

// AppleAppSiteAssociation handles GET /.well-known/apple-app-site-association
// Required by iOS to validate universal links for this domain.
func (ctrl *WellKnownController) AppleAppSiteAssociation(c *fiber.Ctx) error {
	type detail struct {
		AppIDs     []string            `json:"appIDs"`
		Components []map[string]string `json:"components"`
	}
	type applinks struct {
		Details []detail `json:"details"`
	}
	type aasa struct {
		AppLinks applinks `json:"applinks"`
	}

	resp := aasa{
		AppLinks: applinks{
			Details: []detail{{
				AppIDs: []string{ctrl.appleTeamID + "." + ctrl.iosBundleID},
				Components: []map[string]string{
					{"/": "/invite/*"},
				},
			}},
		},
	}

	c.Set("Content-Type", "application/json")
	return c.JSON(resp)
}
