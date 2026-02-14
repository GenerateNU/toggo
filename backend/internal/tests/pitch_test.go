package tests

import (
	"net/http"
	"testing"
	"toggo/internal/config"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Pitch endpoints use S3 for presigned URLs. To run Create/Get/List/Update tests that return
// audio_url, configure S3 (e.g. LocalStack: S3_ENDPOINT, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID,
// AWS_SECRET_ACCESS_KEY, AWS_REGION). Tests that need S3 call requireS3(t) and skip when not configured.

func requireS3(t *testing.T) {
	t.Helper()
	cfg, err := config.LoadConfiguration()
	require.NoError(t, err)
	if cfg == nil || cfg.AWS.BucketName == "" {
		t.Skip("S3 not configured (set S3_BUCKET_NAME and AWS env for LocalStack to run pitch presign tests)")
	}
}

/* =========================
   Helpers
=========================*/

func createPitch(t *testing.T, app *fiber.App, userID, tripID string, title, contentType string) (pitchID string, uploadURL string) {
	requireS3(t)
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/trips/" + tripID + "/pitches",
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreatePitchRequest{
				Title:       title,
				Description: "",
				ContentType: contentType,
			},
		}).
		AssertStatus(http.StatusCreated).
		AssertFieldExists("pitch").
		AssertFieldExists("upload_url").
		GetBody()

	pitch := resp["pitch"].(map[string]any)
	pitchID = pitch["id"].(string)
	uploadURL = resp["upload_url"].(string)
	return pitchID, uploadURL
}

/* =========================
   CREATE
=========================*/

func TestPitchCreate(t *testing.T) {
	app := fakes.GetSharedTestApp()
	userID := createTestUser(t, app, "PitchUser", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	tripID := createTestTrip(t, app, userID, "PitchTrip", 100, 500)

	t.Run("creates pitch and returns upload_url", func(t *testing.T) {
		requireS3(t)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:       "My pitch",
					Description: "Optional desc",
					ContentType: "audio/mpeg",
				},
			}).
			AssertStatus(http.StatusCreated).
			AssertFieldExists("pitch").
			AssertFieldExists("upload_url").
			AssertFieldExists("expires_at").
			GetBody()

		pitch := resp["pitch"].(map[string]any)
		assert.Equal(t, "My pitch", pitch["title"])
		assert.Equal(t, "Optional desc", pitch["description"])
		assert.NotEmpty(t, pitch["id"])
		assert.Equal(t, tripID, pitch["trip_id"])
		assert.Equal(t, userID, pitch["user_id"])
		assert.NotEmpty(t, resp["upload_url"])
	})

	t.Run("invalid trip ID returns 400", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/not-a-uuid/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:       "Pitch",
					ContentType: "audio/mpeg",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("validation error returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:       "",
					ContentType: "audio/mpeg",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("non-member gets 404", func(t *testing.T) {
		otherUser := createTestUser(t, app, "Other", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &otherUser,
				Body: models.CreatePitchRequest{
					Title:       "Pitch",
					ContentType: "audio/mpeg",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})
}

/* =========================
   LIST
=========================*/

func TestPitchList(t *testing.T) {
	app := fakes.GetSharedTestApp()
	userID := createTestUser(t, app, "ListUser", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	tripID := createTestTrip(t, app, userID, "ListTrip", 100, 500)

	t.Run("returns empty list", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("limit", float64(20)).
			AssertFieldExists("items").
			GetBody()
		items, ok := resp["items"].([]any)
		require.True(t, ok)
		assert.Len(t, items, 0)
	})

	t.Run("returns pitches with audio_url when S3 configured", func(t *testing.T) {
		_, _ = createPitch(t, app, userID, tripID, "P1", "audio/mpeg")
		requireS3(t)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		items, ok := resp["items"].([]any)
		require.True(t, ok)
		require.GreaterOrEqual(t, len(items), 1)
		first := items[0].(map[string]any)
		assert.Equal(t, "P1", first["title"])
		assert.Contains(t, first, "audio_url")
	})

	t.Run("invalid trip ID returns 400", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/bad-uuid/pitches",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   GET
=========================*/

func TestPitchGet(t *testing.T) {
	app := fakes.GetSharedTestApp()
	userID := createTestUser(t, app, "GetUser", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	tripID := createTestTrip(t, app, userID, "GetTrip", 100, 500)

	t.Run("returns pitch when S3 configured", func(t *testing.T) {
		pitchID, _ := createPitch(t, app, userID, tripID, "GetMe", "audio/wav")
		requireS3(t)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		assert.Equal(t, "GetMe", resp["title"])
		assert.Equal(t, pitchID, resp["id"])
		assert.Contains(t, resp, "audio_url")
	})

	t.Run("not found returns 404", func(t *testing.T) {
		badID := uuid.New().String()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + badID,
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("invalid pitch ID returns 400", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/not-a-uuid",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   UPDATE
=========================*/

func TestPitchUpdate(t *testing.T) {
	app := fakes.GetSharedTestApp()
	userID := createTestUser(t, app, "UpdateUser", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	tripID := createTestTrip(t, app, userID, "UpdateTrip", 100, 500)

	t.Run("updates pitch when S3 configured", func(t *testing.T) {
		pitchID, _ := createPitch(t, app, userID, tripID, "Original", "audio/mpeg")
		requireS3(t)
		duration := 120
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.PATCH,
				UserID: &userID,
				Body: models.UpdatePitchRequest{
					Title:       strPtr("Updated title"),
					Description: strPtr("Updated desc"),
					Duration:    &duration,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("title", "Updated title").
			AssertField("description", "Updated desc").
			AssertField("duration", float64(120))
	})

	t.Run("not found returns 404", func(t *testing.T) {
		badID := uuid.New().String()
		title := "No"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + badID,
				Method: testkit.PATCH,
				UserID: &userID,
				Body:   models.UpdatePitchRequest{Title: &title},
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func strPtr(s string) *string { return &s }

/* =========================
   DELETE
=========================*/

func TestPitchDelete(t *testing.T) {
	app := fakes.GetSharedTestApp()
	userID := createTestUser(t, app, "DelUser", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	tripID := createTestTrip(t, app, userID, "DelTrip", 100, 500)

	t.Run("deletes pitch", func(t *testing.T) {
		pitchID, _ := createPitch(t, app, userID, tripID, "ToDelete", "audio/mpeg")
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.DELETE,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNoContent)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		badID := uuid.New().String()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + badID,
				Method: testkit.DELETE,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNotFound)
	})
}
