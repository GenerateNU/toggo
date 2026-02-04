package tests

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestTripCoverImageEndpoints(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID := fakes.GenerateUUID()

	// Create user once for this test file
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

	t.Run("create trip without cover image returns null", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Trip-No-Cover-" + uuid.NewString(),
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
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("cover_image_url", nil)
	})

	t.Run("create trip with cover image returns url", func(t *testing.T) {
		db := fakes.GetSharedDB()
		imageID := uuid.New()

		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: imageID,
				FileKey: "test-images/cover-" + uuid.NewString() + ".jpg",
				Size:    models.ImageSizeMedium,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(context.Background())

		assert.NoError(t, err)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:         "Trip-With-Cover-" + uuid.NewString(),
					BudgetMin:    100,
					BudgetMax:    500,
					CoverImageID: &imageID,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID := resp["id"].(string)

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

	t.Run("list trips includes cover_image_url field", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips?limit=10",
				Method: testkit.GET,
				UserID: &authUserID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		assert.NotNil(t, items)

		for _, item := range items {
			trip := item.(map[string]interface{})
			_, exists := trip["cover_image_url"]
			assert.True(t, exists)
		}
	})

	t.Run("update trip to add cover image", func(t *testing.T) {
		db := fakes.GetSharedDB()
		imageID := uuid.New()

		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: imageID,
				FileKey: "test-images/new-cover-" + uuid.NewString() + ".jpg",
				Size:    models.ImageSizeMedium,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(context.Background())

		assert.NoError(t, err)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &authUserID,
				Body: models.CreateTripRequest{
					Name:      "Trip-Update-" + uuid.NewString(),
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
				UserID: &authUserID,
				Body: models.UpdateTripRequest{
					CoverImageID: &imageID,
				},
			}).
			AssertStatus(http.StatusOK)

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
