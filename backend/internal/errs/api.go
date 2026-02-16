package errs

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrDuplicate     = errors.New("already exists")
	ErrInvalidCursor = errors.New("invalid cursor")
)

func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

func IsDuplicate(err error) bool {
	return errors.Is(err, ErrDuplicate)
}

type APIError struct {
	StatusCode int `json:"statusCode"`
	Message    any `json:"message"`
}

func (e APIError) Error() string {
	return fmt.Sprintf("api error: %d", e.StatusCode)
}

func NewAPIError(statusCode int, err error) APIError {
	return APIError{
		StatusCode: statusCode,
		Message:    err.Error(),
	}
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func ValidationError(err error) APIError {
	return APIError{
		StatusCode: http.StatusUnprocessableEntity,
		Message:    formatValidationErrors(err),
	}
}

func formatValidationErrors(err error) []FieldError {
	var errs []FieldError

	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return []FieldError{{Field: "unknown", Message: err.Error()}}
	}

	for _, e := range validationErrors {
		errs = append(errs, FieldError{
			Field:   e.Field(),
			Message: buildMessage(e),
		})
	}

	return errs
}

func buildMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", e.Field())
	case "email":
		return fmt.Sprintf("%s must be a valid email", e.Field())
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", e.Field(), e.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", e.Field(), e.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", e.Field(), e.Param())
	case "url":
		return fmt.Sprintf("%s must be a valid URL", e.Field())
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", e.Field())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", e.Field(), e.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", e.Field(), e.Param())
	default:
		return fmt.Sprintf("%s failed %s validation", e.Field(), e.Tag())
	}
}

func InvalidRequestData(errors map[string]string) APIError {
	return APIError{
		StatusCode: http.StatusUnprocessableEntity,
		Message:    errors,
	}
}

func BadRequest(err error) APIError {
	return NewAPIError(http.StatusBadRequest, err)
}

func InvalidJSON() APIError {
	return NewAPIError(http.StatusBadRequest, errors.New("invalid JSON request data"))
}

func Unauthorized() APIError {
	return NewAPIError(http.StatusUnauthorized, errors.New("unauthorized"))
}

func Forbidden() APIError {
	return NewAPIError(http.StatusForbidden, errors.New("forbidden"))
}

func ForbiddenReason(err error) APIError {
	return NewAPIError(http.StatusForbidden, err)
}

func Conflict() APIError {
	return NewAPIError(http.StatusConflict, errors.New("conflict"))
}

func InternalServerError() APIError {
	return NewAPIError(http.StatusInternalServerError, errors.New("internal server error"))
}

func InvalidUUID() APIError {
	return NewAPIError(http.StatusBadRequest, errors.New("invalid UUID format"))
}

// ErrorHandler maps an incoming error to an APIError, writes that error as a JSON HTTP response with the corresponding status code, and logs the original error with the request method and path.
// It first attempts to normalize database-related errors via tryWrapDBError before mapping to specific HTTP statuses (e.g., 404, 409, 400, 500) and falls back to a validation or internal server error when appropriate.
func ErrorHandler(c *fiber.Ctx, err error) error {
	var apiErr APIError

	// Try to convert database errors first
	err = tryWrapDBError(err)

	switch {
	case errors.Is(err, ErrNotFound):
		apiErr = NewAPIError(http.StatusNotFound, err)

	case errors.Is(err, ErrDuplicate):
		apiErr = NewAPIError(http.StatusConflict, err)

	case errors.Is(err, ErrConflict):
		apiErr = NewAPIError(http.StatusConflict, err)

	case errors.Is(err, ErrForeignKey):
		apiErr = NewAPIError(http.StatusBadRequest, err)

	case errors.Is(err, ErrCheckViolation):
		apiErr = NewAPIError(http.StatusBadRequest, err)

	case errors.Is(err, ErrDatabaseError):
		apiErr = InternalServerError()

	default:
		if _, ok := err.(validator.ValidationErrors); ok {
			apiErr = ValidationError(err)
		} else if castedErr, ok := err.(APIError); ok {
			apiErr = castedErr
		} else {
			apiErr = InternalServerError()
		}
	}

	slog.Error("HTTP API error", "err", err.Error(), "method", c.Method(), "path", c.Path())

	return c.Status(apiErr.StatusCode).JSON(apiErr)
}