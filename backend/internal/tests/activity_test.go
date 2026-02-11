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

/* =========================
   Helpers
=========================*/

func createActivity(t *testing.T, app *fiber.App, userID, tripID, name string) string {
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/activities", tripID),
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreateActivityRequest{
				TripID: uuid.MustParse(tripID),
				Name:   name,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	return resp["id"].(string)
}

/* =========================
   TESTS
=========================*/

func TestActivityLifecycle(t *testing.T) {

	t.Run("create and get activity with categories", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		categoryNames := []string{"food", "social"}
		dates := []models.DateRange{
			{Start: "2024-01-01", End: "2024-01-05"},
		}

		// Create activity
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:        uuid.MustParse(trip),
					CategoryNames: categoryNames,
					Name:          "Dinner at French Restaurant",
					Dates:         &dates,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		activityID := resp["id"].(string)
		require.Equal(t, "Dinner at French Restaurant", resp["name"])

		// Check categories array
		respCategories := resp["category_names"].([]interface{})
		require.Equal(t, 2, len(respCategories))

		// Get activity
		getResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, activityID, getResp["id"])
		categories := getResp["category_names"].([]interface{})
		require.Equal(t, 2, len(categories))
	})

	t.Run("list trip activities", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		// Create multiple activities
		createActivity(t, app, owner, trip, "Activity 1")
		createActivity(t, app, owner, trip, "Activity 2")
		createActivity(t, app, owner, trip, "Activity 3")

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.True(t, len(items) >= 3, "Should have at least 3 activities")
	})

	t.Run("update activity", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		activityID := createActivity(t, app, owner, trip, "Original Name")

		newName := "Updated Name"
		newDescription := "Updated description"

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateActivityRequest{
					Name:        &newName,
					Description: &newDescription,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Updated Name").
			AssertField("description", "Updated description")
	})

	t.Run("update activity dates", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		activityID := createActivity(t, app, owner, trip, "Activity with Dates")

		dates := []models.DateRange{
			{Start: "2024-03-01", End: "2024-03-05"},
			{Start: "2024-03-10", End: "2024-03-15"},
		}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateActivityRequest{
					Dates: &dates,
				},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		responseDates := resp["dates"].([]interface{})
		require.Equal(t, 2, len(responseDates))
	})

	t.Run("delete activity as proposer", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		activityID := createActivity(t, app, owner, trip, "To Delete")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNoContent)

		// Verify deleted
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete activity as admin", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		admin := createUser(t, app)
		proposer := createUser(t, app)
		trip := createTrip(t, app, admin)
		addMember(t, app, admin, proposer, trip)

		activityID := createActivity(t, app, proposer, trip, "To Delete")

		// Admin can delete even though they're not the proposer
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.DELETE,
				UserID: &admin,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("non-admin member cannot delete other's activity", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		proposer := createUser(t, app)
		member := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, proposer, trip)
		addMember(t, app, owner, member, trip)

		activityID := createActivity(t, app, proposer, trip, "Activity")

		// Regular member tries to delete - should fail
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.DELETE,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("non-member cannot create activity", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		nonMember := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &nonMember,
				Body: models.CreateActivityRequest{
					TripID: uuid.MustParse(trip),
					Name:   "Unauthorized Activity",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-member cannot view activity", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		nonMember := createUser(t, app)
		trip := createTrip(t, app, owner)
		activityID := createActivity(t, app, owner, trip, "Activity")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-member cannot list activities", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		nonMember := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("creates custom categories automatically", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		customCategories := []string{"custom-shopping", "custom-nightlife"}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:        uuid.MustParse(trip),
					CategoryNames: customCategories,
					Name:          "Night Out",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		categories := resp["category_names"].([]interface{})
		require.Equal(t, 2, len(categories))

		// Create another activity with the same categories - should work without error
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:        uuid.MustParse(trip),
					CategoryNames: []string{"custom-shopping"},
					Name:          "Second Shopping Activity",
				},
			}).
			AssertStatus(http.StatusCreated)
	})

	t.Run("activity not found returns 404", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		nonExistentID := uuid.New().String()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, nonExistentID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("invalid trip id returns 400", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/invalid-uuid/activities",
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID: uuid.New(),
					Name:   "Activity",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

func TestActivityCategories(t *testing.T) {
	app := fakes.GetSharedTestApp()

	owner := createUser(t, app)
	member := createUser(t, app)
	nonMember := createUser(t, app)
	trip := createTrip(t, app, owner)
	addMember(t, app, owner, member, trip)

	activityID := createActivity(t, app, owner, trip, "Test Activity")

	t.Run("get categories for activity with pagination", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.NotNil(t, categories)
		require.Equal(t, resp["limit"], float64(20)) // Default limit
	})

	t.Run("add category to activity", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/food", trip, activityID),
				Method: testkit.PUT,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK)

		// Verify category was added
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.Contains(t, categories, "food")
	})

	t.Run("add multiple categories", func(t *testing.T) {
		newActivity := createActivity(t, app, owner, trip, "Multi Category Activity")

		// Add first category
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/lodging", trip, newActivity),
				Method: testkit.PUT,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Add second category
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/entertainment", trip, newActivity),
				Method: testkit.PUT,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Get categories
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories", trip, newActivity),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.Equal(t, 2, len(categories))
		require.Contains(t, categories, "lodging")
		require.Contains(t, categories, "entertainment")
	})

	t.Run("remove category from activity", func(t *testing.T) {
		newActivity := createActivity(t, app, owner, trip, "Activity to Uncategorize")

		// Add categories
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/food", trip, newActivity),
				Method: testkit.PUT,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/social", trip, newActivity),
				Method: testkit.PUT,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Remove one category
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/food", trip, newActivity),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNoContent)

		// Verify only one category remains
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories", trip, newActivity),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.Equal(t, 1, len(categories))
		require.Contains(t, categories, "social")
		require.NotContains(t, categories, "food")
	})

	t.Run("non-member cannot add category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/food", trip, activityID),
				Method: testkit.PUT,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-member cannot remove category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/food", trip, activityID),
				Method: testkit.DELETE,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("adding same category twice is idempotent", func(t *testing.T) {
		newActivity := createActivity(t, app, owner, trip, "Idempotent Test")

		// Add category first time
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/food", trip, newActivity),
				Method: testkit.PUT,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Add same category again - should not error
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories/food", trip, newActivity),
				Method: testkit.PUT,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Should still have only one instance
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories", trip, newActivity),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.Equal(t, 1, len(categories))
	})
}

