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

func TestNotificationEndpoints(t *testing.T) {
	app := fakes.GetSharedTestApp()
	authUserID1 := fakes.GenerateUUID()

	var user1ID, user2ID string

	username1 := fakes.GenerateRandomUsername()
	resp1 := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &authUserID1,
			Body: models.CreateUserRequest{
				Name:        "Notification User 1",
				Username:    username1,
				PhoneNumber: "+16175559001",
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()
	user1ID = resp1["id"].(string)

	token1 := "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaaa]"
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/users/%s", user1ID),
			Method: testkit.PATCH,
			UserID: &authUserID1,
			Body: models.UpdateUserRequest{
				DeviceToken: &token1,
			},
		}).
		AssertStatus(http.StatusOK)

	authUserID2 := fakes.GenerateUUID()
	username2 := fakes.GenerateRandomUsername()
	resp2 := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &authUserID2,
			Body: models.CreateUserRequest{
				Name:        "Notification User 2",
				Username:    username2,
				PhoneNumber: "+16175559002",
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()
	user2ID = resp2["id"].(string)

	token2 := "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbbb]"
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  fmt.Sprintf("/api/v1/users/%s", user2ID),
			Method: testkit.PATCH,
			UserID: &authUserID2,
			Body: models.UpdateUserRequest{
				DeviceToken: &token2,
			},
		}).
		AssertStatus(http.StatusOK)

	t.Run("send notification with missing user_id returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"title": "Test",
					"body":  "Test body",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("send notification with invalid user_id returns 400", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"user_id": "not-a-uuid",
					"title":   "Test",
					"body":    "Test body",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("send notification with missing title returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"user_id": user1ID,
					"body":    "Test body",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("send notification with missing body returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"user_id": user1ID,
					"title":   "Test",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("send notification without auth returns 401", func(t *testing.T) {
		auth := false
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send",
				Method: testkit.POST,
				Auth:   &auth,
				Body: models.SendNotificationRequest{
					UserID: uuid.MustParse(user1ID),
					Title:  "Test",
					Body:   "Test",
				},
			}).
			AssertStatus(http.StatusUnauthorized)
	})

	t.Run("send notification to user without token returns 500", func(t *testing.T) {
		authUserID3 := fakes.GenerateUUID()
		username3 := fakes.GenerateRandomUsername()
		resp3 := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users",
				Method: testkit.POST,
				UserID: &authUserID3,
				Body: models.CreateUserRequest{
					Name:        "User Without Token",
					Username:    username3,
					PhoneNumber: "+16175559003",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()
		user3ID := resp3["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send",
				Method: testkit.POST,
				UserID: &authUserID3,
				Body: models.SendNotificationRequest{
					UserID: uuid.MustParse(user3ID),
					Title:  "Test",
					Body:   "Test",
				},
			}).
			AssertStatus(http.StatusInternalServerError)
	})

	t.Run("send notification accepts valid request", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: models.SendNotificationRequest{
					UserID: uuid.MustParse(user1ID),
					Title:  "Test Notification",
					Body:   "This is a test",
					Data:   map[string]interface{}{"screen": "Home"},
				},
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("send bulk with missing user_ids returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send-bulk",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"title": "Test",
					"body":  "Test body",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("send bulk with empty user_ids returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send-bulk",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"user_ids": []string{},
					"title":    "Test",
					"body":     "Test body",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("send bulk with invalid user_id returns 400", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send-bulk",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"user_ids": []string{"not-a-uuid"},
					"title":    "Test",
					"body":     "Test body",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("send bulk with missing title returns 422", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send-bulk",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: map[string]interface{}{
					"user_ids": []string{user1ID, user2ID},
					"body":     "Test body",
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("send bulk without auth returns 401", func(t *testing.T) {
		auth := false
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send-bulk",
				Method: testkit.POST,
				Auth:   &auth,
				Body: models.SendBulkNotificationRequest{
					UserIDs: []uuid.UUID{uuid.MustParse(user1ID)},
					Title:   "Test",
					Body:    "Test",
				},
			}).
			AssertStatus(http.StatusUnauthorized)
	})

	t.Run("send bulk returns response structure", func(t *testing.T) {
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/notifications/send-bulk",
				Method: testkit.POST,
				UserID: &authUserID1,
				Body: models.SendBulkNotificationRequest{
					UserIDs: []uuid.UUID{
						uuid.MustParse(user1ID),
						uuid.MustParse(user2ID),
					},
					Title: "Bulk Test",
					Body:  "Testing bulk notifications",
				},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		if _, ok := resp["success_count"]; !ok {
			t.Error("expected success_count in response")
		}
		if _, ok := resp["failure_count"]; !ok {
			t.Error("expected failure_count in response")
		}
		if _, ok := resp["errors"]; !ok {
			t.Error("expected errors array in response")
		}
	})
}
