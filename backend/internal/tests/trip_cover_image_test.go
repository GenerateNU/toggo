package tests

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestTripCoverImageEndpoints(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()

	// Create user first
	t.Run("create user", func(t *testing.T) {
		username := fakes.GenerateRandomUsername()
		phoneNumber := fakes.GenerateRandomPhoneNumber()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateUserRequest{
					Name:        "Test User",
					Username:    username,
					PhoneNumber: phoneNumber,
				},
			}).
			AssertStatus(http.StatusCreated)
	})

	t.Run("create trip without cover image returns null cover_image_url", func(t *testing.T) {
		// Create trip without cover image
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Trip Without Cover",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		// Check if trip creation succeeded
		tripIDInterface := resp["id"]
		if tripIDInterface == nil {
			t.Fatalf("Trip creation failed - ID is nil. Response: %+v", resp)
		}

		tripID, ok := tripIDInterface.(string)
		if !ok {
			t.Fatalf("Expected trip ID to be a string, got: %T %v", tripIDInterface, tripIDInterface)
		}

		// Get trip and verify cover_image_url is null
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Trip Without Cover").
			AssertField("cover_image_url", nil)
	})

	t.Run("create trip with cover image returns presigned URL", func(t *testing.T) {
		// Create test image first in database
		db := fakes.GetSharedDB()
		testImageID := uuid.New()

		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: testImageID,
				FileKey: "test-images/cover.jpg",
				Size:    models.ImageSizeMedium,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(context.Background())
		assert.NoError(t, err)

		// Create trip with cover image
		var tripID string
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:         "Trip With Cover",
					BudgetMin:    100,
					BudgetMax:    500,
					CoverImageID: &testImageID,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		// Check if trip creation succeeded
		tripIDInterface := resp["id"]
		if tripIDInterface == nil {
			t.Fatalf("Trip creation failed - ID is nil. Response: %+v", resp)
		}

		tripID, ok := tripIDInterface.(string)
		if !ok {
			t.Fatalf("Expected trip ID to be a string, got: %T %v", tripIDInterface, tripIDInterface)
		}

		// Get trip and verify cover image URL is present
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("name", "Trip With Cover").
			AssertFieldExists("cover_image_url")
	})

	t.Run("get trips with cursor includes cover image URLs", func(t *testing.T) {
		// Get all trips and verify cover image handling
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips?limit=10",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items, ok := resp["items"].([]interface{})
		assert.True(t, ok)
		assert.GreaterOrEqual(t, len(items), 1)

		// Verify that trips have the cover_image_url field (can be null or string)
		for _, item := range items {
			tripData := item.(map[string]interface{})
			_, exists := tripData["cover_image_url"]
			assert.True(t, exists, "cover_image_url field should exist in response")
		}
	})

	t.Run("update trip to add cover image", func(t *testing.T) {
		db := fakes.GetSharedDB()

		// Create new test image for update
		newImageID := uuid.New()
		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: newImageID,
				FileKey: "test-images/new-cover.jpg",
				Size:    models.ImageSizeMedium,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(context.Background())
		assert.NoError(t, err)

		// Create trip without cover image first
		var tripID string
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Trip to Update",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID = resp["id"].(string)

		// Update trip to add cover image
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.PATCH,
				UserID: &authUserID,
				Body: models.UpdateTripRequest{
					CoverImageID: &newImageID,
				},
			}).
			AssertStatus(http.StatusOK)

		// Verify cover image was added
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s", tripID),
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertFieldExists("cover_image_url")
	})
}
