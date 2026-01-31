package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/google/uuid"
)

const (
	// Test user IDs from fixtures
	commentTestUser1     = "00000000-0000-0000-0000-000000000101"
	commentTestUser2     = "00000000-0000-0000-0000-000000000102"
	commentTestUser3     = "00000000-0000-0000-0000-000000000103"
	commentTestNonMember = "00000000-0000-0000-0000-000000000104"

	// Test trip IDs from fixtures
	commentTestTrip1 = "00000000-0000-0000-0000-000000000201"
	commentTestTrip2 = "00000000-0000-0000-0000-000000000202"
)

func TestCommentCreate(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	t.Run("creates comment successfully when user is trip member", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: strPtr(commentTestUser1),
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(commentTestTrip1),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "This is a test comment",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		if resp["content"] != "This is a test comment" {
			t.Errorf("expected content 'This is a test comment', got %v", resp["content"])
		}
		if resp["trip_id"] != commentTestTrip1 {
			t.Errorf("expected trip_id %s, got %v", commentTestTrip1, resp["trip_id"])
		}
	})

	t.Run("returns 403 when user is not trip member", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: strPtr(commentTestNonMember),
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(commentTestTrip1),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "This should fail",
				},
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("returns 422 for invalid request body", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: strPtr(commentTestUser1),
				Body:   map[string]string{"invalid": "body"},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("returns 422 for empty content", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: strPtr(commentTestUser1),
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(commentTestTrip1),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("returns 422 for invalid entity type", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: strPtr(commentTestUser1),
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(commentTestTrip1),
					EntityType: "invalid_type",
					EntityID:   uuid.MustParse(activityID),
					Content:    "Test",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("returns 401 when not authenticated", func(t *testing.T) {
		noAuth := false
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				Auth:   &noAuth,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(commentTestTrip1),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "Test",
				},
			}).
			AssertStatus(http.StatusUnauthorized)
	})
}

func TestCommentUpdate(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	// Create a comment first
	var commentID string
	t.Run("setup: create comment", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: strPtr(commentTestUser1),
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(commentTestTrip1),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "Original content",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		commentID = resp["id"].(string)
	})

	t.Run("updates own comment successfully", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.PATCH,
				UserID: strPtr(commentTestUser1),
				Body: models.UpdateCommentRequest{
					Content: "Updated content",
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("content", "Updated content")
	})

	t.Run("returns 404 when trying to update another user's comment", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.PATCH,
				UserID: strPtr(commentTestUser2), // Different user but same trip
				Body: models.UpdateCommentRequest{
					Content: "Trying to update someone else's comment",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("returns 404 when user is not trip member", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.PATCH,
				UserID: strPtr(commentTestNonMember),
				Body: models.UpdateCommentRequest{
					Content: "Trying to update",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("returns 400 for invalid comment ID", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments/invalid-uuid",
				Method: testkit.PATCH,
				UserID: strPtr(commentTestUser1),
				Body: models.UpdateCommentRequest{
					Content: "Test",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("returns 422 for empty content", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.PATCH,
				UserID: strPtr(commentTestUser1),
				Body: models.UpdateCommentRequest{
					Content: "",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("returns 404 for non-existent comment", func(t *testing.T) {
		nonExistentID := uuid.New().String()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", nonExistentID),
				Method: testkit.PATCH,
				UserID: strPtr(commentTestUser1),
				Body: models.UpdateCommentRequest{
					Content: "Test",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func TestCommentDelete(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	// Create a comment first
	var commentID string
	t.Run("setup: create comment", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: strPtr(commentTestUser1),
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(commentTestTrip1),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "Comment to delete",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		commentID = resp["id"].(string)
	})

	t.Run("returns 404 when trying to delete another user's comment", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.DELETE,
				UserID: strPtr(commentTestUser2), // Different user but same trip
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("returns 404 when user is not trip member", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.DELETE,
				UserID: strPtr(commentTestNonMember),
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("deletes own comment successfully", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.DELETE,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("returns 404 for already deleted comment", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.DELETE,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("returns 400 for invalid comment ID", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments/invalid-uuid",
				Method: testkit.DELETE,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

func TestCommentGetPaginated(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	// Create multiple comments
	t.Run("setup: create multiple comments", func(t *testing.T) {
		for i := 1; i <= 5; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: strPtr(commentTestUser1),
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(commentTestTrip1),
						EntityType: models.Activity,
						EntityID:   uuid.MustParse(activityID),

						Content: fmt.Sprintf("Comment %d", i),
					},
				}).
				AssertStatus(http.StatusCreated)
		}
	})

	t.Run("gets comments for trip member", func(t *testing.T) {
		response := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		comments := response["comments"].([]interface{})
		if len(comments) < 5 {
			t.Errorf("expected at least 5 comments, got %d", len(comments))
		}
	})

	t.Run("returns 403 when user is not trip member", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestNonMember),
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("returns 403 for user from different trip", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser3), // Member of trip 2, not trip 1
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("respects limit parameter", func(t *testing.T) {
		response := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=2", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		comments := response["comments"].([]interface{})
		if len(comments) != 2 {
			t.Errorf("expected 2 comments with limit=2, got %d", len(comments))
		}
	})

	t.Run("returns default 20 comments when no limit specified", func(t *testing.T) {
		// Create more comments to test default limit
		for i := 6; i <= 25; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: strPtr(commentTestUser1),
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(commentTestTrip1),
						EntityType: models.Activity,
						EntityID:   uuid.MustParse(activityID),

						Content: fmt.Sprintf("Comment %d", i),
					},
				}).
				AssertStatus(http.StatusCreated)
		}

		response := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		comments := response["comments"].([]interface{})
		if len(comments) != 20 {
			t.Errorf("expected default 20 comments, got %d", len(comments))
		}
	})

	t.Run("supports cursor-based pagination", func(t *testing.T) {
		// Get first page
		response := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=3", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		comments := response["comments"].([]interface{})
		if len(comments) == 0 {
			t.Fatal("expected at least some comments in first page")
		}

		// Verify next_cursor is present
		nextCursor := response["next_cursor"]
		if nextCursor == nil {
			t.Error("expected next_cursor to be present when there are more results")
		}

		// Use next_cursor from response
		cursor := nextCursor.(string)

		// Get next page
		secondPageResponse := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=3&cursor=%s", commentTestTrip1, activityID, cursor),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		secondPageComments := secondPageResponse["comments"].([]interface{})
		if len(secondPageComments) == 0 {
			t.Error("expected comments in second page")
		}

		// Verify no duplicate comments
		firstIDs := make(map[string]bool)
		for _, c := range comments {
			firstIDs[c.(map[string]interface{})["id"].(string)] = true
		}

		for _, c := range secondPageComments {
			id := c.(map[string]interface{})["id"].(string)
			if firstIDs[id] {
				t.Errorf("found duplicate comment ID %s across pages", id)
			}
		}
	})

	t.Run("returns 422 for invalid entity type", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/invalid_type/%s/comments", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("returns 400 for invalid trip ID", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/invalid-uuid/activity/%s/comments", activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("returns 400 for invalid entity ID", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/invalid-uuid/comments", commentTestTrip1),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("returns 422 for invalid limit (exceeds max)", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=101", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("returns 422 for invalid limit (negative)", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=-1", commentTestTrip1, activityID),
				Method: testkit.GET,
				UserID: strPtr(commentTestUser1),
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})
}

func strPtr(s string) *string {
	return &s
}
