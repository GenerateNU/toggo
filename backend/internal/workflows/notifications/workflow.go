package notifications

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

func ScheduledNotificationWorkflow(
	ctx workflow.Context,
	input ScheduledNotificationInput,
) error {
	logger := workflow.GetLogger(ctx)

	delay := input.TriggerAt.Sub(workflow.Now(ctx))
	if delay > 0 {
		if err := workflow.Sleep(ctx, delay); err != nil {
			return err
		}
	}

	activityCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    5 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    1 * time.Minute,
			MaximumAttempts:    3,
		},
	})

	activities := &NotificationActivities{}
	if err := workflow.ExecuteActivity(activityCtx, activities.DispatchNotification, input).Get(activityCtx, nil); err != nil {
		logger.Error("DispatchNotification failed", "jobType", input.JobType, "error", err)
		return err
	}

	return nil
}
