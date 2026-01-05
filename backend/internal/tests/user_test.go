package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestUserLifecycle(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()
	email := fmt.Sprintf("lifecycle-%s@example.com", fakes.GenerateUUID())

	var createdUserID string

	t.Run("create user", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:  "John Doe",
					Email: email,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		t.Logf("Response: %+v", resp)
		createdUserID = resp["id"].(string)
	})

	t.Run("get created user", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("email", email).
			AssertField("name", "John Doe")
	})

	t.Run("update user", func(t *testing.T) {
		name := "Jane Doe"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Name: &name,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Jane Doe")
	})

	t.Run("get updated user", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Jane Doe")
	})

	t.Run("create user with same email returns 409", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:  "Duplicate User",
					Email: email,
				},
			}).
			AssertStatus(http.StatusConflict)
	})

	t.Run("delete user", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.DELETE,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("get deleted user returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("update deleted user returns 404", func(t *testing.T) {
		name := "Ghost User"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Name: &name,
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete again is idempotent", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.DELETE,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("create with same email after deletion", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:  "Reborn User",
					Email: email,
				},
			}).
			AssertStatus(http.StatusCreated)
	})
}
