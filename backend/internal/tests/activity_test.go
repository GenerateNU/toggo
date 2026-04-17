package tests

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

/* =========================
   Helpers
=========================*/

func createActivity(t *testing.T, app *fiber.App, userID, tripID, name string) string {
	return createActivityWithTimeOfDay(t, app, userID, tripID, name, nil)
}

func createActivityWithTimeOfDay(t *testing.T, app *fiber.App, userID, tripID, name string, timeOfDay *models.ActivityTimeOfDay) string {
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/activities", tripID),
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreateActivityRequest{
				TripID:    uuid.MustParse(tripID),
				Name:      name,
				TimeOfDay: timeOfDay,
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

	t.Run("list trip activities filtered by time_of_day", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		morning := models.ActivityTimeOfDayMorning
		afternoon := models.ActivityTimeOfDayAfternoon

		createActivityWithTimeOfDay(t, app, owner, trip, "Morning Activity 1", &morning)
		createActivityWithTimeOfDay(t, app, owner, trip, "Afternoon Activity 1", &afternoon)
		createActivityWithTimeOfDay(t, app, owner, trip, "Morning Activity 2", &morning)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?time_of_day=%s", trip, morning),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 2, len(items))
		for _, item := range items {
			activity := item.(map[string]interface{})
			require.Equal(t, string(morning), activity["time_of_day"])
		}
	})

	t.Run("invalid time_of_day filter returns 422", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		createActivity(t, app, owner, trip, "Activity 1")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?time_of_day=invalid", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusUnprocessableEntity)
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

func TestActivityLocationAndEstimatedPrice(t *testing.T) {
	t.Run("create activity with location and estimated price", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		locationName := "Eiffel Tower, Paris, France"
		locationLat := 48.858844
		locationLng := 2.294351
		estimatedPrice := 29.99

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:         uuid.MustParse(trip),
					Name:           "Eiffel Tower Visit",
					LocationName:   &locationName,
					LocationLat:    &locationLat,
					LocationLng:    &locationLng,
					EstimatedPrice: &estimatedPrice,
				},
			}).
			AssertStatus(http.StatusCreated).
			AssertField("location_name", locationName).
			AssertField("location_lat", locationLat).
			AssertField("location_lng", locationLng).
			AssertField("estimated_price", estimatedPrice).
			GetBody()

		activityID := resp["id"].(string)

		// Verify fields persist on GET
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			AssertField("location_name", locationName).
			AssertField("location_lat", locationLat).
			AssertField("location_lng", locationLng).
			AssertField("estimated_price", estimatedPrice)
	})

	t.Run("create activity without optional fields omits them from response", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID: uuid.MustParse(trip),
					Name:   "Activity Without Location",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		require.Nil(t, resp["location_name"])
		require.Nil(t, resp["location_lat"])
		require.Nil(t, resp["location_lng"])
		require.Nil(t, resp["estimated_price"])
	})

	t.Run("update activity location and estimated price", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		activityID := createActivity(t, app, owner, trip, "Activity to Update")

		newLocationName := "Louvre Museum, Paris, France"
		newLocationLat := 48.860294
		newLocationLng := 2.337789
		newPrice := 15.50

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateActivityRequest{
					LocationName:   &newLocationName,
					LocationLat:    &newLocationLat,
					LocationLng:    &newLocationLng,
					EstimatedPrice: &newPrice,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("location_name", newLocationName).
			AssertField("location_lat", newLocationLat).
			AssertField("location_lng", newLocationLng).
			AssertField("estimated_price", newPrice)
	})

	t.Run("location and estimated price appear in list response", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		locationName := "Tokyo Tower, Japan"
		locationLat := 35.658581
		locationLng := 139.745438
		estimatedPrice := 10.00

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:         uuid.MustParse(trip),
					Name:           "Tokyo Tower Visit",
					LocationName:   &locationName,
					LocationLat:    &locationLat,
					LocationLng:    &locationLng,
					EstimatedPrice: &estimatedPrice,
				},
			}).
			AssertStatus(http.StatusCreated)

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
		require.Equal(t, 1, len(items))
		activity := items[0].(map[string]interface{})
		require.Equal(t, locationName, activity["location_name"])
		require.Equal(t, locationLat, activity["location_lat"])
		require.Equal(t, locationLng, activity["location_lng"])
		require.Equal(t, estimatedPrice, activity["estimated_price"])
	})

	t.Run("list activities includes comment_count and comment_previews", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		commenter := createUser(t, app)
		trip := createTrip(t, app, owner)
		addMember(t, app, owner, commenter, trip)

		activityID := createActivity(t, app, owner, trip, "Activity With Comments")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &commenter,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(trip),
					EntityType: models.ActivityEntity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "Looks good!",
				},
			}).
			AssertStatus(http.StatusCreated)

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
		require.Equal(t, 1, len(items))
		activity := items[0].(map[string]interface{})

		require.Equal(t, float64(1), activity["comment_count"])
		previews, ok := activity["comment_previews"].([]interface{})
		require.True(t, ok)
		require.Equal(t, 1, len(previews))
	})

	t.Run("supports cents in estimated price", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		price := 9.99

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:         uuid.MustParse(trip),
					Name:           "Coffee",
					EstimatedPrice: &price,
				},
			}).
			AssertStatus(http.StatusCreated).
			AssertField("estimated_price", price)
	})

	t.Run("negative estimated price is rejected", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		negativePrice := -10.0

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:         uuid.MustParse(trip),
					Name:           "Invalid Price Activity",
					EstimatedPrice: &negativePrice,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("empty location name is rejected", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		emptyName := ""

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:       uuid.MustParse(trip),
					Name:         "Activity With Empty Location",
					LocationName: &emptyName,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("latitude out of range is rejected", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		invalidLat := 91.0

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:      uuid.MustParse(trip),
					Name:        "Invalid Lat Activity",
					LocationLat: &invalidLat,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("longitude out of range is rejected", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		invalidLng := 181.0

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:      uuid.MustParse(trip),
					Name:        "Invalid Lng Activity",
					LocationLng: &invalidLng,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})
}

func TestActivityRSVPs(t *testing.T) {
	app := fakes.GetSharedTestApp()

	owner := createUser(t, app)
	member := createUser(t, app)
	nonMember := createUser(t, app)
	trip := createTrip(t, app, owner)
	addMember(t, app, owner, member, trip)
	activityID := createActivity(t, app, owner, trip, "RSVP Test Activity")

	t.Run("member can RSVP yes", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.PUT,
				UserID: &member,
				Body: models.ActivityRSVPRequestPayload{
					Status: "yes",
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("status", "yes")
	})

	t.Run("member can RSVP maybe", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.PUT,
				UserID: &member,
				Body: models.ActivityRSVPRequestPayload{
					Status: "maybe",
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("status", "maybe")
	})

	t.Run("member can RSVP not going", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.PUT,
				UserID: &member,
				Body: models.ActivityRSVPRequestPayload{
					Status: "no",
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("status", "no")
	})

	t.Run("non-member cannot RSVP", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.PUT,
				UserID: &nonMember,
				Body: models.ActivityRSVPRequestPayload{
					Status: "yes",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("invalid activity ID returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, uuid.New().String()),
				Method: testkit.PUT,
				UserID: &member,
				Body: models.ActivityRSVPRequestPayload{
					Status: "yes",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("invalid status returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.PUT,
				UserID: &member,
				Body: models.ActivityRSVPRequestPayload{
					Status: "invalid-status",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("get RSVPs for activity", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		rsvps := resp["rsvps"].([]interface{})
		fmt.Printf("RSVPs returned: %+v\n", rsvps)
		require.True(t, len(rsvps) >= 1)
	})

	t.Run("activity going_count and going_users reflect yes RSVPs", func(t *testing.T) {
		ctx := context.Background()
		app := fakes.GetSharedTestApp()
		activityOwner := createUser(t, app)
		goingMember := createUser(t, app)
		notGoingMember := createUser(t, app)
		testTrip := createTrip(t, app, activityOwner)
		addMember(t, app, activityOwner, goingMember, testTrip)
		addMember(t, app, activityOwner, notGoingMember, testTrip)
		testActivityID := createActivity(t, app, activityOwner, testTrip, "Going Test Activity")

		// Set up profile picture for goingMember
		db := fakes.GetSharedDB()
		profileImageID := uuid.New()
		uniqueFileKey := fmt.Sprintf("going_user_pic_%s_small.jpg", uuid.NewString())
		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: profileImageID,
				FileKey: uniqueFileKey,
				Size:    models.ImageSizeSmall,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(ctx)
		require.NoError(t, err)

		_, err = db.NewUpdate().
			Model(&models.User{}).
			Set("profile_picture = ?", profileImageID).
			Where("id = ?", goingMember).
			Exec(ctx)
		require.NoError(t, err)

		// goingMember RSVPs yes
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", testTrip, testActivityID),
				Method: testkit.PUT,
				UserID: &goingMember,
				Body:   models.ActivityRSVPRequestPayload{Status: models.RSVPStatusGoing},
			}).
			AssertStatus(http.StatusOK)

		// notGoingMember RSVPs no
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", testTrip, testActivityID),
				Method: testkit.PUT,
				UserID: &notGoingMember,
				Body:   models.ActivityRSVPRequestPayload{Status: models.RSVPStatusNotGoing},
			}).
			AssertStatus(http.StatusOK)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", testTrip, testActivityID),
				Method: testkit.GET,
				UserID: &activityOwner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, float64(1), resp["going_count"])

		goingUsers := resp["going_users"].([]interface{})
		require.Equal(t, 1, len(goingUsers))

		user := goingUsers[0].(map[string]interface{})
		require.Equal(t, goingMember, user["user_id"])
		require.NotEmpty(t, user["username"])

		profilePictureURL, ok := user["profile_picture_url"].(string)
		require.True(t, ok, "profile_picture_url missing or not a string")
		require.NotEmpty(t, profilePictureURL)
		require.Contains(t, profilePictureURL, uniqueFileKey)
	})
}

func TestActivityImages(t *testing.T) {
	app := fakes.GetSharedTestApp()
	db := fakes.GetSharedDB()

	// helper: insert a confirmed image record directly into DB
	insertConfirmedImage := func(t *testing.T) uuid.UUID {
		t.Helper()
		imageID := uuid.New()
		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: imageID,
				FileKey: "large/images/" + uuid.NewString() + ".jpg",
				Size:    models.ImageSizeLarge,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(context.Background())
		assert.NoError(t, err)
		return imageID
	}

	t.Run("create activity with images returns image_ids in response", func(t *testing.T) {
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		imageID := insertConfirmedImage(t)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:   uuid.MustParse(trip),
					Name:     "Activity With Images",
					ImageIDs: []uuid.UUID{imageID},
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		images, ok := resp["image_ids"].([]interface{})
		require.True(t, ok, "image_ids should be an array")
		require.Equal(t, 1, len(images))

		img := images[0].(map[string]interface{})
		require.Equal(t, imageID.String(), img["image_id"])
	})

	t.Run("create activity without images returns empty image_ids", func(t *testing.T) {
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID: uuid.MustParse(trip),
					Name:   "Activity Without Images",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		// image_ids should be absent or nil when no images
		images := resp["image_ids"]
		if images != nil {
			require.Equal(t, 0, len(images.([]interface{})))
		}
	})

	t.Run("update activity replaces images", func(t *testing.T) {
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		image1 := insertConfirmedImage(t)
		image2 := insertConfirmedImage(t)

		// Create with image1
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:   uuid.MustParse(trip),
					Name:     "Activity To Update Images",
					ImageIDs: []uuid.UUID{image1},
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		activityID := resp["id"].(string)

		// Update to image2 only
		newImages := []uuid.UUID{image2}
		updateResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateActivityRequest{
					ImageIDs: &newImages,
				},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		images, ok := updateResp["image_ids"].([]interface{})
		require.True(t, ok)
		require.Equal(t, 1, len(images))
		img := images[0].(map[string]interface{})
		require.Equal(t, image2.String(), img["image_id"])
	})

	t.Run("update activity with empty images clears all images", func(t *testing.T) {
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		imageID := insertConfirmedImage(t)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:   uuid.MustParse(trip),
					Name:     "Activity To Clear Images",
					ImageIDs: []uuid.UUID{imageID},
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		activityID := resp["id"].(string)

		emptyImages := []uuid.UUID{}
		updateResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateActivityRequest{
					ImageIDs: &emptyImages,
				},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		images := updateResp["image_ids"]
		if images != nil {
			require.Equal(t, 0, len(images.([]interface{})))
		}
	})

	t.Run("delete activity removes image associations", func(t *testing.T) {
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		imageID := insertConfirmedImage(t)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:   uuid.MustParse(trip),
					Name:     "Activity To Delete With Images",
					ImageIDs: []uuid.UUID{imageID},
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		activityID := resp["id"].(string)

		// Delete the activity
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNoContent)

		// Verify activity is gone
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)

		// Verify activity_images rows are gone (cascade delete)
		actUUID := uuid.MustParse(activityID)
		count, err := db.NewSelect().
			TableExpr("activity_images").
			Where("activity_id = ?", actUUID).
			Count(context.Background())
		assert.NoError(t, err)
		assert.Equal(t, 0, count, "activity_images rows should be deleted on cascade")
	})

	t.Run("create activity with too many images returns 422", func(t *testing.T) {
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		imageIDs := make([]uuid.UUID, models.MaxActivityImages+1)
		for i := range imageIDs {
			imageIDs[i] = uuid.New()
		}

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:   uuid.MustParse(trip),
					Name:     "Too Many Images",
					ImageIDs: imageIDs,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("get activity includes images", func(t *testing.T) {
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		imageID := insertConfirmedImage(t)

		createResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:   uuid.MustParse(trip),
					Name:     "Activity For Get Test",
					ImageIDs: []uuid.UUID{imageID},
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		activityID := createResp["id"].(string)

		getResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		images, ok := getResp["image_ids"].([]interface{})
		require.True(t, ok)
		require.Equal(t, 1, len(images))
		img := images[0].(map[string]interface{})
		require.Equal(t, imageID.String(), img["image_id"])
	})
}

func TestActivityRSVPPagination(t *testing.T) {
	app := fakes.GetSharedTestApp()

	owner := createUser(t, app)
	trip := createTrip(t, app, owner)
	activityID := createActivity(t, app, owner, trip, "RSVP Pagination Activity")

	memberIDs := make([]string, 10)
	for i := 0; i < 10; i++ {
		member := createUser(t, app)
		addMember(t, app, owner, member, trip)
		memberIDs[i] = member
		var status string
		switch i % 3 {
		case 0:
			status = string(models.RSVPStatusGoing)
		case 1:
			status = string(models.RSVPStatusMaybe)
		case 2:
			status = string(models.RSVPStatusNotGoing)
		}
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.PUT,
				UserID: &member,
				Body: models.ActivityRSVPRequestPayload{
					Status: models.RSVPStatus(status),
				},
			}).
			AssertStatus(http.StatusOK)
	}

	t.Run("pagination works with limit", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps?limit=4", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		rsvps := resp["rsvps"].([]interface{})
		require.Equal(t, 4, len(rsvps))
		nextCursor := resp["next_cursor"]
		require.NotNil(t, nextCursor)
	})

	t.Run("pagination with cursor returns next page", func(t *testing.T) {
		// Get first page
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps?limit=3", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		nextCursor := resp["next_cursor"]
		require.NotNil(t, nextCursor)

		// Get next page
		resp2 := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps?limit=3&cursor=%s", trip, activityID, nextCursor),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		rsvps2, ok := resp2["rsvps"].([]interface{})
		if !ok {
			t.Fatalf("Expected resp2['rsvps'] to be []interface{}, got %T. Full response: %#v", resp2["rsvps"], resp2)
		}
		require.Equal(t, 3, len(rsvps2))
	})

	t.Run("filter by status returns correct RSVPs", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps?status=%s", trip, activityID, models.RSVPStatusGoing),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		rsvps := resp["rsvps"].([]interface{})
		for _, rsvp := range rsvps {
			m := rsvp.(map[string]interface{})
			require.Equal(t, string(models.RSVPStatusGoing), m["status"])
		}
	})

	t.Run("invalid cursor returns 400", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps?cursor=invalid", trip, activityID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

func TestRemoveActivityRSVP(t *testing.T) {
	app := fakes.GetSharedTestApp()
 
	owner := createUser(t, app)
	proposer := createUser(t, app)
	member := createUser(t, app)
	nonMember := createUser(t, app)
	trip := createTrip(t, app, owner)
	addMember(t, app, owner, proposer, trip)
	addMember(t, app, owner, member, trip)
 
	// proposer creates the activity
	activityID := createActivity(t, app, proposer, trip, "RSVP Removal Test Activity")
 
	// helper to RSVP a user
	rsvpUser := func(t *testing.T, userID string) {
		t.Helper()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps", trip, activityID),
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.ActivityRSVPRequestPayload{Status: models.RSVPStatusGoing},
			}).
			AssertStatus(http.StatusOK)
	}
 
	t.Run("admin can remove another user's RSVP", func(t *testing.T) {
		rsvpUser(t, member)
 
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps/%s", trip, activityID, member),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNoContent)
	})
 
	t.Run("proposer can remove another user's RSVP", func(t *testing.T) {
		rsvpUser(t, member)
 
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps/%s", trip, activityID, member),
				Method: testkit.DELETE,
				UserID: &proposer,
			}).
			AssertStatus(http.StatusNoContent)
	})
 
	t.Run("regular member cannot remove another user's RSVP", func(t *testing.T) {
		rsvpUser(t, owner)
 
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps/%s", trip, activityID, owner),
				Method: testkit.DELETE,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})
 
	t.Run("removing an RSVP that does not exist returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps/%s", trip, activityID, uuid.New().String()),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})
 
	t.Run("non-member cannot remove an RSVP", func(t *testing.T) {
		rsvpUser(t, member)
 
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/rsvps/%s", trip, activityID, member),
				Method: testkit.DELETE,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})
}