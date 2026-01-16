package example

import (
	"time"
	"toggo/internal/models"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

func UserWorkflow(
	ctx workflow.Context,
	input UserWorkflowInput,
) error {

	logger := workflow.GetLogger(ctx)
	activities := &UserActivities{}

	// Helper to execute activity with retry and capture result
	executeActivity := func(ctx workflow.Context, act interface{}, result interface{}, args ...interface{}) error {
		return workflow.ExecuteActivity(ctx, act, args...).Get(ctx, result)
	}

	// create user
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
	if err := executeActivity(createCtx, activities.CreateUser, &created, input.User); err != nil {
		logger.Error("CreateUser failed", "error", err)
		return err
	}
	logger.Info("User created", "userID", created.ID)

	// update user
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
	if err := executeActivity(updateCtx, activities.UpdateUser, &updated, created.ID, input.UpdateReq); err != nil {
		logger.Error("UpdateUser failed", "error", err)
		return err
	}
	logger.Info("User updated", "userID", updated.ID)

	// delete
	deleteCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    500 * time.Millisecond,
			BackoffCoefficient: 2.0,
			MaximumInterval:    15 * time.Second,
			MaximumAttempts:    5,
		},
	})

	if err := executeActivity(deleteCtx, activities.DeleteUser, nil, updated.ID); err != nil {
		logger.Error("DeleteUser failed", "error", err)
		return err
	}
	logger.Info("User deleted", "userID", updated.ID)

	return nil
}
