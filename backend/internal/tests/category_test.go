package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestCategoryVisibility(t *testing.T) {
	app := fakes.GetSharedTestApp()

	admin := createUser(t, app)
	member := createUser(t, app)
	nonMember := createUser(t, app)
	trip := createTrip(t, app, admin)
	addMember(t, app, admin, member, trip)

	t.Run("admin can hide a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/food/hide", trip),
				Method: testkit.PUT,
				UserID: &admin,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("hidden category not visible to members", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			require.NotEqual(t, "food", catMap["name"], "hidden category should not appear for members")
		}
	})

	t.Run("admin sees hidden category with is_hidden flag", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.GET,
				UserID: &admin,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		var found bool
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			if catMap["name"] == "food" {
				found = true
				require.Equal(t, true, catMap["is_hidden"], "hidden category should have is_hidden=true for admin")
			} else {
				require.Equal(t, false, catMap["is_hidden"], "visible category should have is_hidden=false for admin")
			}
		}
		require.True(t, found, "admin should still see hidden category")
	})

	t.Run("admin can show a hidden category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/food/show", trip),
				Method: testkit.PUT,
				UserID: &admin,
			}).
			AssertStatus(http.StatusNoContent)

		// Verify it's visible to members again
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		names := make([]string, 0, len(categories))
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			names = append(names, catMap["name"].(string))
		}
		require.Contains(t, names, "food")
	})

	t.Run("member cannot hide a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/lodging/hide", trip),
				Method: testkit.PUT,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("member cannot show a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/lodging/show", trip),
				Method: testkit.PUT,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("non-member cannot hide a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/lodging/hide", trip),
				Method: testkit.PUT,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("hiding non-existent category returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/does-not-exist/hide", trip),
				Method: testkit.PUT,
				UserID: &admin,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func TestCategoryGetByTripID(t *testing.T) {
	app := fakes.GetSharedTestApp()

	owner := createUser(t, app)
	member := createUser(t, app)
	nonMember := createUser(t, app)
	trip := createTrip(t, app, owner)
	addMember(t, app, owner, member, trip)

	t.Run("member can get categories", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.NotNil(t, categories)
	})

	t.Run("non-member cannot get categories", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("new trip has default categories", func(t *testing.T) {
		newTrip := createTrip(t, app, owner)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", newTrip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.Equal(t, 5, len(categories), "New trip should have 5 default categories")

		categoryNames := make([]string, 0)
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			categoryNames = append(categoryNames, catMap["name"].(string))
		}

		require.Contains(t, categoryNames, "food")
		require.Contains(t, categoryNames, "lodging")
		require.Contains(t, categoryNames, "attraction")
		require.Contains(t, categoryNames, "transportation")
		require.Contains(t, categoryNames, "entertainment")
	})

	t.Run("shows all categories after activities created", func(t *testing.T) {
		categoryTrip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", categoryTrip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:        uuid.MustParse(categoryTrip),
					Name:          "Restaurant",
					CategoryNames: []string{"food"},
				},
			}).
			AssertStatus(http.StatusCreated)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", categoryTrip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:        uuid.MustParse(categoryTrip),
					Name:          "Hotel",
					CategoryNames: []string{"lodging"},
				},
			}).
			AssertStatus(http.StatusCreated)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", categoryTrip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateActivityRequest{
					TripID:        uuid.MustParse(categoryTrip),
					Name:          "Custom Activity",
					CategoryNames: []string{"my-custom-category"},
				},
			}).
			AssertStatus(http.StatusCreated)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", categoryTrip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		require.Equal(t, 6, len(categories), "Should have 6 categories (5 defaults + 1 custom)")

		categoryNames := make([]string, 0)
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			categoryNames = append(categoryNames, catMap["name"].(string))
		}

		// Verify defaults are present
		require.Contains(t, categoryNames, "food")
		require.Contains(t, categoryNames, "lodging")
		require.Contains(t, categoryNames, "attraction")
		require.Contains(t, categoryNames, "transportation")
		require.Contains(t, categoryNames, "entertainment")
		// Verify custom category
		require.Contains(t, categoryNames, "my-custom-category")
	})
}
