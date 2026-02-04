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

	t.Run("user can leave trip on their own", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, member, trip)

		// Member removes themselves
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", trip, member),
				Method: testkit.DELETE,
				UserID: &member,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("adding same user to trip twice should work", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)

		// Add member first time
		addMember(t, app, owner, member, trip)

		// Add same member again - should not error
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/memberships",
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateMembershipRequest{
					UserID:    uuid.MustParse(member),
					TripID:    uuid.MustParse(trip),
					IsAdmin:   false,
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated)
	})

	t.Run("non-admin member cannot demote admin", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		admin := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)

		// Add and promote admin
		addMember(t, app, owner, admin, trip)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/promote", trip, admin),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Add regular member
		addMember(t, app, owner, member, trip)

		// Regular member tries to demote admin - should fail
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/demote", trip, admin),
				Method: testkit.POST,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("cannot demote last admin", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		// Try to demote owner (the only admin) - should fail
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/demote", trip, owner),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("at least one admin always exists", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		admin := createUser(t, app)
		trip := createTrip(t, app, owner)

		// Add and promote second admin
		addMember(t, app, owner, admin, trip)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/promote", trip, admin),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Verify we have 2 admins
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
		adminCount := 0
		for _, item := range items {
			membership := item.(map[string]interface{})
			if membership["is_admin"].(bool) {
				adminCount++
			}
		}
		require.Equal(t, 2, adminCount, "Should have 2 admins")

		// Demote one admin - should work
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/demote", trip, admin),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Try to demote the last admin - should fail
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s/demote", trip, owner),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("budget min cannot be greater than budget max", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, member, trip)

		min := 600
		max := 200

		// Try to update with min > max - should fail
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
			AssertStatus(http.StatusUnprocessableEntity)
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

	t.Run("default limit behavior", func(t *testing.T) {
		// Create fresh trip with known number of members
		newOwner := createUser(t, app)
		newTrip := createTrip(t, app, newOwner)

		// Add 25 members
		for i := 0; i < 25; i++ {
			memberID := createUser(t, app)
			addMember(t, app, newOwner, memberID, newTrip)
		}

		// Test without limit parameter (should use default, typically 20)
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
		require.True(t, len(items) <= 20, "Should use default limit")
		require.NotNil(t, resp["next_cursor"], "Should have next page")
	})

	t.Run("max limit boundary", func(t *testing.T) {
		// Test with exactly limit=100 (the maximum allowed)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=100", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.True(t, len(items) <= 100)
	})

	t.Run("single item pagination", func(t *testing.T) {
		// Create trip with only owner as member
		singleOwner := createUser(t, app)
		singleTrip := createTrip(t, app, singleOwner)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=5", singleTrip),
				Method: testkit.GET,
				UserID: &singleOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 1, len(items))
		require.Nil(t, resp["next_cursor"], "Should not have next page")
	})

	t.Run("exact page boundary", func(t *testing.T) {
		// Create exactly 10 items with limit=5
		boundaryOwner := createUser(t, app)
		boundaryTrip := createTrip(t, app, boundaryOwner)

		for i := 0; i < 9; i++ { // 9 + owner = 10 total
			memberID := createUser(t, app)
			addMember(t, app, boundaryOwner, memberID, boundaryTrip)
		}

		// First page
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=5", boundaryTrip),
				Method: testkit.GET,
				UserID: &boundaryOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, 5, len(resp["items"].([]interface{})))
		require.NotNil(t, resp["next_cursor"])

		// Second page (exactly 5 items, no more)
		resp2 := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=5&cursor=%s", boundaryTrip, resp["next_cursor"]),
				Method: testkit.GET,
				UserID: &boundaryOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, 5, len(resp2["items"].([]interface{})))
		require.Nil(t, resp2["next_cursor"], "Should not have cursor on last page")
	})

	t.Run("last page cursor returns empty", func(t *testing.T) {
		// Create trip with 3 items, get cursor from last page
		lastOwner := createUser(t, app)
		lastTrip := createTrip(t, app, lastOwner)

		for i := 0; i < 2; i++ {
			memberID := createUser(t, app)
			addMember(t, app, lastOwner, memberID, lastTrip)
		}

		// Get all items
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=10", lastTrip),
				Method: testkit.GET,
				UserID: &lastOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, 3, len(resp["items"].([]interface{})))
		require.Nil(t, resp["next_cursor"])
	})

	t.Run("no duplicates across pages", func(t *testing.T) {
		// Create trip with many members
		dupOwner := createUser(t, app)
		dupTrip := createTrip(t, app, dupOwner)

		for i := 0; i < 12; i++ {
			memberID := createUser(t, app)
			addMember(t, app, dupOwner, memberID, dupTrip)
		}

		seenIDs := make(map[string]bool)

		// Get first page
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=5", dupTrip),
				Method: testkit.GET,
				UserID: &dupOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, item := range resp["items"].([]interface{}) {
			member := item.(map[string]interface{})
			userID := member["user_id"].(string)
			require.False(t, seenIDs[userID], "Found duplicate user_id: %s", userID)
			seenIDs[userID] = true
		}

		// Get second page
		if resp["next_cursor"] != nil {
			resp2 := testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=5&cursor=%s", dupTrip, resp["next_cursor"]),
					Method: testkit.GET,
					UserID: &dupOwner,
				}).
				AssertStatus(http.StatusOK).
				GetBody()

			for _, item := range resp2["items"].([]interface{}) {
				member := item.(map[string]interface{})
				userID := member["user_id"].(string)
				require.False(t, seenIDs[userID], "Found duplicate user_id: %s", userID)
				seenIDs[userID] = true
			}
		}
	})

	t.Run("correct ordering", func(t *testing.T) {
		// Create trip and add members in sequence
		orderOwner := createUser(t, app)
		orderTrip := createTrip(t, app, orderOwner)

		for i := 0; i < 5; i++ {
			memberID := createUser(t, app)
			addMember(t, app, orderOwner, memberID, orderTrip)
		}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships?limit=10", orderTrip),
				Method: testkit.GET,
				UserID: &orderOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		// Verify items are ordered by created_at DESC (newest first)
		for i := 0; i < len(items)-1; i++ {
			current := items[i].(map[string]interface{})
			next := items[i+1].(map[string]interface{})
			currentTime := current["created_at"].(string)
			nextTime := next["created_at"].(string)
			require.True(t, currentTime >= nextTime, "Items should be ordered by created_at DESC")
		}
	})

	t.Run("unauthorized user cannot paginate", func(t *testing.T) {
		// Create a user who is not a member of the trip
		nonMember := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships", trip),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})
}