func TestActivityPagination(t *testing.T) {
	app := fakes.GetSharedTestApp()

	owner := createUser(t, app)
	trip := createTrip(t, app, owner)

	t.Run("pagination with multiple activities", func(t *testing.T) {
		// Create 15 activities
		for i := 0; i < 15; i++ {
			createActivity(t, app, owner, trip, fmt.Sprintf("Activity %d", i))
		}

		// Test first page with limit
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?limit=5", trip),
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
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?cursor=%s&limit=5", trip, nextCursor),
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
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?limit=0", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusUnprocessableEntity)

		// Test invalid cursor
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?cursor=invalid", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("empty result pagination", func(t *testing.T) {
		// Create a fresh trip with no activities
		newOwner := createUser(t, app)
		newTrip := createTrip(t, app, newOwner)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", newTrip),
				Method: testkit.GET,
				UserID: &newOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 0, len(items))
		require.Nil(t, resp["next_cursor"])
	})

	t.Run("default limit behavior", func(t *testing.T) {
		// Create fresh trip with 25 activities
		newOwner := createUser(t, app)
		newTrip := createTrip(t, app, newOwner)

		for i := 0; i < 25; i++ {
			createActivity(t, app, newOwner, newTrip, fmt.Sprintf("Activity %d", i))
		}

		// Test without limit parameter (should use default)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", newTrip),
				Method: testkit.GET,
				UserID: &newOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.True(t, len(items) <= 20, "Should use default limit")
		require.NotNil(t, resp["next_cursor"], "Should have next page")
	})

	t.Run("no duplicates across pages", func(t *testing.T) {
		// Create trip with 12 activities
		dupOwner := createUser(t, app)
		dupTrip := createTrip(t, app, dupOwner)

		for i := 0; i < 12; i++ {
			createActivity(t, app, dupOwner, dupTrip, fmt.Sprintf("Activity %d", i))
		}

		seenIDs := make(map[string]bool)

		// Get first page
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?limit=5", dupTrip),
				Method: testkit.GET,
				UserID: &dupOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, item := range resp["items"].([]interface{}) {
			activity := item.(map[string]interface{})
			activityID := activity["id"].(string)
			require.False(t, seenIDs[activityID], "Found duplicate activity id: %s", activityID)
			seenIDs[activityID] = true
		}

		// Get second page
		if resp["next_cursor"] != nil {
			resp2 := testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  fmt.Sprintf("/api/v1/trips/%s/activities?limit=5&cursor=%s", dupTrip, resp["next_cursor"]),
					Method: testkit.GET,
					UserID: &dupOwner,
				}).
				AssertStatus(http.StatusOK).
				GetBody()

			for _, item := range resp2["items"].([]interface{}) {
				activity := item.(map[string]interface{})
				activityID := activity["id"].(string)
				require.False(t, seenIDs[activityID], "Found duplicate activity id: %s", activityID)
				seenIDs[activityID] = true
			}
		}
	})

	t.Run("correct ordering", func(t *testing.T) {
		// Create trip and add activities
		orderOwner := createUser(t, app)
		orderTrip := createTrip(t, app, orderOwner)

		for i := 0; i < 5; i++ {
			createActivity(t, app, orderOwner, orderTrip, fmt.Sprintf("Activity %d", i))
		}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?limit=10", orderTrip),
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
}