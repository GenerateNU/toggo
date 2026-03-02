package config

import (
	"os"
)

type ExpoNotificationConfig struct {
	SlackToken       string
	SlackChannelID   string
	SecretWebhookKey string
}

func LoadExpoNotificationConfig() (*ExpoNotificationConfig, error) {
	return &ExpoNotificationConfig{
		SlackToken:       os.Getenv("SLACK_BOT_TOKEN"),
		SlackChannelID:   os.Getenv("SLACK_CHANNEL_ID"),
		SecretWebhookKey: os.Getenv("SECRET_WEBHOOK_KEY"),
	}, nil
}
