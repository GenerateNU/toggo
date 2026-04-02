package utilities //nolint:revive

import (
	"fmt"
	"strings"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

func ExtractLimitAndCursor(params *models.CursorPaginationParams) (int, string) {
	const defaultLimit, maxLimit = 20, 100

	limit := defaultLimit
	if params.Limit != nil {
		limit = *params.Limit
		if limit <= 0 {
			limit = defaultLimit
		} else if limit > maxLimit {
			limit = maxLimit
		}
	}

	cursor := ""
	if params.Cursor != "" {
		cursor = params.Cursor
	}

	return limit, cursor
}

func ParseAndValidateQueryParams(c *fiber.Ctx, validator *validator.Validate, params interface{}) error {
	if err := c.QueryParser(params); err != nil {
		return errs.InvalidRequestData(map[string]string{
			"query": "invalid query parameters",
		})
	}

	return validators.Validate(validator, params)
}

func ParseEntityTypeParam(c *fiber.Ctx, paramName string, errorField string, allowed ...models.EntityType) (models.EntityType, error) {
	entityType := models.EntityType(c.Params(paramName))
	for _, t := range allowed {
		if entityType == t {
			return entityType, nil
		}
	}

	allowedNames := make([]string, len(allowed))
	for i, t := range allowed {
		allowedNames[i] = string(t)
	}

	return "", errs.InvalidRequestData(map[string]string{
		errorField: fmt.Sprintf("%s must be one of: %s", errorField, strings.Join(allowedNames, ", ")),
	})
}
