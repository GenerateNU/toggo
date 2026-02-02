package controllers

import (
	"fmt"
	"strings"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/validators"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

func parseEntityTypeParam(c *fiber.Ctx, paramName string, errorField string, allowed ...models.EntityType) (models.EntityType, error) {
	entityType := models.EntityType(c.Params(paramName))
	for _, allowedType := range allowed {
		if entityType == allowedType {
			return entityType, nil
		}
	}

	allowedNames := make([]string, len(allowed))
	for i, allowedType := range allowed {
		allowedNames[i] = string(allowedType)
	}

	return "", errs.InvalidRequestData(map[string]string{
		errorField: fmt.Sprintf("%s must be one of: %s", errorField, strings.Join(allowedNames, ", ")),
	})
}

func parseAndValidateQueryParams(c *fiber.Ctx, validator *validator.Validate, params interface{}) error {
	if err := c.QueryParser(params); err != nil {
		return errs.InvalidRequestData(map[string]string{
			"query": "invalid query parameters",
		})
	}

	return validators.Validate(validator, params)
}

type cursorQueryParams interface {
	GetLimit() *int
	GetCursor() *string
}

func extractLimitAndCursor(params cursorQueryParams) (int, string) {
	const defaultLimit, maxLimit = 20, 100

	limit := defaultLimit
	if l := params.GetLimit(); l != nil {
		limit = *l
	}

	if limit <= 0 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}

	cursor := ""
	if c := params.GetCursor(); c != nil {
		cursor = *c
	}

	return limit, cursor
}
