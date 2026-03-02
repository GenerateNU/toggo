package tests

import (
	"context"
	"net/http"
	"testing"
	"toggo/internal/config"
	"toggo/internal/models"
	"toggo/internal/services"
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
				Title:         title,
				Description:   "",
				ContentType:   contentType,
				ContentLength: 1024,
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
					Title:         "My pitch",
					Description:   "Optional desc",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
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
					Title:         "Pitch",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
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
					Title:         "",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
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
					Title:         "Pitch",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("content_length exceeds max returns 400", func(t *testing.T) {
		requireS3(t)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:         "Pitch",
					ContentType:   "audio/mpeg",
					ContentLength: services.MaxPitchAudioSize + 1,
				},
			}).
			AssertStatus(http.StatusBadRequest)
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

	t.Run("non-member gets 404", func(t *testing.T) {
		pitchID, _ := createPitch(t, app, userID, tripID, "AuthPitch", "audio/mpeg")
		otherUser := createTestUser(t, app, "Other", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
		title := "Hacked"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.PATCH,
				UserID: &otherUser,
				Body:   models.UpdatePitchRequest{Title: &title},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-creator member gets 403", func(t *testing.T) {
		pitchID, _ := createPitch(t, app, userID, tripID, "AuthPitch2", "audio/mpeg")
		memberID := createTestUser(t, app, "Member", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
		addMember(t, app, userID, memberID, tripID)
		title := "Hacked"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.PATCH,
				UserID: &memberID,
				Body:   models.UpdatePitchRequest{Title: &title},
			}).
			AssertStatus(http.StatusForbidden)
	})
}

func strPtr(s string) *string { return &s }

// createConfirmedImage inserts a confirmed image row directly into the DB and returns its ID.
// This bypasses the S3 upload flow, mirroring the pattern used in trip_cover_image_test.go.
func createConfirmedImage(t *testing.T) uuid.UUID {
	t.Helper()
	db := fakes.GetSharedDB()
	imageID := uuid.New()
	_, err := db.NewInsert().
		Model(&models.Image{
			ImageID: imageID,
			FileKey: "test-images/pitch-" + imageID.String() + ".jpg",
			Size:    models.ImageSizeMedium,
			Status:  models.UploadStatusConfirmed,
		}).
		Exec(context.Background())
	require.NoError(t, err)
	return imageID
}

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

/* =========================
   IMAGE ASSOCIATIONS
=========================*/

