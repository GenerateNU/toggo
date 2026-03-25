package tests

import (
	"fmt"
	"net/http"
	"net/url"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func createTestComment(t *testing.T, app *fiber.App, userID, tripID string, entityType models.EntityType, entityID uuid.UUID, content string) string {
	t.Helper()

	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/comments",
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreateCommentRequest{
				TripID:     uuid.MustParse(tripID),
				EntityType: entityType,
				EntityID:   entityID,
				Content:    content,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	return resp["id"].(string)
}

func TestCommentReactions(t *testing.T) {
	app := fakes.GetSharedTestApp()

	activityID := uuid.New()
	user1 := createTestUser(t, app, "User1", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	user2 := createTestUser(t, app, "User2", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	nonMember := createTestUser(t, app, "User3", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())

	tripID := createTestTrip(t, app, user1, "Trip", 1000, 5000)
	addUserToTrip(t, app, user1, user2, tripID)

	commentID := createTestComment(t, app, user1, tripID, models.ActivityEntity, activityID, "react to me")

	addRoute := fmt.Sprintf("/api/v1/comments/%s/reactions", commentID)
	getRoute := fmt.Sprintf("/api/v1/comments/%s/reactions", commentID)

	t.Run("unauthenticated cannot add/remove", func(t *testing.T) {
		auth := false

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				Auth:   &auth,
				Body:   models.CreateCommentReactionRequest{Emoji: "👍"},
			}).
			AssertStatus(http.StatusUnauthorized)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.DELETE,
				Auth:   &auth,
				Body:   models.DeleteCommentReactionRequest{Emoji: "👍"},
			}).
			AssertStatus(http.StatusUnauthorized)
	})

	t.Run("non-member cannot see/react", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				UserID: &nonMember,
				Body:   models.CreateCommentReactionRequest{Emoji: "👍"},
			}).
			AssertStatus(http.StatusNotFound)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  getRoute,
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("add reaction + summary shows count and reacted_by_me", func(t *testing.T) {
		// user1 adds 👍
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				UserID: &user1,
				Body:   models.CreateCommentReactionRequest{Emoji: "👍"},
			}).
			AssertStatus(http.StatusCreated)

		// user2 adds 👍
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				UserID: &user2,
				Body:   models.CreateCommentReactionRequest{Emoji: "👍"},
			}).
			AssertStatus(http.StatusCreated)

		// summary as user1 should show reacted_by_me true
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  getRoute,
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, commentID, resp["comment_id"])
		reactions := resp["reactions"].([]interface{})
		require.True(t, len(reactions) >= 1)

		var thumbsUp map[string]interface{}
		for _, r := range reactions {
			m := r.(map[string]interface{})
			if m["emoji"] == "👍" {
				thumbsUp = m
				break
			}
		}
		require.NotNil(t, thumbsUp)
		require.Equal(t, float64(2), thumbsUp["count"])
		require.Equal(t, true, thumbsUp["reacted_by_me"])
	})

	t.Run("duplicate reaction by same user is conflict", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				UserID: &user1,
				Body:   models.CreateCommentReactionRequest{Emoji: "🔥"},
			}).
			AssertStatus(http.StatusCreated)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				UserID: &user1,
				Body:   models.CreateCommentReactionRequest{Emoji: "🔥"},
			}).
			AssertStatus(http.StatusConflict)
	})

	t.Run("unicode emoji stored and retrieved", func(t *testing.T) {
		emoji := "👨🏽‍💻"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				UserID: &user2,
				Body:   models.CreateCommentReactionRequest{Emoji: emoji},
			}).
			AssertStatus(http.StatusCreated)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  getRoute,
				Method: testkit.GET,
				UserID: &user2,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		reactions := resp["reactions"].([]interface{})
		found := false
		for _, r := range reactions {
			m := r.(map[string]interface{})
			if m["emoji"] == emoji {
				found = true
				break
			}
		}
		require.True(t, found)
	})

	t.Run("remove reaction is idempotent and cannot remove others", func(t *testing.T) {
		emoji := "✅"

		// user1 reacts
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.POST,
				UserID: &user1,
				Body:   models.CreateCommentReactionRequest{Emoji: emoji},
			}).
			AssertStatus(http.StatusCreated)

		// user2 attempts to remove user1's reaction (should not affect user1)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  addRoute,
				Method: testkit.DELETE,
				UserID: &user2,
				Body:   models.DeleteCommentReactionRequest{Emoji: emoji},
			}).
			AssertStatus(http.StatusNoContent)

		// summary as user1 should still show reacted_by_me true
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  getRoute,
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		reactions := resp["reactions"].([]interface{})
		var m map[string]interface{}
		for _, r := range reactions {
			rm := r.(map[string]interface{})
			if rm["emoji"] == emoji {
				m = rm
				break
			}
		}
		require.NotNil(t, m)
		require.Equal(t, true, m["reacted_by_me"])
	})

	t.Run("get users for emoji returns users and supports url-encoded emoji", func(t *testing.T) {
		emoji := "👍"
		encoded := url.PathEscape(emoji)
		route := fmt.Sprintf("/api/v1/comments/%s/reactions/%s/users", commentID, encoded)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  route,
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, commentID, resp["comment_id"])
		require.Equal(t, emoji, resp["emoji"])
		users := resp["users"].([]interface{})
		require.True(t, len(users) >= 1)
	})

	t.Run("deleting comment removes associated reactions", func(t *testing.T) {
		// Create a fresh comment to isolate
		cid := createTestComment(t, app, user1, tripID, models.ActivityEntity, uuid.New(), "delete cascade")

		add := fmt.Sprintf("/api/v1/comments/%s/reactions", cid)
		get := fmt.Sprintf("/api/v1/comments/%s/reactions", cid)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  add,
				Method: testkit.POST,
				UserID: &user1,
				Body:   models.CreateCommentReactionRequest{Emoji: "🧹"},
			}).
			AssertStatus(http.StatusCreated)

		// Delete the comment
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", cid),
				Method: testkit.DELETE,
				UserID: &user1,
			}).
			AssertStatus(http.StatusNoContent)

		// Reaction endpoints should now 404 (comment no longer exists)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  get,
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

