package tests

import (
	"fmt"
	"net/http"
	"testing"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/stretchr/testify/require"
)

func TestNotificationPreferencesLifecycle(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("get preferences returns 404 when none exist", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("create preferences with defaults", func(t *testing.T) {
		userID := createUser(t, app)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		require.Equal(t, userID, resp["user_id"])
		require.Equal(t, true, resp["push_enabled"])
		require.Equal(t, true, resp["upcoming_trip"])
		require.Equal(t, true, resp["voting_reminders"])
		require.Equal(t, true, resp["finalized_decisions"])
		require.Equal(t, true, resp["trip_activity"])
		require.Equal(t, true, resp["deadline_reminders"])
	})

	t.Run("create preferences with custom values", func(t *testing.T) {
		userID := createUser(t, app)

		pushEnabled := false
		upcomingTrip := false
		deadlineReminders := false

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreateNotificationPreferencesRequest{
					PushEnabled:       &pushEnabled,
					UpcomingTrip:      &upcomingTrip,
					DeadlineReminders: &deadlineReminders,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		require.Equal(t, false, resp["push_enabled"])
		require.Equal(t, false, resp["upcoming_trip"])
		require.Equal(t, false, resp["deadline_reminders"])
		require.Equal(t, true, resp["voting_reminders"])
	})

	t.Run("get preferences after creation", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			AssertField("user_id", userID).
			AssertField("push_enabled", true).
			AssertField("trip_activity", true)
	})

	t.Run("update preferences partially", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated)

		pushEnabled := false
		votingReminders := false

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.PATCH,
				UserID: &userID,
				Body: models.UpdateUserNotificationPreferencesRequest{
					PushEnabled:     &pushEnabled,
					VotingReminders: &votingReminders,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("push_enabled", false).
			AssertField("voting_reminders", false).
			AssertField("upcoming_trip", true).
			AssertField("finalized_decisions", true)
	})

	t.Run("update non-existent preferences returns 404", func(t *testing.T) {
		userID := createUser(t, app)

		pushEnabled := false
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.PATCH,
				UserID: &userID,
				Body: models.UpdateUserNotificationPreferencesRequest{
					PushEnabled: &pushEnabled,
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete preferences", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.DELETE,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNoContent)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete is idempotent", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.DELETE,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNoContent)
	})

	t.Run("creating preferences twice returns conflict", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusConflict)
	})
}

func TestNotificationPreferencesAuthorization(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("unauthenticated request returns 401", func(t *testing.T) {
		auth := false

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.GET,
				Auth:   &auth,
			}).
			AssertStatus(http.StatusUnauthorized)
	})

	t.Run("user can only access their own preferences", func(t *testing.T) {
		user1 := createUser(t, app)
		user2 := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &user1,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.GET,
				UserID: &user1,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, user1, resp["user_id"])

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.GET,
				UserID: &user2,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

func TestGetOrCreateDefaultPreferences(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("get-or-create returns existing preferences", func(t *testing.T) {
		userID := createUser(t, app)

		pushEnabled := false
		tripActivity := false
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreateNotificationPreferencesRequest{
					PushEnabled:  &pushEnabled,
					TripActivity: &tripActivity,
				},
			}).
			AssertStatus(http.StatusCreated)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences/default",
				Method: testkit.POST,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, false, resp["push_enabled"])
		require.Equal(t, false, resp["trip_activity"])
	})

	t.Run("get-or-create creates defaults when none exist", func(t *testing.T) {
		userID := createUser(t, app)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences/default",
				Method: testkit.POST,
				UserID: &userID,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, userID, resp["user_id"])
		require.Equal(t, true, resp["push_enabled"])
		require.Equal(t, true, resp["upcoming_trip"])
		require.Equal(t, true, resp["voting_reminders"])
		require.Equal(t, true, resp["finalized_decisions"])
		require.Equal(t, true, resp["trip_activity"])
		require.Equal(t, true, resp["deadline_reminders"])
	})
}

func TestNotificationPreferencesEdgeCases(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("toggle all notification types off and on", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated)

		allFalse := false
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.PATCH,
				UserID: &userID,
				Body: models.UpdateUserNotificationPreferencesRequest{
					PushEnabled:        &allFalse,
					UpcomingTrip:       &allFalse,
					VotingReminders:    &allFalse,
					FinalizedDecisions: &allFalse,
					TripActivity:       &allFalse,
					DeadlineReminders:  &allFalse,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("push_enabled", false).
			AssertField("upcoming_trip", false).
			AssertField("voting_reminders", false).
			AssertField("finalized_decisions", false).
			AssertField("trip_activity", false).
			AssertField("deadline_reminders", false)

		allTrue := true
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.PATCH,
				UserID: &userID,
				Body: models.UpdateUserNotificationPreferencesRequest{
					PushEnabled:        &allTrue,
					UpcomingTrip:       &allTrue,
					VotingReminders:    &allTrue,
					FinalizedDecisions: &allTrue,
					TripActivity:       &allTrue,
					DeadlineReminders:  &allTrue,
				},
			}).
			AssertStatus(http.StatusOK).
			AssertField("push_enabled", true).
			AssertField("upcoming_trip", true).
			AssertField("voting_reminders", true).
			AssertField("finalized_decisions", true).
			AssertField("trip_activity", true).
			AssertField("deadline_reminders", true)
	})

	t.Run("preferences persist across requests", func(t *testing.T) {
		userID := createUser(t, app)

		tripActivity := false
		deadlineReminders := false
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body: models.CreateNotificationPreferencesRequest{
					TripActivity:      &tripActivity,
					DeadlineReminders: &deadlineReminders,
				},
			}).
			AssertStatus(http.StatusCreated)

		for i := 0; i < 3; i++ {
			testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  "/api/v1/users/me/notification-preferences",
					Method: testkit.GET,
					UserID: &userID,
				}).
				AssertStatus(http.StatusOK).
				AssertField("trip_activity", false).
				AssertField("deadline_reminders", false)
		}
	})

	t.Run("deleted user preferences are not accessible", func(t *testing.T) {
		userID := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.POST,
				UserID: &userID,
				Body:   models.CreateNotificationPreferencesRequest{},
			}).
			AssertStatus(http.StatusCreated)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/users/%s", userID),
				Method: testkit.DELETE,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNoContent)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/users/me/notification-preferences",
				Method: testkit.GET,
				UserID: &userID,
			}).
			AssertStatus(http.StatusNotFound)
	})
}
