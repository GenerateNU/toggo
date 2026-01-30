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

	t.Run("get all trips", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("update trip", func(t *testing.T) {
		name := "Summer Beach Trip"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateTripRequest{
					Name:      &name,
					BudgetMin: 150,
					BudgetMax: 600,
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
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateTripRequest{
					Name:      &name,
					BudgetMin: 100,
					BudgetMax: 500,
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
