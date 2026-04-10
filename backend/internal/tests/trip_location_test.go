package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestTripLocation(t *testing.T) {
	app := fakes.GetSharedTestApp()
	ownerID := createUser(t, app)

	t.Run("create trip without location", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &ownerID,
				Body: models.CreateTripRequest{
					Name:      "Trip Without Location",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		_, hasLocation := resp["location"]
		require.False(t, hasLocation, "location should not be present when not set")
	})

	t.Run("update trip with location", func(t *testing.T) {
		tripID := createTrip(t, app, ownerID)

		location := "Paris, France"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Location: &location,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", location)
	})

	t.Run("get trip with location", func(t *testing.T) {
		tripID := createTrip(t, app, ownerID)

		location := "Tokyo, Japan"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Location: &location,
				},
			}).
			AssertStatus(http.StatusOK)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &ownerID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", location)
	})

	t.Run("location appears in list response", func(t *testing.T) {
		listOwnerID := createUser(t, app)

		location := "New York, NY, USA"
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &listOwnerID,
				Body: models.CreateTripRequest{
					Name:      "Listed Trip With Location",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID := resp["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &listOwnerID,
				Body: models.UpdateTripRequest{
					Location: &location,
				},
			}).
			AssertStatus(http.StatusOK)

		listResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.GET,
				UserID: &listOwnerID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := listResp["items"].([]interface{})
		require.Equal(t, 1, len(items))
		trip := items[0].(map[string]interface{})
		require.Equal(t, tripID, trip["id"])
		require.Equal(t, location, trip["location"])
	})

	t.Run("update location to different value", func(t *testing.T) {
		tripID := createTrip(t, app, ownerID)

		firstLocation := "London, UK"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Location: &firstLocation,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", firstLocation)

		secondLocation := "Barcelona, Spain"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Location: &secondLocation,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", secondLocation)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &ownerID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", secondLocation)
	})

	t.Run("location can be set to empty string", func(t *testing.T) {
		tripID := createTrip(t, app, ownerID)

		location := "Berlin, Germany"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Location: &location,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", location)

		emptyLocation := ""
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Location: &emptyLocation,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", emptyLocation)
	})

	t.Run("location accepts long strings", func(t *testing.T) {
		tripID := createTrip(t, app, ownerID)

		longLocation := "1600 Amphitheatre Parkway, Mountain View, CA 94043, United States of America"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Location: &longLocation,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("location", longLocation)
	})

	t.Run("update location along with other fields", func(t *testing.T) {
		tripID := createTrip(t, app, ownerID)

		newName := "Updated Trip Name"
		location := "Amsterdam, Netherlands"
		budgetMin := 200
		budgetMax := 800

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &ownerID,
				Body: models.UpdateTripRequest{
					Name:      &newName,
					Location:  &location,
					BudgetMin: &budgetMin,
					BudgetMax: &budgetMax,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", newName).
			AssertField("location", location).
			AssertField("budget_min", float64(200)).
			AssertField("budget_max", float64(800))
	})
}
