package templates

import (
	"bytes"
	"embed"
	htmltemplate "html/template"
	"io/fs"
	"path"
	"strings"
	"toggo/internal/models"

	"github.com/gofiber/fiber/v2"
)

//go:embed trip_invite.html join_enter_code.html
var inviteTemplateFS embed.FS

//go:embed static/*
var staticFS embed.FS

// StaticFS returns the embedded static filesystem (subtree "static") for serving assets at /static/*.
func StaticFS() fs.FS {
	sub, _ := fs.Sub(staticFS, "static")
	return sub
}

// staticContentTypes maps file extensions to Content-Type for embedded static files.
var staticContentTypes = map[string]string{
	".svg":   "image/svg+xml",
	".ico":   "image/x-icon",
	".png":   "image/png",
	".jpg":   "image/jpeg",
	".jpeg":  "image/jpeg",
	".webp":  "image/webp",
	".css":   "text/css",
	".woff2": "font/woff2",
	".woff":  "font/woff",
}

// ServeStatic returns a Fiber handler that serves files from the embedded static FS.
// Mount it at "/static" so that /static/toggo_logo.svg serves static/toggo_logo.svg.
func ServeStatic() fiber.Handler {
	root := StaticFS()
	return func(c *fiber.Ctx) error {
		name := strings.TrimPrefix(c.Path(), "/static/")
		if name == "" || strings.Contains(name, "..") {
			return c.Status(fiber.StatusNotFound).SendString("not found")
		}
		name = path.Clean("/" + name)
		name = strings.TrimPrefix(name, "/")
		data, err := fs.ReadFile(root, name)
		if err != nil {
			return c.Status(fiber.StatusNotFound).SendString("not found")
		}
		ext := path.Ext(name)
		if ct := staticContentTypes[ext]; ct != "" {
			c.Set(fiber.HeaderContentType, ct)
		}
		return c.Send(data)
	}
}

var inviteTemplate = htmltemplate.Must(htmltemplate.ParseFS(inviteTemplateFS, "trip_invite.html"))
var joinEnterCodeTemplate = htmltemplate.Must(htmltemplate.ParseFS(inviteTemplateFS, "join_enter_code.html"))

type TripInviteView struct {
	AppName         string
	PageTitle       string
	MetaDescription string
	MetaImage       string
	CanonicalURL    string
	Data            *models.TripInvitePageData
}

func RenderTripInvitePage(view TripInviteView) ([]byte, error) {
	var buf bytes.Buffer
	if err := inviteTemplate.Execute(&buf, view); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// JoinEnterCodeView is the data for the /join page (enter code form).
type JoinEnterCodeView struct {
	AppName         string
	PageTitle       string
	MetaDescription string
	CanonicalURL    string
}

func RenderJoinEnterCodePage(view JoinEnterCodeView) ([]byte, error) {
	var buf bytes.Buffer
	if err := joinEnterCodeTemplate.Execute(&buf, view); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
