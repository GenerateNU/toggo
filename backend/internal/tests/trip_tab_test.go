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

func createTripTab(t *testing.T, app *fiber.App, userID, tripID string, tabType, name string) string {
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", tripID),
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreateTripTabRequest{
				TabType: tabType,
				Name:    name,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	return resp["id"].(string)
}

/* =========================
   TESTS
=========================*/

func TestTripTabLifecycle(t *testing.T) {

	t.Run("member can get tabs for a trip", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("non-member cannot get tabs", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		nonMember := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("member can create a moodboard tab", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateTripTabRequest{
					TabType: "moodboard",
					Name:    "Vibes",
				},
			}).
			AssertStatus(http.StatusCreated).
			AssertField("tab_type", "moodboard").
			AssertField("name", "Vibes")
	})

	t.Run("member can create a blank tab", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateTripTabRequest{
					TabType: "blank",
					Name:    "Notes",
				},
			}).
			AssertStatus(http.StatusCreated).
			AssertField("tab_type", "blank").
			AssertField("name", "Notes")
	})

	t.Run("cannot create a fixed tab", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateTripTabRequest{
					TabType: "home",
					Name:    "Home",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("cannot create a tab with invalid type", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateTripTabRequest{
					TabType: "invalid-type",
					Name:    "Bad Tab",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("non-member cannot create a tab", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		nonMember := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.POST,
				UserID: &nonMember,
				Body: models.CreateTripTabRequest{
					TabType: "moodboard",
					Name:    "Vibes",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("can create multiple moodboard tabs", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		createTripTab(t, app, owner, trip, "moodboard", "Vibes")
		createTripTab(t, app, owner, trip, "moodboard", "Aesthetic")

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		tabs := resp["tabs"].([]interface{})
		moodboardCount := 0
		for _, tab := range tabs {
			m := tab.(map[string]interface{})
			if m["tab_type"] == "moodboard" {
				moodboardCount++
			}
		}
		require.Equal(t, 2, moodboardCount)
	})

	t.Run("member can delete a customizable tab", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		tabID := createTripTab(t, app, owner, trip, "moodboard", "To Delete")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs/%s", trip, tabID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNoContent)
	})

	// TODO: add "cannot delete a fixed tab" test once fixed tabs are seeded on trip creation

	t.Run("non-member cannot delete a tab", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		nonMember := createUser(t, app)
		trip := createTrip(t, app, owner)
		tabID := createTripTab(t, app, owner, trip, "moodboard", "Vibes")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs/%s", trip, tabID),
				Method: testkit.DELETE,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete non-existent tab returns 404", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs/%s", trip, uuid.New().String()),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func TestTripTabReorder(t *testing.T) {

	t.Run("member can reorder tabs", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		tab1 := createTripTab(t, app, owner, trip, "moodboard", "Tab 1")
		tab2 := createTripTab(t, app, owner, trip, "blank", "Tab 2")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs/reorder", trip),
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateTripTabOrderRequest{
					Tabs: []models.TripTabOrder{
						{ID: uuid.MustParse(tab1), Position: 1},
						{ID: uuid.MustParse(tab2), Position: 0},
					},
				},
			}).
			AssertStatus(http.StatusNoContent)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs", trip),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		tabs := resp["tabs"].([]interface{})
		first := tabs[0].(map[string]interface{})
		require.Equal(t, tab2, first["id"])
	})

	t.Run("duplicate positions in reorder request returns 400", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		tab1 := createTripTab(t, app, owner, trip, "moodboard", "Tab 1")
		tab2 := createTripTab(t, app, owner, trip, "blank", "Tab 2")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs/reorder", trip),
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateTripTabOrderRequest{
					Tabs: []models.TripTabOrder{
						{ID: uuid.MustParse(tab1), Position: 0},
						{ID: uuid.MustParse(tab2), Position: 0},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("non-member cannot reorder tabs", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		nonMember := createUser(t, app)
		trip := createTrip(t, app, owner)
		tab1 := createTripTab(t, app, owner, trip, "moodboard", "Tab 1")

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/tabs/reorder", trip),
				Method: testkit.PUT,
				UserID: &nonMember,
				Body: models.UpdateTripTabOrderRequest{
					Tabs: []models.TripTabOrder{
						{ID: uuid.MustParse(tab1), Position: 0},
					},
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("invalid trip id returns 400", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/invalid-uuid/tabs/reorder",
				Method: testkit.PUT,
				UserID: &owner,
				Body: models.UpdateTripTabOrderRequest{
					Tabs: []models.TripTabOrder{
						{ID: uuid.New(), Position: 0},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})
}