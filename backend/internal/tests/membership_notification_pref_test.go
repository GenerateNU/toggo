package tests
package tests

import (
	"context"
	"testing"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/tests/testkit/fakes"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// TestFindUserIDsWithNotificationPreference_GlobalPreferences verifies that
// FindUserIDsWithNotificationPreference respects the user's global notification
// preferences in addition to the trip-level membership flags.
func TestFindUserIDsWithNotificationPreference_GlobalPreferences(t *testing.T) {
	app := fakes.GetSharedTestApp()
	db := fakes.GetSharedDB()
	ctx := context.Background()
	membershipRepo := repository.NewMembershipRepository(db)
	notifPrefRepo := repository.NewNotificationPreferencesRepository(db)

	t.Run("includes member with no global preferences row", func(t *testing.T) {
		owner := createUser(t, app)
		member := createUser(t, app)
		tripID := createTrip(t, app, owner)
		addMember(t, app, owner, member, tripID)

		// No global preferences row — should default to included.
		userIDs, err := membershipRepo.FindUserIDsWithNotificationPreference(
			ctx,
			uuid.MustParse(tripID),
			models.NotificationPreferenceNewComment,
			uuid.MustParse(owner),
		)
		require.NoError(t, err)
		require.Contains(t, userIDs, uuid.MustParse(member))
	})

	t.Run("includes member with all global preferences enabled", func(t *testing.T) {
		owner := createUser(t, app)
		member := createUser(t, app)
		tripID := createTrip(t, app, owner)
		addMember(t, app, owner, member, tripID)

		_, err := notifPrefRepo.Create(ctx, &models.NotificationPreferences{
			UserID:       uuid.MustParse(member),
			PushEnabled:  true,
			TripActivity: true,
		})
		require.NoError(t, err)

		userIDs, err := membershipRepo.FindUserIDsWithNotificationPreference(
			ctx,
			uuid.MustParse(tripID),
			models.NotificationPreferenceNewComment,
			uuid.MustParse(owner),
		)
		require.NoError(t, err)
		require.Contains(t, userIDs, uuid.MustParse(member))
	})

	t.Run("excludes member with push_enabled false", func(t *testing.T) {
		owner := createUser(t, app)
		member := createUser(t, app)
		tripID := createTrip(t, app, owner)
		addMember(t, app, owner, member, tripID)

		_, err := notifPrefRepo.Create(ctx, &models.NotificationPreferences{
			UserID:       uuid.MustParse(member),
			PushEnabled:  false,
			TripActivity: true,
		})
		require.NoError(t, err)

		userIDs, err := membershipRepo.FindUserIDsWithNotificationPreference(
			ctx,
			uuid.MustParse(tripID),
			models.NotificationPreferenceNewComment,
			uuid.MustParse(owner),
		)
		require.NoError(t, err)
		require.NotContains(t, userIDs, uuid.MustParse(member))
	})

	t.Run("excludes member with trip_activity false", func(t *testing.T) {
		owner := createUser(t, app)
		member := createUser(t, app)
		tripID := createTrip(t, app, owner)
		addMember(t, app, owner, member, tripID)

		_, err := notifPrefRepo.Create(ctx, &models.NotificationPreferences{
			UserID:       uuid.MustParse(member),
			PushEnabled:  true,
			TripActivity: false,
		})
		require.NoError(t, err)

		userIDs, err := membershipRepo.FindUserIDsWithNotificationPreference(
			ctx,
			uuid.MustParse(tripID),
			models.NotificationPreferenceNewComment,
			uuid.MustParse(owner),
		)
		require.NoError(t, err)
		require.NotContains(t, userIDs, uuid.MustParse(member))
	})

	t.Run("excludes actor regardless of their preferences", func(t *testing.T) {
		owner := createUser(t, app)
		tripID := createTrip(t, app, owner)

		_, err := notifPrefRepo.Create(ctx, &models.NotificationPreferences{
			UserID:       uuid.MustParse(owner),
			PushEnabled:  true,
			TripActivity: true,
		})
		require.NoError(t, err)

		userIDs, err := membershipRepo.FindUserIDsWithNotificationPreference(
			ctx,
			uuid.MustParse(tripID),
			models.NotificationPreferenceNewComment,
			uuid.MustParse(owner),
		)
		require.NoError(t, err)
		require.NotContains(t, userIDs, uuid.MustParse(owner))
	})

	t.Run("returns only members passing both trip-level and global checks", func(t *testing.T) {
		owner := createUser(t, app)
		memberOptedIn := createUser(t, app)
		memberPushDisabled := createUser(t, app)
		memberTripActivityDisabled := createUser(t, app)
		tripID := createTrip(t, app, owner)
		addMember(t, app, owner, memberOptedIn, tripID)
		addMember(t, app, owner, memberPushDisabled, tripID)
		addMember(t, app, owner, memberTripActivityDisabled, tripID)

		_, err := notifPrefRepo.Create(ctx, &models.NotificationPreferences{
			UserID: uuid.MustParse(memberOptedIn), PushEnabled: true, TripActivity: true,
		})
		require.NoError(t, err)

		_, err = notifPrefRepo.Create(ctx, &models.NotificationPreferences{
			UserID: uuid.MustParse(memberPushDisabled), PushEnabled: false, TripActivity: true,
		})
		require.NoError(t, err)

		_, err = notifPrefRepo.Create(ctx, &models.NotificationPreferences{
			UserID: uuid.MustParse(memberTripActivityDisabled), PushEnabled: true, TripActivity: false,
		})
		require.NoError(t, err)

		userIDs, err := membershipRepo.FindUserIDsWithNotificationPreference(
			ctx,
			uuid.MustParse(tripID),
			models.NotificationPreferenceNewComment,
			uuid.MustParse(owner),
		)
		require.NoError(t, err)
		require.Contains(t, userIDs, uuid.MustParse(memberOptedIn))
		require.NotContains(t, userIDs, uuid.MustParse(memberPushDisabled))
		require.NotContains(t, userIDs, uuid.MustParse(memberTripActivityDisabled))
	})
}
