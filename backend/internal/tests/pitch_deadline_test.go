package tests

import (
	"fmt"
	"net/http"
	"testing"
	"time"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestTripPitchDeadline(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creates trip with pitch deadline in the future", func(t *testing.T) {
		t.Parallel()
		owner := createUser(t, app)
		deadline := time.Now().UTC().Add(48 * time.Hour)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateTripRequest{
					Name:          "Trip with deadline",
					BudgetMin:     100,
					BudgetMax:     500,
					PitchDeadline: &deadline,
				},
			}).
			AssertStatus(http.StatusCreated).
			AssertFieldExists("pitch_deadline")
	})

	t.Run("rejects trip with pitch deadline in the past", func(t *testing.T) {
		t.Parallel()
		owner := createUser(t, app)
		past := time.Now().UTC().Add(-24 * time.Hour)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateTripRequest{
					Name:          "Trip with past deadline",
					BudgetMin:     100,
					BudgetMax:     500,
					PitchDeadline: &past,
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("creates trip without pitch deadline", func(t *testing.T) {
		t.Parallel()
		owner := createUser(t, app)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreateTripRequest{
					Name:      "Trip without deadline",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		if _, ok := resp["pitch_deadline"]; ok {
			t.Errorf("expected pitch_deadline to be absent, got %v", resp["pitch_deadline"])
		}
	})

	t.Run("updates trip pitch deadline to a future time", func(t *testing.T) {
		t.Parallel()
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		deadline := time.Now().UTC().Add(72 * time.Hour)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", trip),
				Method: testkit.PATCH,
				UserID: &owner,
				Body: models.UpdateTripRequest{
					PitchDeadline: &deadline,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertFieldExists("pitch_deadline")
	})

	t.Run("rejects updating pitch deadline to the past", func(t *testing.T) {
		t.Parallel()
		owner := createUser(t, app)
		trip := createTrip(t, app, owner)
		past := time.Now().UTC().Add(-1 * time.Hour)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", trip),
				Method: testkit.PATCH,
				UserID: &owner,
				Body: models.UpdateTripRequest{
					PitchDeadline: &past,
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})
}
