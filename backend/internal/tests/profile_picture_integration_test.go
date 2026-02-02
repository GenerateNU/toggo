package tests

import (
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

const (
	memberProfileFileKey  = "comment_test_user1_small.jpg"
	commentProfileFileKey = "comment_test_user1_small.jpg"
)

func TestMembershipProfilePictureURLFromAPI(t *testing.T) {
	t.Parallel()

	app := fakes.GetSharedTestApp()

	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/memberships", commentTestTrip1),
			Method: testkit.GET,
			UserID: strPtr(commentTestUser1),
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
		if userID, _ := entry["user_id"].(string); userID == commentTestUser1 {
			member = entry
			break
		}
	}
	require.NotNil(t, member, "expected membership for user %s", commentTestUser1)

	rawURL, ok := member["profile_picture_url"].(string)
	require.True(t, ok, "profile_picture_url missing or not a string")
	require.NotEmpty(t, rawURL)
	require.Contains(t, rawURL, memberProfileFileKey)
}

func TestCommentProfilePictureURLFromAPI(t *testing.T) {
	t.Parallel()

	app := fakes.GetSharedTestApp()

	activityID := uuid.New().String()

	createResp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/comments",
			Method: testkit.POST,
			UserID: strPtr(commentTestUser1),
			Body: models.CreateCommentRequest{
				TripID:     uuid.MustParse(commentTestTrip1),
				EntityType: models.Activity,
				EntityID:   uuid.MustParse(activityID),
				Content:    "Profile pic test",
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	commentID, _ := createResp["id"].(string)
	require.NotEmpty(t, commentID)

	listResp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", commentTestTrip1, activityID),
			Method: testkit.GET,
			UserID: strPtr(commentTestUser1),
		}).
		AssertStatus(http.StatusOK).
		GetBody()

	items, ok := listResp["items"].([]interface{})
	require.True(t, ok, "items field missing or invalid type")

	var matched map[string]interface{}
	for _, item := range items {
		entry, castOK := item.(map[string]interface{})
		if !castOK {
			continue
		}
		if id, _ := entry["id"].(string); id == commentID {
			matched = entry
			break
		}
	}
	require.NotNil(t, matched, "expected to find created comment in response")

	rawURL, ok := matched["profile_picture_url"].(string)
	require.True(t, ok, "profile_picture_url missing or not a string")
	require.NotEmpty(t, rawURL)
	require.Contains(t, rawURL, commentProfileFileKey)

	// Ensure URL contains expected key rather than just being a placeholder.
	require.True(t, strings.Contains(rawURL, "http"), "presigned URL should look like a URL")
}
