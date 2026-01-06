package example

import (
	"context"
	"fmt"
	"log"

	"go.temporal.io/sdk/client"
)

func StartUserWorkflow(
	c client.Client,
	input UserWorkflowInput,
) (*client.WorkflowRun, error) {

	workflowOptions := client.StartWorkflowOptions{
		TaskQueue: UserExampleTaskQueueName,
		ID:        fmt.Sprintf("example-user-workflow-%d", input.User.ID),
	}

	we, err := c.ExecuteWorkflow(context.Background(), workflowOptions, UserWorkflow, input)
	if err != nil {
		return nil, err
	}

	log.Println("Started UserWorkflow", "WorkflowID", we.GetID(), "RunID", we.GetRunID())
	return &we, nil
}
