package example

import (
	"toggo/internal/models"
)

const UserExampleTaskQueueName = "EXAMPLE_TASK_QUEUE"

type UserWorkflowInput struct {
	User      *models.User
	UpdateReq *models.UpdateUserRequest
}
