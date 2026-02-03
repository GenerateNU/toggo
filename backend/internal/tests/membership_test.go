package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

/* ============================
   Helpers
============================ */

func createUser(t *testing.T, app *fiber.App) string {
	id := fakes.GenerateUUID()

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &id,
			Body: models.CreateUserRequest{
				Name:        "User",
				Username:    fakes.GenerateRandomUsername(),
				PhoneNumber: fakes.GenerateRandomPhoneNumber(),
			},
		}).
		AssertStatus(http.StatusCreated)

	return id
}

func createTrip(t *testing.T, app *fiber.App, ownerID string) string {
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/trips",
			Method: testkit.POST,
			UserID: &ownerID,
			Body: models.CreateTripRequest{
				Name:      "Trip",
				BudgetMin: 100,
				BudgetMax: 500,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	return resp["id"].(string)
}

func addMember(t *testing.T, app *fiber.App, ownerID, userID, tripID string) {
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/memberships",
			Method: testkit.POST,
			UserID: &ownerID,
			Body: models.CreateMembershipRequest{
				UserID:    uuid.MustParse(userID),
				TripID:    uuid.MustParse(tripID),
				IsAdmin:   false,
				BudgetMin: 100,
				BudgetMax: 500,
			},
		}).
		AssertStatus(http.StatusCreated)
}

/* ============================
   TESTS
============================ */

func TestMembershipLifecycle(t *testing.T) {

	t.Run("add and get membership", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)

		addMember(t, app, owner, member, trip)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", trip, member),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			AssertField("user_id", member).
			AssertField("trip_id", trip).
			AssertField("is_admin", false)
	})

	t.Run("list trip members", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, member, trip)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		if len(items) != 2 {
			t.Fatalf("expected 2 members, got %d", len(items))
		}
	})

	t.Run("update membership budget", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, member, trip)

		min := 200
		max := 600

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", trip, member),
				Method: testkit.PATCH,
				UserID: &owner,
				Body: models.UpdateMembershipRequest{
					BudgetMin: &min,
					BudgetMax: &max,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("budget_min", float64(200)).
			AssertField("budget_max", float64(600))
	})

	t.Run("promote and demote admin", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, member, trip)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/promote", trip, member),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/demote", trip, member),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("remove member", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, member, trip)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", trip, member),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNoContent)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", trip, member),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func TestMembershipPagination(t *testing.T) {
	app := fakes.GetSharedTestApp()

	owner := createUser(t, app)
	trip := createTrip(t, app, owner)

	t.Run("pagination with multiple members", func(t *testing.T) {
		// Create 15 members
		memberIDs := make([]string, 15)
		for i := 0; i < 15; i++ {
			memberID := createUser(t, app)
			addMember(t, app, owner, memberID, trip)
			memberIDs[i] = memberID
		}

		// Test first page with limit
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=5", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 5, len(items))

		// Test page with cursor
		nextCursor := resp["next_cursor"]
		require.NotNil(t, nextCursor)

		nextResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?cursor=%s&limit=5", trip, nextCursor),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		nextItems := nextResp["items"].([]interface{})
		require.Equal(t, 5, len(nextItems))
	})

	t.Run("pagination edge cases", func(t *testing.T) {
		// Test zero limit
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=0", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusUnprocessableEntity)

		// Test invalid cursor
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?cursor=invalid", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("empty result pagination", func(t *testing.T) {
		// Create a fresh trip with no members
		newOwner := createUser(t, app)
		newTrip := createTrip(t, app, newOwner)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships", newTrip),
				Method: testkit.GET,
				UserID: &newOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 1, len(items)) // Owner is always a member
		require.Nil(t, resp["next_cursor"])
	})
}
