package middlewares

import (
	"toggo/internal/errs"
	"toggo/internal/repository"
	"toggo/internal/utilities"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TripMemberRequired(repo *repository.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user ID from context (set by auth middleware)
		userIDStr := c.Locals("userID")
		if userIDStr == nil {
			return errs.Unauthorized()
		}

		userID, err := uuid.Parse(userIDStr.(string))
		if err != nil {
			return errs.Unauthorized()
		}

		// Get trip ID from path parameter
		tripID, err := utilities.ValidateID(c.Params("tripID"))
		if err != nil {
			return errs.InvalidUUID()
		}

		// Check if user is a member of the trip
		isMember, err := repo.Membership.IsMember(c.Context(), tripID, userID)
		if err != nil {
			return err
		}

		if !isMember {
			return errs.Forbidden()
		}

		return c.Next()
	}
}
