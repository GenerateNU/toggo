package example

import (
	"time"
	"toggo/internal/models"
	"toggo/internal/repository"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

func UserWorkflow(
	ctx workflow.Context,
	input UserWorkflowInput,
	repository *repository.Repository,
) error {
	logger := workflow.GetLogger(ctx)
	activities := &UserActivities{Repository: repository}

	createCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    1 * time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    30 * time.Second,
			MaximumAttempts:    5,
		},
	})

	var created *models.User
	if err := workflow.ExecuteActivity(createCtx, activities.CreateUser, input.User).Get(createCtx, &created); err != nil {
		logger.Error("CreateUser failed", "error", err)
		return err
	}

	updateCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    500 * time.Millisecond,
			BackoffCoefficient: 1.5,
			MaximumInterval:    20 * time.Second,
			MaximumAttempts:    3,
		},
	})

	var updated *models.User
	if err := workflow.ExecuteActivity(updateCtx, activities.UpdateUser, created.ID, input.UpdateReq).Get(updateCtx, &updated); err != nil {
		logger.Error("UpdateUser failed", "error", err)
		return err
	}

	deleteCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    500 * time.Millisecond,
			BackoffCoefficient: 2.0,
			MaximumInterval:    15 * time.Second,
			MaximumAttempts:    5,
		},
	})

	if err := workflow.ExecuteActivity(deleteCtx, activities.DeleteUser, nil, updated.ID).Get(deleteCtx, nil); err != nil {
		logger.Error("DeleteUser failed", "error", err)
		return err
	}

	return nil
}
