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

	t.Run("admin can hide a default category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/housing/hide", trip),
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
			require.NotEqual(t, "housing", catMap["name"], "hidden category should not appear for members")
		}
	})

	t.Run("admin without include_hidden does not see hidden category", func(t *testing.T) {
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
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			require.NotEqual(t, "housing", catMap["name"], "hidden category should not appear without include_hidden")
		}
	})

	t.Run("admin with include_hidden sees hidden category with is_hidden flag", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories?include_hidden=true", trip),
				Method: testkit.GET,
				UserID: &admin,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		var found bool
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			if catMap["name"] == "housing" {
				found = true
				require.Equal(t, true, catMap["is_hidden"], "hidden category should have is_hidden=true for admin")
			} else {
				require.Equal(t, false, catMap["is_hidden"], "visible category should have is_hidden=false for admin")
			}
		}
		require.True(t, found, "admin should see hidden category with include_hidden=true")
	})

	t.Run("admin can show a hidden category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/housing/show", trip),
				Method: testkit.PUT,
				UserID: &admin,
			}).
			AssertStatus(http.StatusNoContent)

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
		require.Contains(t, names, "housing")
	})

	t.Run("member cannot hide a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/activities/hide", trip),
				Method: testkit.PUT,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("member cannot show a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/activities/show", trip),
				Method: testkit.PUT,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("non-member cannot hide a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/activities/hide", trip),
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

	t.Run("new trip has correct default categories", func(t *testing.T) {
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
		require.Equal(t, 5, len(categories), "new trip should have 5 default categories")

		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			require.NotEmpty(t, catMap["label"], "each default category should have a label")
			require.Equal(t, true, catMap["is_default"], "seeded categories should have is_default=true")
		}

		categoryNames := make([]string, 0)
		for _, cat := range categories {
			catMap := cat.(map[string]interface{})
			categoryNames = append(categoryNames, catMap["name"].(string))
		}

		require.Contains(t, categoryNames, "housing")
		require.Contains(t, categoryNames, "activities")
		require.Contains(t, categoryNames, "polls")
		require.Contains(t, categoryNames, "itinerary")
	})
}

func TestCategoryCreate(t *testing.T) {
	app := fakes.GetSharedTestApp()

	admin := createUser(t, app)
	member := createUser(t, app)
	nonMember := createUser(t, app)
	trip := createTrip(t, app, admin)
	addMember(t, app, admin, member, trip)

	t.Run("member can create a custom category", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.POST,
				UserID: &member,
				Body: models.CreateCategoryRequest{
					TripID: uuid.MustParse(trip),
					Name:   "custom-category",
					Label:  "Custom Category",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		require.Equal(t, "custom-category", resp["name"])
		require.Equal(t, "Custom Category", resp["label"])
		require.Equal(t, false, resp["is_default"])
	})

	t.Run("admin can create a custom category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.POST,
				UserID: &admin,
				Body: models.CreateCategoryRequest{
					TripID: uuid.MustParse(trip),
					Name:   "admin-category",
					Label:  "Admin Category",
				},
			}).
			AssertStatus(http.StatusCreated)
	})

	t.Run("duplicate category name returns error", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.POST,
				UserID: &admin,
				Body: models.CreateCategoryRequest{
					TripID: uuid.MustParse(trip),
					Name:   "custom-category",
					Label:  "Duplicate",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("non-member cannot create a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
				Method: testkit.POST,
				UserID: &nonMember,
				Body: models.CreateCategoryRequest{
					TripID: uuid.MustParse(trip),
					Name:   "sneaky-category",
					Label:  "Sneaky",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func TestCategoryDelete(t *testing.T) {
	app := fakes.GetSharedTestApp()

	admin := createUser(t, app)
	member := createUser(t, app)
	trip := createTrip(t, app, admin)
	addMember(t, app, admin, member, trip)

	// Create a custom category to delete
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/categories", trip),
			Method: testkit.POST,
			UserID: &admin,
			Body: models.CreateCategoryRequest{
				TripID: uuid.MustParse(trip),
				Name:   "deletable-category",
				Label:  "Deletable",
			},
		}).
		AssertStatus(http.StatusCreated)

	t.Run("admin cannot delete a default category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/housing", trip),
				Method: testkit.DELETE,
				UserID: &admin,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("member cannot delete a category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/deletable-category", trip),
				Method: testkit.DELETE,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("admin can delete a custom category", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/deletable-category", trip),
				Method: testkit.DELETE,
				UserID: &admin,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("deleting non-existent category returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/categories/does-not-exist", trip),
				Method: testkit.DELETE,
				UserID: &admin,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func TestHiddenCategoryInActivityEndpoints(t *testing.T) {
	app := fakes.GetSharedTestApp()

	admin := createUser(t, app)
	member := createUser(t, app)
	trip := createTrip(t, app, admin)
	addMember(t, app, admin, member, trip)

	// Create an activity with default categories
	createResp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
			Method: testkit.POST,
			UserID: &admin,
			Body: models.CreateActivityRequest{
				TripID:        uuid.MustParse(trip),
				Name:          "City Tour",
				CategoryNames: []string{"housing", "activities"},
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	activityID := createResp["id"].(string)

	// Hide the housing category
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/categories/housing/hide", trip),
			Method: testkit.PUT,
			UserID: &admin,
		}).
		AssertStatus(http.StatusNoContent)

	t.Run("hidden category not returned in activity category list", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities/%s/categories", trip, activityID),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		categories := resp["categories"].([]interface{})
		for _, cat := range categories {
			require.NotEqual(t, "housing", cat, "hidden category should not appear in activity categories")
		}
		require.Contains(t, categories, "activities")
	})

	t.Run("hidden category not returned in activity list", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities", trip),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		for _, act := range items {
			actMap := act.(map[string]interface{})
			if actMap["name"] == "City Tour" {
				categoryNames := actMap["category_names"].([]interface{})
				for _, cat := range categoryNames {
					require.NotEqual(t, "housing", cat, "hidden category should not appear in activity list")
				}
				require.Contains(t, categoryNames, "activities")
			}
		}
	})

	t.Run("member cannot filter activities by hidden category", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activities?category=housing", trip),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Empty(t, items, "filtering by hidden category should return no results")
	})
}
