package tests

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestUserLifecycle(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()
	username := fakes.GenerateRandomUsername()
	normalizedUsername := strings.ToLower(username)

	var createdUserID string

	t.Run("create user", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:        "John Doe",
					Username:    username,
					PhoneNumber: "+16175551234",
				},
			}).
			AssertStatus(http.StatusCreated).
			DebugLogging().
			GetBody()

		t.Logf("Response: %+v", resp)
		createdUserID = resp["id"].(string)
	})

	t.Run("get me returns current user", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("username", normalizedUsername).
			AssertField("name", "John Doe").
			AssertField("phone_number", "+16175551234")
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
			AssertField("username", normalizedUsername).
			AssertField("name", "John Doe")
	})

	t.Run("update user", func(t *testing.T) {
		name := "Jane Doe"
		phone := "+16175559999"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Name:        &name,
					PhoneNumber: &phone,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Jane Doe").
			AssertField("phone_number", "+16175559999")
	})

	t.Run("update user with valid America/New_York timezone", func(t *testing.T) {
		tz := "America/New_York"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Timezone: &tz,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("timezone", "America/New_York")
	})

	t.Run("update user with valid Europe/London timezone", func(t *testing.T) {
		tz := "Europe/London"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Timezone: &tz,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("timezone", "Europe/London")
	})

	t.Run("update user with valid Asia/Tokyo timezone", func(t *testing.T) {
		tz := "Asia/Tokyo"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Timezone: &tz,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("timezone", "Asia/Tokyo")
	})

	t.Run("update user with invalid timezone returns 400", func(t *testing.T) {
		tz := "Invalid/Timezone"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Timezone: &tz,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("update user with typo in timezone returns 400", func(t *testing.T) {
		tz := "America/New_Yrok" // typo: Yrok instead of York
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", createdUserID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateUserRequest{
					Timezone: &tz,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
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
			AssertField("name", "Jane Doe").
			AssertField("phone_number", "+16175559999").
			AssertField("timezone", "Asia/Tokyo")
	})

	t.Run("create user with same username returns 409", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:        "Duplicate User",
					Username:    username,
					PhoneNumber: "+16175551235",
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

	t.Run("create with same username after deletion", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:        "Reborn User",
					Username:    username,
					PhoneNumber: "+16175551236",
				},
			}).
			AssertStatus(http.StatusCreated)
	})
}
