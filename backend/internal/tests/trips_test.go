package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestTripLifecycle(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()

	var tripID string

	// -------------------
	// Create User
	// -------------------

	username := fakes.GenerateRandomUsername()
	phoneNumber := fakes.GenerateRandomPhoneNumber()

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &authUserID,
			Body: models.CreateUserRequest{
				Name:        "Trip Creator",
				Username:    username,
				PhoneNumber: phoneNumber,
			},
		}).
		AssertStatus(http.StatusCreated)

	// -------------------
	// Create Trip
	// -------------------

	tripName := "Beach-Trip-" + uuid.NewString()

	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/trips",
			Method: testkit.POST,
			UserID: &authUserID,
			Body: models.CreateTripRequest{
				Name:      tripName,
				BudgetMin: 100,
				BudgetMax: 500,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	tripID = resp["id"].(string)

	// -------------------
	// Get Created Trip
	// -------------------

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
			Method: testkit.GET,
			UserID: &authUserID,
		}).
		AssertStatus(http.StatusOK).
		AssertField("name", tripName).
		AssertField("budget_min", float64(100)).
		AssertField("budget_max", float64(500))

	// -------------------
	// Pagination
	// -------------------

	resp = testkit.New(t).
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

	items := resp["items"].([]any)

	var found bool
	for _, it := range items {
		m := it.(map[string]any)
		if m["id"] == tripID {
			found = true
			break
		}
	}

	if !found {
		t.Fatalf("created trip %s not found in list", tripID)
	}

	// -------------------
	// Update Trip
	// -------------------

	newName := "Summer-Trip-" + uuid.NewString()
	budgetMin := 150
	budgetMax := 600

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
			Method: testkit.PATCH,
			UserID: &authUserID,
			Body: models.UpdateTripRequest{
				Name:      &newName,
				BudgetMin: &budgetMin,
				BudgetMax: &budgetMax,
			},
		}).
		AssertStatus(http.StatusOK).
		AssertField("name", newName).
		AssertField("budget_min", float64(150)).
		AssertField("budget_max", float64(600))

	// -------------------
	// Get Updated Trip
	// -------------------

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
			Method: testkit.GET,
			UserID: &authUserID,
		}).
		AssertStatus(http.StatusOK).
		AssertField("name", newName)

	// -------------------
	// Delete Trip
	// -------------------

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
			Method: testkit.DELETE,
			UserID: &authUserID,
		}).
		AssertStatus(http.StatusNoContent)

	// -------------------
	// Get Deleted Trip
	// -------------------

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
			Method: testkit.GET,
			UserID: &authUserID,
		}).
		AssertStatus(http.StatusNotFound)

	// -------------------
	// Update Deleted Trip
	// -------------------

	name := "Ghost"
	min := 100
	max := 200

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
			Method: testkit.PATCH,
			UserID: &authUserID,
			Body: models.UpdateTripRequest{
				Name:      &name,
				BudgetMin: &min,
				BudgetMax: &max,
			},
		}).
		AssertStatus(http.StatusNotFound)

	// -------------------
	// Delete Again (Idempotent)
	// -------------------

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
			Method: testkit.DELETE,
			UserID: &authUserID,
		}).
		AssertStatus(http.StatusNoContent)
}

func TestTripPagination(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()

	// Create user
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &authUserID,
			Body: models.CreateUserRequest{
				Name:        "Pagination Tester",
				Username:    fakes.GenerateRandomUsername(),
				PhoneNumber: fakes.GenerateRandomPhoneNumber(),
			},
		}).
		AssertStatus(http.StatusCreated)

	t.Run("pagination with multiple trips", func(t *testing.T) {
		// Create multiple trips (more than default page size)
		tripIDs := make([]string, 15)
		for i := 0; i < 15; i++ {
			resp := testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/trips",
					Method: testkit.POST,
					UserID: &authUserID,
					Body: models.CreateTripRequest{
						Name:      fmt.Sprintf("Pagination Trip %d", i+1),
						BudgetMin: 100,
						BudgetMax: 500,
					},
				}).
				AssertStatus(http.StatusCreated).
				GetBody()
			tripIDs[i] = resp["id"].(string)
		}

		// Test first page with limit
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips?limit=5",
				Method: testkit.GET,
				UserID: &authUserID,
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
				Route:  fmt.Sprintf("/api/v1/trips?cursor=%s&limit=5", nextCursor),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		nextItems := nextResp["items"].([]interface{})
		require.Equal(t, 5, len(nextItems))
	})

	t.Run("pagination edge cases", func(t *testing.T) {
		// Test zero limit (should return validation error)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips?limit=0",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusUnprocessableEntity)

		// Test negative limit (should return validation error)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips?limit=-1",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusUnprocessableEntity)

		// Test huge limit (should return validation error as it exceeds max of 100)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips?limit=10000",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusUnprocessableEntity)

		// Test invalid cursor
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips?cursor=invalid",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("empty result pagination", func(t *testing.T) {
		// Create a fresh user with no trips
		newUserID := fakes.GenerateUUID()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &newUserID,
				Body: models.CreateUserRequest{
					Name:        "Empty User",
					Username:    fakes.GenerateRandomUsername(),
					PhoneNumber: fakes.GenerateRandomPhoneNumber(),
				},
			}).
			AssertStatus(http.StatusCreated)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.GET,
				UserID: &newUserID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 0, len(items))
		require.Nil(t, resp["next_cursor"])
	})
}

func TestTripValidation(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()

	// Create user
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &authUserID,
			Body: models.CreateUserRequest{
				Name:        "Validation Tester",
				Username:    fakes.GenerateRandomUsername(),
				PhoneNumber: fakes.GenerateRandomPhoneNumber(),
			},
		}).
		AssertStatus(http.StatusCreated)

	t.Run("budget validation - min greater than max", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Invalid Budget Trip",
					BudgetMin: 1000,
					BudgetMax: 500, // Max less than min
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity) // 422
	})

	t.Run("negative budget values", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Negative Budget Trip",
					BudgetMin: -100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity) // 422
	})

	t.Run("empty trip name", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity) // 422
	})

	t.Run("invalid cover image ID", func(t *testing.T) {
		invalidImageID := uuid.New() // Non-existent image
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:         "Invalid Image Trip",
					BudgetMin:    100,
					BudgetMax:    500,
					CoverImageID: &invalidImageID,
				},
			}).
			AssertStatus(http.StatusBadRequest) // 400 for referential integrity
	})
}
