package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestTripLifecycle(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()

	var tripID string

	t.Run("create trip", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Beach Trip",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID = resp["id"].(string)
	})

	t.Run("get created trip", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Beach Trip").
			AssertField("budget_min", float64(100)).
			AssertField("budget_max", float64(500))
	})

	t.Run("get trips with cursor pagination", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.GET,
				UserID: &authUserID,
				Query:  map[string]string{"limit": "20"},
			}).
			AssertStatus(http.StatusOK).
			AssertFieldExists("items").
			AssertField("limit", float64(20)).
			GetBody()

		items, ok := resp["items"].([]any)
		if !ok {
			t.Fatal("items is not an array")
		}
		// Created trip should appear in first page
		var found bool
		for _, it := range items {
			m, ok := it.(map[string]any)
			if !ok {
				continue
			}
			if m["id"] == tripID {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("created trip %s not found in paginated items", tripID)
		}
	})

	t.Run("update trip", func(t *testing.T) {
		name := "Summer Beach Trip"
		budgetMin := 150
		budgetMax := 600
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateTripRequest{
					Name:      &name,
					BudgetMin: &budgetMin,
					BudgetMax: &budgetMax,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Summer Beach Trip").
			AssertField("budget_min", float64(150)).
			AssertField("budget_max", float64(600))
	})

	t.Run("get updated trip", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Summer Beach Trip").
			AssertField("budget_min", float64(150))
	})

	t.Run("delete trip", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.DELETE,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("get deleted trip returns 404", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("update deleted trip returns 404", func(t *testing.T) {
		name := "Ghost Trip"
		budgetMin := 100
		budgetMax := 500
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateTripRequest{
					Name:      &name,
					BudgetMin: &budgetMin,
					BudgetMax: &budgetMax,
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete trip again is idempotent", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.DELETE,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusNoContent)
	})
}