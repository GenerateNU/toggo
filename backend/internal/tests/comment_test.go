package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

/* =========================
   Helpers
=========================*/

func createTestUser(t *testing.T, app *fiber.App, name, username, phone string) string {
	userID := fakes.GenerateUUID()
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreateUserRequest{
				Name:        name,
				Username:    username,
				PhoneNumber: phone,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	return resp["id"].(string)
}

func createTestTrip(t *testing.T, app *fiber.App, userID, name string, min, max int) string {
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/trips",
			Method: testkit.POST,
			UserID: &userID,
			Body: models.CreateTripRequest{
				Name:      name,
				BudgetMin: min,
				BudgetMax: max,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	return resp["id"].(string)
}

func addUserToTrip(t *testing.T, app *fiber.App, adminID, userID, tripID string) {
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/memberships",
			Method: testkit.POST,
			UserID: &adminID,
			Body: models.CreateMembershipRequest{
				UserID:    uuid.MustParse(userID),
				TripID:    uuid.MustParse(tripID),
				IsAdmin:   false,
				BudgetMin: 100,
				BudgetMax: 500,
			},
		}).
		AssertStatus(http.StatusCreated)
}

/* =========================
   CREATE
=========================*/

func TestCommentCreate(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	user1 := createTestUser(t, app, "User1", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	user2 := createTestUser(t, app, "User2", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	nonMember := createTestUser(t, app, "User3", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())

	tripID := createTestTrip(t, app, user1, "Trip", 1000, 5000)
	addUserToTrip(t, app, user1, user2, tripID)

	t.Run("creates comment", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &user1,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(tripID),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "hello",
				},
			}).
			AssertStatus(http.StatusCreated)
	})

	t.Run("non member forbidden", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &nonMember,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(tripID),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    "fail",
				},
			}).
			AssertStatus(http.StatusForbidden)
	})
}

/* =========================
   UPDATE
=========================*/

func TestCommentUpdate(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	user1 := createTestUser(t, app, "User1", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	user2 := createTestUser(t, app, "User2", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())

	tripID := createTestTrip(t, app, user1, "Trip", 1000, 5000)
	addUserToTrip(t, app, user1, user2, tripID)

	var commentID string

	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/comments",
			Method: testkit.POST,
			UserID: &user1,
			Body: models.CreateCommentRequest{
				TripID:     uuid.MustParse(tripID),
				EntityType: models.Activity,
				EntityID:   uuid.MustParse(activityID),
				Content:    "original",
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	commentID = resp["id"].(string)

	t.Run("owner can update", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.PATCH,
				UserID: &user1,
				Body: models.UpdateCommentRequest{
					Content: "updated",
				},
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("other user cannot update", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.PATCH,
				UserID: &user2,
				Body: models.UpdateCommentRequest{
					Content: "hack",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("invalid entity type", func(t *testing.T) {
		// Try to create comment with invalid entity type
		_ = testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &user1,
				Body: map[string]interface{}{
					"trip_id":     tripID,
					"entity_type": "invalid_type",
					"entity_id":   activityID,
					"content":     "test",
				},
			}).AssertStatus(http.StatusUnprocessableEntity)
	})
}

/* =========================
   DELETE
=========================*/

func TestCommentDelete(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	user1 := createTestUser(t, app, "User1", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	user2 := createTestUser(t, app, "User2", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())

	tripID := createTestTrip(t, app, user1, "Trip", 1000, 5000)
	addUserToTrip(t, app, user1, user2, tripID)

	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/comments",
			Method: testkit.POST,
			UserID: &user1,
			Body: models.CreateCommentRequest{
				TripID:     uuid.MustParse(tripID),
				EntityType: models.Activity,
				EntityID:   uuid.MustParse(activityID),
				Content:    "delete me",
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()

	commentID := resp["id"].(string)

	t.Run("other user cannot delete", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.DELETE,
				UserID: &user2,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("owner can delete", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/comments/%s", commentID),
				Method: testkit.DELETE,
				UserID: &user1,
			}).
			AssertStatus(http.StatusNoContent)
	})
}

/* =========================
   GET PAGINATED
=========================*/

func TestCommentGetPaginated(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New().String()

	user1 := createTestUser(t, app, "User1", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	user2 := createTestUser(t, app, "User2", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())

	tripID := createTestTrip(t, app, user1, "Trip", 1000, 5000)
	addUserToTrip(t, app, user1, user2, tripID)

	for i := 0; i < 10; i++ {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &user1,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(tripID),
					EntityType: models.Activity,
					EntityID:   uuid.MustParse(activityID),
					Content:    fmt.Sprintf("c%d", i),
				},
			}).
			AssertStatus(http.StatusCreated)
	}

	t.Run("member can read", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", tripID, activityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("non member forbidden", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", tripID, activityID),
				Method: testkit.GET,
				UserID: &user2,
			}).
			AssertStatus(http.StatusOK)
	})
}

