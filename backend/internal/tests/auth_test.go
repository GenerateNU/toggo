package tests

import (
	"fmt"
	"net/http"
	"testing"
	"time"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestAuthMiddleware(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("allows request with valid token", func(t *testing.T) {
		t.Parallel()
		userID := fakes.GenerateUUID()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", userID),
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("rejects request without token", func(t *testing.T) {
		t.Parallel()
		auth := false

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", fakes.GenerateUUID()),
				Method: testkit.GET,
				Auth:   &auth,
			}).
			AssertStatus(http.StatusUnauthorized)
	})

	t.Run("rejects expired token", func(t *testing.T) {
		t.Parallel()
		userID := fakes.GenerateUUID()
		expiredToken := fakes.GenerateExpiredJWT()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", userID),
				Method: testkit.GET,
				Headers: map[string]string{
					"Authorization": "Bearer " + expiredToken,
				},
			}).
			AssertStatus(http.StatusUnauthorized)
	})

	t.Run("rejects invalid signature", func(t *testing.T) {
		t.Parallel()
		userID := fakes.GenerateUUID()
		invalidToken := fakes.GenerateInvalidJWT(userID, time.Hour)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", userID),
				Method: testkit.GET,
				Headers: map[string]string{
					"Authorization": "Bearer " + invalidToken,
				},
			}).
			AssertStatus(http.StatusUnauthorized)
	})
}