func TestPitchImages(t *testing.T) {
	app := fakes.GetSharedTestApp()
	userID := createTestUser(t, app, "ImgUser", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	tripID := createTestTrip(t, app, userID, "ImgTrip", 100, 500)

	// -- CREATE with images --

	t.Run("create pitch with image_ids returns them in response", func(t *testing.T) {
		requireS3(t)
		imgID := createConfirmedImage(t)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:         "Pitch with image",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
					ImageIDs:      []uuid.UUID{imgID},
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()
		pitch := resp["pitch"].(map[string]any)
		ids, ok := pitch["image_ids"].([]any)
		require.True(t, ok)
		require.Len(t, ids, 1)
		assert.Equal(t, imgID.String(), ids[0].(string))
	})

	t.Run("create pitch with too many images returns 422", func(t *testing.T) {
		requireS3(t)
		tooMany := make([]uuid.UUID, models.MaxPitchImages+1)
		for i := range tooMany {
			tooMany[i] = createConfirmedImage(t)
		}
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:         "Too many",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
					ImageIDs:      tooMany,
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("create pitch with non-existent image ID returns 400", func(t *testing.T) {
		requireS3(t)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:         "Bad image",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
					ImageIDs:      []uuid.UUID{uuid.New()}, // does not exist
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("create pitch with duplicate image IDs returns 400", func(t *testing.T) {
		requireS3(t)
		imgID := createConfirmedImage(t)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreatePitchRequest{
					Title:         "Dup image",
					ContentType:   "audio/mpeg",
					ContentLength: 1024,
					ImageIDs:      []uuid.UUID{imgID, imgID},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	// -- GET includes image_ids --

	t.Run("get pitch includes image_ids", func(t *testing.T) {
		requireS3(t)
		imgID := createConfirmedImage(t)
		pitchID, _ := createPitchWithImages(t, app, userID, tripID, "GetWithImg", []uuid.UUID{imgID})
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		ids, ok := resp["image_ids"].([]any)
		require.True(t, ok)
		require.Len(t, ids, 1)
		assert.Equal(t, imgID.String(), ids[0].(string))
	})

	// -- LIST includes image_ids --

	t.Run("list pitches includes image_ids", func(t *testing.T) {
		requireS3(t)
		imgID := createConfirmedImage(t)
		pitchID, _ := createPitchWithImages(t, app, userID, tripID, "ListWithImg", []uuid.UUID{imgID})
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		items := resp["items"].([]any)
		found := false
		for _, item := range items {
			p := item.(map[string]any)
			if p["id"].(string) == pitchID {
				found = true
				ids, ok := p["image_ids"].([]any)
				require.True(t, ok)
				require.Len(t, ids, 1)
				assert.Equal(t, imgID.String(), ids[0].(string))
			}
		}
		assert.True(t, found, "pitch not found in list response")
	})

	// -- UPDATE image associations --

	t.Run("update adds image associations (existing images are not removed)", func(t *testing.T) {
		requireS3(t)
		img1 := createConfirmedImage(t)
		img2 := createConfirmedImage(t)
		pitchID, _ := createPitchWithImages(t, app, userID, tripID, "AddImg", []uuid.UUID{img1})

		img2Slice := []uuid.UUID{img2}
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.PATCH,
				UserID: &userID,
				Body:   models.UpdatePitchRequest{ImageIDs: &img2Slice},
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		ids, ok := resp["image_ids"].([]any)
		require.True(t, ok)
		// Both img1 (existing) and img2 (newly added) should be present.
		require.Len(t, ids, 2)
		idStrs := []string{ids[0].(string), ids[1].(string)}
		assert.Contains(t, idStrs, img1.String())
		assert.Contains(t, idStrs, img2.String())
	})

	t.Run("update with empty image_ids removes all associations", func(t *testing.T) {
		requireS3(t)
		imgID := createConfirmedImage(t)
		pitchID, _ := createPitchWithImages(t, app, userID, tripID, "RemoveImg", []uuid.UUID{imgID})

		empty := []uuid.UUID{}
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.PATCH,
				UserID: &userID,
				Body:   models.UpdatePitchRequest{ImageIDs: &empty},
			}).
			AssertStatus(http.StatusOK)

		// Follow-up GET must confirm the image association was actually removed.
		getResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		// image_ids is omitempty — absent key or empty slice both mean no images.
		if ids, ok := getResp["image_ids"].([]any); ok {
			assert.Len(t, ids, 0)
		}
	})

	t.Run("update with duplicate image IDs returns 400", func(t *testing.T) {
		requireS3(t)
		imgID := createConfirmedImage(t)
		pitchID, _ := createPitch(t, app, userID, tripID, "DupUpdateImg", "audio/mpeg")
		dupSlice := []uuid.UUID{imgID, imgID}
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.PATCH,
				UserID: &userID,
				Body:   models.UpdatePitchRequest{ImageIDs: &dupSlice},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("update omitting image_ids leaves associations unchanged", func(t *testing.T) {
		requireS3(t)
		imgID := createConfirmedImage(t)
		pitchID, _ := createPitchWithImages(t, app, userID, tripID, "KeepImg", []uuid.UUID{imgID})

		newTitle := "KeepImg Updated"
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/" + tripID + "/pitches/" + pitchID,
				Method: testkit.PATCH,
				UserID: &userID,
				// ImageIDs is nil (omitted) — images must be unchanged
				Body: models.UpdatePitchRequest{Title: &newTitle},
			}).
			AssertStatus(http.StatusOK).
			GetBody()
		assert.Equal(t, newTitle, resp["title"])
		ids, ok := resp["image_ids"].([]any)
		require.True(t, ok)
		require.Len(t, ids, 1)
		assert.Equal(t, imgID.String(), ids[0].(string))
	})
}

// createPitchWithImages is like createPitch but also sends image_ids in the request body.
func createPitchWithImages(t *testing.T, app *fiber.App, userID, tripID string, title string, imageIDs []uuid.UUID) (pitchID string, uploadURL string) {
	t.Helper()
	requireS3(t)
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/trips/" + tripID + "/pitches",
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreatePitchRequest{
				Title:         title,
				ContentType:   "audio/mpeg",
				ContentLength: 1024,
				ImageIDs:      imageIDs,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()
	pitch := resp["pitch"].(map[string]any)
	pitchID = pitch["id"].(string)
	uploadURL = resp["upload_url"].(string)
	return pitchID, uploadURL
}
