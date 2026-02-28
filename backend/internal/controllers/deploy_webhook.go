package controllers

import (
	"toggo/internal/config"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type ExpoDeployWebhookController struct {
	validator          *validator.Validate
	expoDeployNotifier services.SlackNotifierInterface
	cfg                config.ExpoNotificationConfig
}

func NewExpoDeployWebhookController(
	validator *validator.Validate,
	notifier services.SlackNotifierInterface,
	cfg config.ExpoNotificationConfig,
) *ExpoDeployWebhookController {

	return &ExpoDeployWebhookController{
		validator:          validator,
		expoDeployNotifier: notifier,
		cfg:                cfg,
	}
}

func (c *ExpoDeployWebhookController) HandleBuildWebhook(ctx *fiber.Ctx) error {

	var payload models.ExpoBuildWebhook

	if err := ctx.BodyParser(&payload); err != nil {
		return ctx.Status(fiber.StatusBadRequest).SendString("invalid request body")
	}

	if err := c.validator.Struct(payload); err != nil {
		return ctx.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := c.expoDeployNotifier.NotifyBuild(
		ctx.Context(),
		payload,
		c.cfg.SlackChannelID,
	); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).SendString("failed to send notification")
	}

	return ctx.SendStatus(fiber.StatusOK)
}

func (c *ExpoDeployWebhookController) HandleSubmissionWebhook(ctx *fiber.Ctx) error {

	var payload models.ExpoSubmissionWebhook

	if err := ctx.BodyParser(&payload); err != nil {
		return ctx.Status(fiber.StatusBadRequest).SendString("invalid request body")
	}

	if err := c.validator.Struct(payload); err != nil {
		return ctx.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if err := c.expoDeployNotifier.NotifySubmission(
		ctx.Context(),
		payload,
		c.cfg.SlackChannelID,
	); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).SendString("failed to send notification")
	}

	return ctx.SendStatus(fiber.StatusOK)
}
