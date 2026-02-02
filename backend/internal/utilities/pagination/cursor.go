package pagination

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"

	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
)

// EncodeCursor serializes a cursor payload to an opaque base64 token.
func EncodeCursor[T any](cursor T) (string, error) {
	payload, err := json.Marshal(cursor)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(payload), nil
}

// DecodeCursor hydrates a cursor payload from an opaque base64 token.
func DecodeCursor[T any](token string, cursor *T) error {
	decoded, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		return errs.ErrInvalidCursor
	}
	if err := json.Unmarshal(decoded, cursor); err != nil {
		return errs.ErrInvalidCursor
	}
	return nil
}

// EncodeTimeUUIDCursorFromValues builds a cursor token from timestamp and UUID values.
func EncodeTimeUUIDCursorFromValues(createdAt time.Time, id uuid.UUID) (string, error) {
	return EncodeTimeUUIDCursor(models.TimeUUIDCursor{CreatedAt: createdAt, ID: id})
}

// EncodeTimeUUIDCursor serializes the standard time+UUID cursor payload to a token.
func EncodeTimeUUIDCursor(cursor models.TimeUUIDCursor) (string, error) {
	return EncodeCursor(cursor)
}

// DecodeTimeUUIDCursor parses the standard time+UUID cursor token. Supports legacy pipe separated tokens.
func DecodeTimeUUIDCursor(token string) (*models.TimeUUIDCursor, error) {
	if token == "" {
		return nil, nil
	}

	var cursor models.TimeUUIDCursor
	if err := DecodeCursor(token, &cursor); err == nil {
		return &cursor, nil
	}

	legacyCursor, err := decodeLegacyTimeUUIDCursor(token)
	if err != nil {
		return nil, err
	}

	return legacyCursor, nil
}

func decodeLegacyTimeUUIDCursor(token string) (*models.TimeUUIDCursor, error) {
	parts := strings.Split(token, "|")
	if len(parts) != 2 {
		return nil, errs.ErrInvalidCursor
	}

	createdAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, errs.ErrInvalidCursor
	}

	id, err := uuid.Parse(parts[1])
	if err != nil {
		return nil, errs.ErrInvalidCursor
	}

	return &models.TimeUUIDCursor{CreatedAt: createdAt, ID: id}, nil
}
