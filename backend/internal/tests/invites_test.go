package tests

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"time"
	"toggo/internal/models"
	testkit "toggo/internal/tests/testkit/builders"
	"toggo/internal/tests/testkit/fakes"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestTripInvitesJoinWorkflow(t *testing.T) {
	t.Run("create invite and join trip", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		inviteResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/invites", trip),
				Method: testkit.POST,
				UserID: &owner,
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		code, ok := inviteResp["code"].(string)
		require.True(t, ok, "expected code to be a string")
		require.NotEmpty(t, code)

		joiner := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trip-invites/%s/join", code),
				Method: testkit.POST,
				UserID: &joiner,
			}).
			AssertStatus(http.StatusCreated).
			AssertField("user_id", joiner).
			AssertField("trip_id", trip).
			AssertField("is_admin", false).
			AssertField("budget_min", float64(0)).
			AssertField("budget_max", float64(0))

		// Verify the joiner can now access their membership (TripMemberRequired should pass)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trips/%s/memberships/%s", trip, joiner),
				Method: testkit.GET,
				UserID: &joiner,
			}).
			AssertStatus(http.StatusOK).
			AssertField("user_id", joiner).
			AssertField("trip_id", trip)

		// Joining again should be idempotent (no error)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trip-invites/%s/join", code),
				Method: testkit.POST,
				UserID: &joiner,
			}).
			AssertStatus(http.StatusCreated).
			AssertField("user_id", joiner).
			AssertField("trip_id", trip)
	})

	t.Run("invalid code returns 400", func(t *testing.T) {
		app := fakes.GetSharedTestApp()

		user := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trip-invites/does-not-exist/join",
				Method: testkit.POST,
				UserID: &user,
			}).
			AssertStatus(http.StatusBadRequest).
			AssertField("message", "invalid invite code")
	})

	t.Run("expired invite returns 400", func(t *testing.T) {
		app := fakes.GetSharedTestApp()
		db := fakes.GetSharedDB()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		code := "expired-" + uuid.NewString()
		expired := time.Now().UTC().Add(-1 * time.Hour)

		invite := &models.TripInvite{
			ID:        uuid.New(),
			TripID:    uuid.MustParse(trip),
			CreatedBy: uuid.MustParse(owner),
			Code:      code,
			ExpiresAt: expired,
			IsRevoked: false,
			CreatedAt: time.Now().UTC(),
		}

		_, err := db.NewInsert().Model(invite).Exec(context.Background())
		require.NoError(t, err)

		user := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trip-invites/%s/join", code),
				Method: testkit.POST,
				UserID: &user,
			}).
			AssertStatus(http.StatusBadRequest).
			AssertField("message", "invite link has expired")
	})

	t.Run("revoked invite returns 400", func(t *testing.T) {
		app := fakes.GetSharedTestApp()
		db := fakes.GetSharedDB()

		owner := createUser(t, app)
		trip := createTrip(t, app, owner)

		code := "revoked-" + uuid.NewString()
		future := time.Now().UTC().Add(24 * time.Hour)

		invite := &models.TripInvite{
			ID:        uuid.New(),
			TripID:    uuid.MustParse(trip),
			CreatedBy: uuid.MustParse(owner),
			Code:      code,
			ExpiresAt: future,
			IsRevoked: true,
			CreatedAt: time.Now().UTC(),
		}

		_, err := db.NewInsert().Model(invite).Exec(context.Background())
		require.NoError(t, err)

		user := createUser(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  fmt.Sprintf("/api/v1/trip-invites/%s/join", code),
				Method: testkit.POST,
				UserID: &user,
			}).
			AssertStatus(http.StatusBadRequest).
			AssertField("message", "invite link has expired")
	})

	t.Run("unauthenticated join returns 401", func(t *testing.T) {
		app := fakes.GetSharedTestApp()
		auth := false

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trip-invites/whatever/join",
				Method: testkit.POST,
				Auth:   &auth,
			}).
			AssertStatus(http.StatusUnauthorized)
	})
}

