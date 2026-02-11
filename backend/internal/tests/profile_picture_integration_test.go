package tests

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"
)

func TestMembershipProfilePictureURLFromAPI(t *testing.T) {
	app := fakes.GetSharedTestApp()
	ctx := context.Background()

	// Create user once for this test file
	userAuthID := fakes.GenerateUUID()

	userResp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &userAuthID,
			Body: models.CreateUserRequest{
				Name:        "Profile User",
				Username:    fakes.GenerateRandomUsername(),
				PhoneNumber: fakes.GenerateRandomPhoneNumber(),
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	userID := userResp["id"].(string)

	t.Run("membership without profile picture returns null", func(t *testing.T) {
		// Create trip
		tripResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &userAuthID,
				Body: models.CreateTripRequest{
					Name:      "Profile Pic Trip No Image",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID := tripResp["id"].(string)

		// Fetch memberships
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships", tripID),
				Method: testkit.GET,
				UserID: &userAuthID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items, ok := resp["items"].([]interface{})
		require.True(t, ok, "items field missing or invalid type")

		var member map[string]interface{}
		for _, item := range items {
			entry, castOK := item.(map[string]interface{})
			if !castOK {
				continue
			}
			if id, _ := entry["user_id"].(string); id == userID {
				member = entry
				break
			}
		}

		require.NotNil(t, member, "expected membership for user")

		// Should be nil when no profile picture is set
		profilePictureURL := member["profile_picture_url"]
		require.Nil(t, profilePictureURL)
	})

	t.Run("membership with profile picture returns url", func(t *testing.T) {
		// Create profile picture image for user
		db := fakes.GetSharedDB()
		profileImageID := uuid.New()
		uniqueFileKey := fmt.Sprintf("member_test_%s_%s_small.jpg", t.Name(), uuid.NewString())

		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: profileImageID,
				FileKey: uniqueFileKey,
				Size:    models.ImageSizeSmall,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(ctx)
		require.NoError(t, err)

		// Update user with profile picture
		_, err = db.NewUpdate().
			Model(&models.User{}).
			Set("profile_picture = ?", profileImageID).
			Where("id = ?", userID).
			Exec(ctx)
		require.NoError(t, err)

		// Create trip
		tripResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &userAuthID,
				Body: models.CreateTripRequest{
					Name:      "Profile Pic Trip With Image",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID := tripResp["id"].(string)

		// Fetch memberships
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships", tripID),
				Method: testkit.GET,
				UserID: &userAuthID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items, ok := resp["items"].([]interface{})
		require.True(t, ok, "items field missing or invalid type")

		var member map[string]interface{}
		for _, item := range items {
			entry, castOK := item.(map[string]interface{})
			if !castOK {
				continue
			}
			if id, _ := entry["user_id"].(string); id == userID {
				member = entry
				break
			}
		}

		require.NotNil(t, member, "expected membership for user")

		rawURL, ok := member["profile_picture_url"].(string)
		require.True(t, ok, "profile_picture_url missing or not string")
		require.NotEmpty(t, rawURL)
		require.Contains(t, rawURL, uniqueFileKey)
	})
}

func TestCommentProfilePictureURLFromAPI(t *testing.T) {
	app := fakes.GetSharedTestApp()
	ctx := context.Background()

	// Create user once for this test file
	userAuthID := fakes.GenerateUUID()

	userResp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &userAuthID,
			Body: models.CreateUserRequest{
				Name:        "Comment User",
				Username:    fakes.GenerateRandomUsername(),
				PhoneNumber: fakes.GenerateRandomPhoneNumber(),
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	userID := userResp["id"].(string)

	t.Run("comment without profile picture returns null", func(t *testing.T) {
		// Create trip
		tripResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &userAuthID,
				Body: models.CreateTripRequest{
					Name:      "Comment Trip No Image",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID := tripResp["id"].(string)

		// Create a comment
		activityID := uuid.New()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &userAuthID,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(tripID),
					EntityType: models.ActivityEntity,
					EntityID:   activityID,
					Content:    "Test comment no pic",
				},
			}).
			AssertStatus(http.StatusCreated)

		// Fetch comments
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", tripID, activityID),
				Method: testkit.GET,
				UserID: &userAuthID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items, ok := resp["items"].([]interface{})
		require.True(t, ok, "items field missing or invalid type")
		require.Greater(t, len(items), 0, "expected at least one comment")

		comment := items[0].(map[string]interface{})

		// Should be nil when no profile picture is set
		profilePictureURL := comment["profile_picture_url"]
		require.Nil(t, profilePictureURL)
	})

	t.Run("comment with profile picture returns url", func(t *testing.T) {
		// Create profile picture image for user
		db := fakes.GetSharedDB()
		profileImageID := uuid.New()
		uniqueFileKey := fmt.Sprintf("comment_test_%s_%s_small.jpg", t.Name(), uuid.NewString())

		_, err := db.NewInsert().
			Model(&models.Image{
				ImageID: profileImageID,
				FileKey: uniqueFileKey,
				Size:    models.ImageSizeSmall,
				Status:  models.UploadStatusConfirmed,
			}).
			Exec(ctx)
		require.NoError(t, err)

		// Update user with profile picture
		_, err = db.NewUpdate().
			Model(&models.User{}).
			Set("profile_picture = ?", profileImageID).
			Where("id = ?", userID).
			Exec(ctx)
		require.NoError(t, err)

		// Create trip
		tripResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips",
				Method: testkit.POST,
				UserID: &userAuthID,
				Body: models.CreateTripRequest{
					Name:      "Comment Trip With Image",
					BudgetMin: 100,
					BudgetMax: 500,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		tripID := tripResp["id"].(string)

		// Create a comment
		activityID := uuid.New()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &userAuthID,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(tripID),
					EntityType: models.ActivityEntity,
					EntityID:   activityID,
					Content:    "Test comment with profile pic",
				},
			}).
			AssertStatus(http.StatusCreated)

		// Fetch comments
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", tripID, activityID),
				Method: testkit.GET,
				UserID: &userAuthID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items, ok := resp["items"].([]interface{})
		require.True(t, ok, "items field missing or invalid type")
		require.Greater(t, len(items), 0, "expected at least one comment")

		var matched map[string]interface{}
		for _, item := range items {
			comment := item.(map[string]interface{})
			if comment["content"].(string) == "Test comment with profile pic" {
				matched = comment
				break
			}
		}

		require.NotNil(t, matched, "expected to find created comment")

		rawURL, ok := matched["profile_picture_url"].(string)
		require.True(t, ok)
		require.NotEmpty(t, rawURL)
		require.Contains(t, rawURL, uniqueFileKey)
		require.True(t, strings.Contains(rawURL, "http"))
	})
}
