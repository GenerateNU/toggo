package middlewares

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"toggo/internal/config"

	"github.com/gofiber/fiber/v2"
)

func ExpoWebhookVerify(cfg config.ExpoNotificationConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {

		secret := cfg.SecretWebhookKey

		signature := c.Get("expo-signature")

		body := make([]byte, len(c.Body()))
		copy(body, c.Body())

		mac := hmac.New(sha1.New, []byte(secret))
		mac.Write(body)

		expected := "sha1=" + hex.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(expected), []byte(signature)) {
			fmt.Println("Expected:", expected)
			fmt.Println("Got:", signature)

			return c.Status(401).SendString("Signatures didn't match")
		}

		c.Request().SetBody(body)

		return c.Next()
	}
}
