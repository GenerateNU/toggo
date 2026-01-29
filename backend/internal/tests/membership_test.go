package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/google/uuid"
)

func TestMembershipLifecycle(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()

	var (
		userID string
		tripID string
	)

	t.Run("create user", func(t *testing.T) {
		username := fakes.GenerateRandomUsername()

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:     "Membership User",
					Username: username,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		userID = resp["id"].(string)
	})

	t.Run("create trip", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Test Trip",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID = resp["id"].(string)
	})

	t.Run("add member", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/memberships",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateMembershipRequest{
					UserID:    uuid.MustParse(userID),
					TripID:    uuid.MustParse(tripID),
					IsAdmin:   false,
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			AssertField("user_id", userID).
			AssertField("trip_id", tripID).
			AssertField("is_admin", false)
	})

	t.Run("get membership", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members/%s", tripID, userID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("user_id", userID).
			AssertField("trip_id", tripID).
			AssertField("is_admin", false)
	})

	t.Run("get trip members", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertArraySize(1)
	})

	t.Run("update membership budget", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members/%s", tripID, userID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateMembershipRequest{
					BudgetMin: 200,
					BudgetMax: 600,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("budget_min", float64(200)).
			AssertField("budget_max", float64(600))
	})

	t.Run("promote to admin", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members/%s/promote", tripID, userID),
				Method: testkit.POST,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("get membership after promote", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members/%s", tripID, userID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("is_admin", true)
	})

	t.Run("demote from admin", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members/%s/demote", tripID, userID),
				Method: testkit.POST,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("remove member", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members/%s", tripID, userID),
				Method: testkit.DELETE,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("get removed member returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/members/%s", tripID, userID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNotFound)
	})
}