func TestCommentPagination(t *testing.T) {
	app := fakes.GetSharedTestApp()
	activityID := uuid.New()

	user1 := createTestUser(t, app, "User1", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())
	tripID := createTestTrip(t, app, user1, "Trip", 1000, 5000)

	t.Run("pagination with multiple comments", func(t *testing.T) {
		// Create 15 comments
		for i := 0; i < 15; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: &user1,
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(tripID),
						EntityType: models.Activity,
						EntityID:   activityID,
						Content:    fmt.Sprintf("Comment %d", i+1),
					},
				}).
				AssertStatus(http.StatusCreated)
		}

		// Test first page with limit
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=5", tripID, activityID),
				Method: testkit.GET,
				UserID: &user1,
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
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?cursor=%s&limit=5", tripID, activityID, nextCursor),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		nextItems := nextResp["items"].([]interface{})
		require.Equal(t, 5, len(nextItems))
	})

	t.Run("pagination edge cases", func(t *testing.T) {
		// Test zero limit
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=0", tripID, activityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusUnprocessableEntity)

		// Test invalid cursor
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?cursor=invalid", tripID, activityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("empty result pagination", func(t *testing.T) {
		// Test with entity that has no comments
		emptyActivityID := uuid.New()

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", tripID, emptyActivityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 0, len(items))
		require.Nil(t, resp["next_cursor"])
	})

	t.Run("default limit behavior", func(t *testing.T) {
		// Create fresh activity with 25 comments
		defaultActivityID := uuid.New()

		for i := 0; i < 25; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: &user1,
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(tripID),
						EntityType: models.Activity,
						EntityID:   defaultActivityID,
						Content:    fmt.Sprintf("Comment %d", i+1),
					},
				}).
				AssertStatus(http.StatusCreated)
		}

		// Test without limit parameter (should use default)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", tripID, defaultActivityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.True(t, len(items) <= 20, "Should use default limit")
		require.NotNil(t, resp["next_cursor"], "Should have next page")
	})

	t.Run("max limit boundary", func(t *testing.T) {
		// Test with exactly limit=100 (the maximum allowed)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=100", tripID, activityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.True(t, len(items) <= 100)
	})

	t.Run("single item pagination", func(t *testing.T) {
		// Create activity with only 1 comment
		singleActivityID := uuid.New()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/comments",
				Method: testkit.POST,
				UserID: &user1,
				Body: models.CreateCommentRequest{
					TripID:     uuid.MustParse(tripID),
					EntityType: models.Activity,
					EntityID:   singleActivityID,
					Content:    "Single comment",
				},
			}).
			AssertStatus(http.StatusCreated)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=5", tripID, singleActivityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		require.Equal(t, 1, len(items))
		require.Nil(t, resp["next_cursor"], "Should not have next page")
	})

	t.Run("exact page boundary", func(t *testing.T) {
		// Create exactly 10 comments with limit=5
		boundaryActivityID := uuid.New()

		for i := 0; i < 10; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: &user1,
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(tripID),
						EntityType: models.Activity,
						EntityID:   boundaryActivityID,
						Content:    fmt.Sprintf("Comment %d", i+1),
					},
				}).
				AssertStatus(http.StatusCreated)
		}

		// First page
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=5", tripID, boundaryActivityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, 5, len(resp["items"].([]interface{})))
		require.NotNil(t, resp["next_cursor"])

		// Second page (exactly 5 items, no more)
		resp2 := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=5&cursor=%s", tripID, boundaryActivityID, resp["next_cursor"]),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, 5, len(resp2["items"].([]interface{})))
		require.Nil(t, resp2["next_cursor"], "Should not have cursor on last page")
	})

	t.Run("last page cursor returns empty", func(t *testing.T) {
		// Create activity with 3 comments, get all in one page
		lastActivityID := uuid.New()

		for i := 0; i < 3; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: &user1,
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(tripID),
						EntityType: models.Activity,
						EntityID:   lastActivityID,
						Content:    fmt.Sprintf("Comment %d", i+1),
					},
				}).
				AssertStatus(http.StatusCreated)
		}

		// Get all items
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=10", tripID, lastActivityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, 3, len(resp["items"].([]interface{})))
		require.Nil(t, resp["next_cursor"])
	})

	t.Run("no duplicates across pages", func(t *testing.T) {
		// Create activity with 12 comments
		dupActivityID := uuid.New()

		for i := 0; i < 12; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: &user1,
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(tripID),
						EntityType: models.Activity,
						EntityID:   dupActivityID,
						Content:    fmt.Sprintf("Comment %d", i+1),
					},
				}).
				AssertStatus(http.StatusCreated)
		}

		seenIDs := make(map[string]bool)

		// Get first page
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=5", tripID, dupActivityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, item := range resp["items"].([]interface{}) {
			comment := item.(map[string]interface{})
			commentID := comment["id"].(string)
			require.False(t, seenIDs[commentID], "Found duplicate comment id: %s", commentID)
			seenIDs[commentID] = true
		}

		// Get second page
		if resp["next_cursor"] != nil {
			resp2 := testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=5&cursor=%s", tripID, dupActivityID, resp["next_cursor"]),
					Method: testkit.GET,
					UserID: &user1,
				}).
				AssertStatus(http.StatusOK).
				GetBody()

			for _, item := range resp2["items"].([]interface{}) {
				comment := item.(map[string]interface{})
				commentID := comment["id"].(string)
				require.False(t, seenIDs[commentID], "Found duplicate comment id: %s", commentID)
				seenIDs[commentID] = true
			}
		}
	})

	t.Run("correct ordering", func(t *testing.T) {
		// Create activity with multiple comments
		orderActivityID := uuid.New()

		for i := 0; i < 5; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/comments",
					Method: testkit.POST,
					UserID: &user1,
					Body: models.CreateCommentRequest{
						TripID:     uuid.MustParse(tripID),
						EntityType: models.Activity,
						EntityID:   orderActivityID,
						Content:    fmt.Sprintf("Comment %d", i+1),
					},
				}).
				AssertStatus(http.StatusCreated)
		}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments?limit=10", tripID, orderActivityID),
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]interface{})
		// Verify items are ordered by created_at DESC (newest first)
		for i := 0; i < len(items)-1; i++ {
			current := items[i].(map[string]interface{})
			next := items[i+1].(map[string]interface{})
			currentTime := current["created_at"].(string)
			nextTime := next["created_at"].(string)
			require.True(t, currentTime >= nextTime, "Items should be ordered by created_at DESC")
		}
	})

	t.Run("non-member cannot paginate comments", func(t *testing.T) {
		// Create a user who is not a member of the trip
		nonMember := createTestUser(t, app, "NonMember", fakes.GenerateRandomUsername(), fakes.GenerateRandomPhoneNumber())

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/activity/%s/comments", tripID, activityID),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})
}
