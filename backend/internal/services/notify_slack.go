package services

import (
	"context"
	"fmt"

	"toggo/internal/models"

	"github.com/slack-go/slack"
)

type SlackNotifier struct {
	client *slack.Client
}

type SlackNotifierInterface interface {
	NotifyBuild(ctx context.Context, build models.ExpoBuildWebhook, channelID string) error
	NotifySubmission(ctx context.Context, sub models.ExpoSubmissionWebhook, channelID string) error
}

var _ SlackNotifierInterface = (*SlackNotifier)(nil)

func NewSlackNotifier(token string) *SlackNotifier {
	return &SlackNotifier{
		client: slack.New(token),
	}
}

func (s *SlackNotifier) NotifyBuild(
	ctx context.Context,
	build models.ExpoBuildWebhook,
	channelID string,
) error {
	appName := "Unknown"
	appVersion := "Unknown"

	if build.Metadata != nil {
		if build.Metadata.AppName != "" {
			appName = build.Metadata.AppName
		}
		if build.Metadata.AppVersion != "" {
			appVersion = build.Metadata.AppVersion
		}
	}

	blocks := []slack.Block{
		slack.NewSectionBlock(
			slack.NewTextBlockObject(
				"mrkdwn",
				fmt.Sprintf(
					"🚧 *Build %s*\n*App:* %s\n*Version:* %s\n*Platform:* %s\n*Project:* %s",
					build.Status,
					appName,
					appVersion,
					build.Platform,
					build.ProjectName,
				),
				false,
				false,
			),
			nil,
			nil,
		),
	}

	if build.Error != nil {
		blocks = append(blocks,
			slack.NewSectionBlock(
				slack.NewTextBlockObject(
					"mrkdwn",
					fmt.Sprintf(
						"*Error:* %s\n*Code:* %s",
						build.Error.Message,
						build.Error.ErrorCode,
					),
					false,
					false,
				),
				nil,
				nil,
			),
		)
	}

	if build.BuildDetailsPageURL != "" {
		blocks = append(blocks,
			slack.NewSectionBlock(
				slack.NewTextBlockObject(
					"mrkdwn",
					fmt.Sprintf("<%s|View Build Details>", build.BuildDetailsPageURL),
					false,
					false,
				),
				nil,
				nil,
			),
		)
	}

	_, _, err := s.client.PostMessageContext(
		ctx,
		channelID,
		slack.MsgOptionBlocks(blocks...),
	)

	return err
}

func (s *SlackNotifier) NotifySubmission(
	ctx context.Context,
	sub models.ExpoSubmissionWebhook,
	channelID string,
) error {

	blocks := []slack.Block{
		slack.NewSectionBlock(
			slack.NewTextBlockObject(
				"mrkdwn",
				fmt.Sprintf(
					"📦 *Submission %s*\n*Project:* %s\n*Platform:* %s\n*Archive:* %s",
					sub.Status,
					sub.ProjectName,
					sub.Platform,
					sub.ArchiveURL,
				),
				false,
				false,
			),
			nil,
			nil,
		),
	}

	if sub.SubmissionInfo != nil && sub.SubmissionInfo.Error != nil {
		blocks = append(blocks,
			slack.NewSectionBlock(
				slack.NewTextBlockObject(
					"mrkdwn",
					fmt.Sprintf(
						"*Submission Error:* %s\n*Code:* %s",
						sub.SubmissionInfo.Error.Message,
						sub.SubmissionInfo.Error.ErrorCode,
					),
					false,
					false,
				),
				nil,
				nil,
			),
		)
	}

	_, _, err := s.client.PostMessageContext(
		ctx,
		channelID,
		slack.MsgOptionBlocks(blocks...),
	)

	return err
}
