package errs

import (
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrForeignKey     = errors.New("referenced resource not found")
	ErrCheckViolation = errors.New("invalid value")
	ErrDatabaseError  = errors.New("database error")
    ErrConflict       = errors.New("conflict: operation not allowed")
)

const (
	PGUniqueViolation     = "23505"
	PGForeignKeyViolation = "23503"
	PGCheckViolation      = "23514"
	PGNotNullViolation    = "23502"
)

func tryWrapDBError(err error) error {
	if err == nil {
		return nil
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return handlePgError(pgErr)
	}

	return tryWrapFromString(err)
}

func handlePgError(pgErr *pgconn.PgError) error {
	switch pgErr.Code {
	case PGUniqueViolation:
		field := extractFieldFromConstraint(pgErr.ConstraintName)
		return fmt.Errorf("%s %w", field, ErrDuplicate)

	case PGForeignKeyViolation:
		ref := extractRefFromConstraint(pgErr.ConstraintName)
		return fmt.Errorf("%s: %w", ref, ErrForeignKey)

	case PGCheckViolation:
		return ErrCheckViolation

	case PGNotNullViolation:
		return fmt.Errorf("%s is required", pgErr.ColumnName)

	default:
		return ErrDatabaseError
	}
}

func tryWrapFromString(err error) error {
	errStr := err.Error()

	if strings.Contains(errStr, "SQLSTATE 23505") || strings.Contains(errStr, "duplicate key") {
		field := extractFieldFromError(errStr)
		return fmt.Errorf("%s %w", field, ErrDuplicate)
	}

	if strings.Contains(errStr, "SQLSTATE 23503") || strings.Contains(errStr, "foreign key") {
		return ErrForeignKey
	}

	if strings.Contains(errStr, "SQLSTATE 23514") {
		return ErrCheckViolation
	}

	if strings.Contains(errStr, "no rows") || strings.Contains(errStr, "sql: no rows") {
		return ErrNotFound
	}

	return err
}

func extractFieldFromConstraint(constraint string) string {
	parts := strings.Split(constraint, "_")
	if len(parts) >= 2 {
		return parts[len(parts)-2]
	}
	return "value"
}

func extractRefFromConstraint(constraint string) string {
	parts := strings.Split(constraint, "_")
	if len(parts) >= 2 {
		return parts[1]
	}
	return "referenced resource"
}

func extractFieldFromError(errStr string) string {
	if idx := strings.Index(errStr, "constraint \""); idx != -1 {
		start := idx + 12
		end := strings.Index(errStr[start:], "\"")
		if end != -1 {
			constraint := errStr[start : start+end]
			return extractFieldFromConstraint(constraint)
		}
	}

	if idx := strings.Index(errStr, "Key ("); idx != -1 {
		start := idx + 5
		end := strings.Index(errStr[start:], ")")
		if end != -1 {
			return errStr[start : start+end]
		}
	}

	return "value"
}

func IsForeignKey(err error) bool {
	return errors.Is(err, ErrForeignKey)
}

func IsDBError(err error) bool {
	return errors.Is(err, ErrDatabaseError)
}
