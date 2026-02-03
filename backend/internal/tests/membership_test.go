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
		userID         string
		tripID         string
		memberUsername string
	)

	t.Run("create user", func(t *testing.T) {
		username := fakes.GenerateRandomUsername()
		phoneNumber := fakes.GenerateRandomPhoneNumber()

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:        "Membership User",
					Username:    username,
					PhoneNumber: phoneNumber,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		userID = resp["id"].(string)
		if usernameVal, ok := resp["username"].(string); ok {
			memberUsername = usernameVal
		}
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

		if id, ok := resp["id"].(string); ok {
			tripID = id
		} else {
			t.Fatalf("Expected trip ID to be a string, got: %v", resp["id"])
		}
	})

	t.Run("add member", func(t *testing.T) {
		if tripID == "" {
			t.Skip("Skipping add member test because trip creation failed")
		}

		// Parse UUIDs safely
		userUUID, err := uuid.Parse(userID)
		if err != nil {
			t.Fatalf("Failed to parse userID '%s': %v", userID, err)
		}

		tripUUID, err := uuid.Parse(tripID)
		if err != nil {
			t.Fatalf("Failed to parse tripID '%s': %v", tripID, err)
		}

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/memberships",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateMembershipRequest{
					UserID:    userUUID,
					TripID:    tripUUID,
					IsAdmin:   false,
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).AssertStatus(http.StatusCreated).
			AssertField("user_id", userID).
			AssertField("trip_id", tripID).
			AssertField("is_admin", false)
	})

	t.Run("get membership", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", tripID, userID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("user_id", userID).
			AssertField("trip_id", tripID).
			AssertField("is_admin", false).
			AssertField("username", memberUsername).
			AssertField("profile_picture_url", nil)

		if body := resp.GetBody(); body["profile_picture_url"] != nil {
			t.Fatalf("expected profile_picture_url to be nil, got %v", body["profile_picture_url"])
		}
	})

	t.Run("get trip members", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items, ok := resp["items"].([]interface{})
		if !ok || len(items) != 1 {
			t.Errorf("expected items array with 1 member, got: %+v", resp)
		}

		if ok && len(items) == 1 {
			member, castOK := items[0].(map[string]interface{})
			if !castOK {
				t.Fatalf("expected membership item to be a map, got %T", items[0])
			}
			if memberUsername != "" && member["username"] != memberUsername {
				t.Fatalf("expected username %s, got %v", memberUsername, member["username"])
			}
			if _, exists := member["profile_picture_url"]; !exists {
				t.Fatalf("expected profile_picture_url field in membership response")
			}
			if member["profile_picture_url"] != nil {
				t.Fatalf("expected profile_picture_url to be nil, got %v", member["profile_picture_url"])
			}
		}

		if limitValue, ok := resp["limit"].(float64); !ok || int(limitValue) != 20 {
			t.Errorf("expected default limit of 20, got: %+v", limitValue)
		}
	})

	t.Run("update membership budget", func(t *testing.T) {
		budgetMin := 200
		budgetMax := 600
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", tripID, userID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateMembershipRequest{
					BudgetMin: &budgetMin,
					BudgetMax: &budgetMax,
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
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/promote", tripID, userID),
				Method: testkit.POST,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("get membership after promote", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", tripID, userID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("is_admin", true).
			AssertField("username", memberUsername).
			AssertField("profile_picture_url", nil)

		if body := resp.GetBody(); body["profile_picture_url"] != nil {
			t.Fatalf("expected profile_picture_url to be nil after promote")
		}
	})

	t.Run("demote from admin", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/demote", tripID, userID),
				Method: testkit.POST,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("remove member", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", tripID, userID),
				Method: testkit.DELETE,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("get removed member returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", tripID, userID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNotFound)
	})
}
