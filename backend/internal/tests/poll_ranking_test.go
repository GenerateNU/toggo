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

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

/* =========================
   Rank Poll Helpers
=========================*/

func setupRankPollTestEnv(t *testing.T, app *fiber.App) (owner, member, nonMember, tripID string) {
	t.Helper()
	owner = createRankPollUser(t, app)
	member = createRankPollUser(t, app)
	nonMember = createRankPollUser(t, app)
	tripID = createRankPollTrip(t, app, owner)
	addRankPollMember(t, app, owner, member, tripID)
	return owner, member, nonMember, tripID
}

func createRankPollUser(t *testing.T, app *fiber.App) string {
	t.Helper()
	id := fakes.GenerateUUID()
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &id,
			Body: models.CreateUserRequest{
				Name:        "RankPollUser",
				Username:    fakes.GenerateRandomUsername(),
				PhoneNumber: fakes.GenerateRandomPhoneNumber(),
			},
		}).
		AssertStatus(http.StatusCreated)
	return id
}

func createRankPollTrip(t *testing.T, app *fiber.App, ownerID string) string {
	t.Helper()
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/trips",
			Method: testkit.POST,
			UserID: &ownerID,
			Body: models.CreateTripRequest{
				Name:      "RankPollTrip-" + uuid.NewString()[:8],
				BudgetMin: 100,
				BudgetMax: 500,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()
	return resp["id"].(string)
}

func addRankPollMember(t *testing.T, app *fiber.App, adminID, userID, tripID string) {
	t.Helper()
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

func rankPollRoute(tripID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/rank-polls", tripID)
}

func singleRankPollRoute(tripID, pollID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/rank-polls/%s", tripID, pollID)
}

func rankPollOptionRoute(tripID, pollID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/rank-polls/%s/options", tripID, pollID)
}

func deleteRankPollOptionRoute(tripID, pollID, optionID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/rank-polls/%s/options/%s", tripID, pollID, optionID)
}

func submitRankingRoute(tripID, pollID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/rank-polls/%s/rank", tripID, pollID)
}

func rankPollVotersRoute(tripID, pollID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/rank-polls/%s/voters", tripID, pollID)
}

func setRankPollDeadlineInDB(t *testing.T, pollID string, deadline time.Time) {
	t.Helper()
	db := fakes.GetSharedDB()
	_, err := db.NewUpdate().
		TableExpr("polls").
		Set("deadline = ?", deadline).
		Where("id = ?", uuid.MustParse(pollID)).
		Exec(context.Background())
	require.NoError(t, err)
}

func createRankPoll(t *testing.T, app *fiber.App, userID, tripID string, req models.CreatePollRequest) map[string]any {
	t.Helper()
	return testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  rankPollRoute(tripID),
			Method: testkit.POST,
			UserID: &userID,
			Body:   req,
		}).
		AssertStatus(http.StatusCreated).
		GetBody()
}

func defaultRankPollRequest() models.CreatePollRequest {
	return models.CreatePollRequest{
		Question: "Where should we travel?",
		PollType: models.PollTypeRank,
		Options: []models.CreatePollOptionRequest{
			{OptionType: models.OptionTypeCustom, Name: "Paris"},
			{OptionType: models.OptionTypeCustom, Name: "Tokyo"},
			{OptionType: models.OptionTypeCustom, Name: "London"},
		},
	}
}

func getRankPollOptionIDs(pollResp map[string]any) []string {
	opts := pollResp["options"].([]any)
	ids := make([]string, len(opts))
	for i, o := range opts {
		ids[i] = o.(map[string]any)["id"].(string)
	}
	return ids
}

/* =========================
   CREATE RANK POLL
=========================*/

func TestRankPollCreate(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creates rank poll with 3 options", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		resp := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())

		require.Equal(t, "Where should we travel?", resp["question"])
		require.Equal(t, "rank", resp["poll_type"])
		require.NotEmpty(t, resp["id"])
		options := resp["options"].([]any)
		require.Len(t, options, 3)
	})

	t.Run("non-member cannot create rank poll", func(t *testing.T) {
		_, _, nonMember, tripID := setupRankPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollRoute(tripID),
				Method: testkit.POST,
				UserID: &nonMember,
				Body:   defaultRankPollRequest(),
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("rejects rank poll with only 1 option", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollRequest{
					Question: "bad poll",
					PollType: models.PollTypeRank,
					Options: []models.CreatePollOptionRequest{
						{OptionType: models.OptionTypeCustom, Name: "Only one"},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("rejects rank poll with more than 15 options", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		opts := make([]models.CreatePollOptionRequest, 16)
		for i := range opts {
			opts[i] = models.CreatePollOptionRequest{
				OptionType: models.OptionTypeCustom,
				Name:       fmt.Sprintf("Option %d", i+1),
			}
		}
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollRequest{
					Question: "too many options",
					PollType: models.PollTypeRank,
					Options:  opts,
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("accepts rank poll with exactly 15 options", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		opts := make([]models.CreatePollOptionRequest, 15)
		for i := range opts {
			opts[i] = models.CreatePollOptionRequest{
				OptionType: models.OptionTypeCustom,
				Name:       fmt.Sprintf("Destination %d", i+1),
			}
		}
		resp := createRankPoll(t, app, owner, tripID, models.CreatePollRequest{
			Question: "max options",
			PollType: models.PollTypeRank,
			Options:  opts,
		})

		options := resp["options"].([]any)
		require.Len(t, options, 15)
	})

	t.Run("creates rank poll with future deadline", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		future := time.Now().Add(72 * time.Hour).UTC()
		req := defaultRankPollRequest()
		req.Deadline = &future

		resp := createRankPoll(t, app, owner, tripID, req)
		require.NotNil(t, resp["deadline"])
	})

	t.Run("rejects rank poll with deadline in the past", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		past := time.Now().Add(-1 * time.Hour).UTC()
		req := defaultRankPollRequest()
		req.Deadline = &past

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   req,
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   UPDATE RANK POLL
=========================*/

func TestRankPollUpdate(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creator can update question", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		newQ := "Where should we really travel?"

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Question: &newQ},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, newQ, resp["question"])
	})

	t.Run("creator can update deadline", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		deadline := time.Now().Add(48 * time.Hour).UTC().Truncate(time.Second)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Deadline: &deadline},
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("non-creator cannot update", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		q := "hacked"

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &member,
				Body:   models.UpdatePollRequest{Question: &q},
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("rejects empty update body", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("cannot update after deadline passed", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		past := time.Now().Add(-1 * time.Hour).UTC()
		setRankPollDeadlineInDB(t, pollID, past)
		q := "too late"

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Question: &q},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("rejects update with deadline in the past", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		past := time.Now().Add(-1 * time.Hour).UTC()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Deadline: &past},
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   DELETE RANK POLL
=========================*/

func TestRankPollDelete(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creator can delete rank poll", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, pollID, resp["id"])

		// Confirm deleted
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-creator non-admin cannot delete", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("admin can delete another member's rank poll", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, member, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, pollID, resp["id"])
	})

	t.Run("delete rank poll cascades rankings", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// Submit a ranking
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Delete poll
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Verify deleted
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

/* =========================
   ADD / DELETE OPTIONS
=========================*/

func TestRankPollOptions(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creator can add option before any rankings", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollOptionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Berlin",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		require.Equal(t, "Berlin", resp["name"])
	})

	t.Run("non-creator cannot add option", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollOptionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Berlin",
				},
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("cannot add option after rankings exist", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// Submit a ranking first
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Try to add option - should fail
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollOptionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Late option",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("creator can delete option before any rankings", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		req := models.CreatePollRequest{
			Question: "test delete",
			PollType: models.PollTypeRank,
			Options: []models.CreatePollOptionRequest{
				{OptionType: models.OptionTypeCustom, Name: "A"},
				{OptionType: models.OptionTypeCustom, Name: "B"},
				{OptionType: models.OptionTypeCustom, Name: "C"},
				{OptionType: models.OptionTypeCustom, Name: "D"},
			},
		}
		poll := createRankPoll(t, app, owner, tripID, req)
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteRankPollOptionRoute(tripID, pollID, optIDs[0]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, optIDs[0], resp["id"])
	})

	t.Run("cannot delete option after rankings exist", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// Submit ranking
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Try to delete option
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteRankPollOptionRoute(tripID, pollID, optIDs[2]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("cannot delete option when only 2 remain", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		req := models.CreatePollRequest{
			Question: "min options",
			PollType: models.PollTypeRank,
			Options: []models.CreatePollOptionRequest{
				{OptionType: models.OptionTypeCustom, Name: "A"},
				{OptionType: models.OptionTypeCustom, Name: "B"},
			},
		}
		poll := createRankPoll(t, app, owner, tripID, req)
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteRankPollOptionRoute(tripID, pollID, optIDs[0]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("cannot add option after deadline passed", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		past := time.Now().Add(-1 * time.Hour).UTC()
		setRankPollDeadlineInDB(t, pollID, past)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollOptionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Too late",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   SUBMIT RANKING
=========================*/

func TestRankPollSubmitRanking(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("member can submit valid ranking", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)
	})

	t.Run("rejects ranking with missing options", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// Only rank 2 out of 3 options
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("rejects ranking with duplicate option", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 2}, // Duplicate
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("rejects ranking with duplicate rank position", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 1}, // Duplicate rank
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("rejects ranking with gap in positions", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 3}, // Skip rank 2
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 4},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("rejects ranking with invalid rank (0)", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 0}, // Invalid
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 2},
					},
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("rejects ranking with rank > num options", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 5}, // Too high
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("ranking replaces previous ranking", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// First ranking
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Second ranking (reversed order)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Verify results show new ranking
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		userRanking := resp["user_ranking"].([]any)
		require.Len(t, userRanking, 3)
		// First item should be the option we ranked 1st (optIDs[2])
		firstRanked := userRanking[0].(map[string]any)
		require.Equal(t, optIDs[2], firstRanked["option_id"])
		require.Equal(t, float64(1), firstRanked["rank_position"])
	})

	t.Run("cannot submit ranking after deadline", func(t *testing.T) {
		owner, _, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)
		past := time.Now().Add(-1 * time.Hour).UTC()
		setRankPollDeadlineInDB(t, pollID, past)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("non-member cannot submit ranking", func(t *testing.T) {
		owner, _, nonMember, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &nonMember,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusNotFound)
	})
}

/* =========================
   GET RESULTS (Borda Count)
=========================*/

func TestRankPollResults(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("returns results with Borda scores and top 3", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// Owner ranks: Paris(1), Tokyo(2), London(3)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Member ranks: Tokyo(1), Paris(2), London(3)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Get results
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		// Verify structure
		require.Equal(t, pollID, resp["poll_id"])
		require.Equal(t, float64(2), resp["total_voters"])
		require.Equal(t, float64(2), resp["total_members"]) // Owner + member
		require.Equal(t, true, resp["user_has_voted"])

		// Verify top 3 exists
		top3 := resp["top_3"].([]any)
		require.Len(t, top3, 3)

		// All options should be present
		allOptions := resp["all_options"].([]any)
		require.Len(t, allOptions, 3)

		// Verify Borda scores (3 options: 1st=3pts, 2nd=2pts, 3rd=1pt)
		// Paris: owner(3pts) + member(2pts) = 5pts
		// Tokyo: owner(2pts) + member(3pts) = 5pts
		// London: owner(1pt) + member(1pt) = 2pts
		// Top should be Paris/Tokyo (tie at 5), then London (2)

		// Verify user ranking is included
		userRanking := resp["user_ranking"].([]any)
		require.Len(t, userRanking, 3)
		// Owner's ranking should be Paris(1), Tokyo(2), London(3)
		firstRanked := userRanking[0].(map[string]any)
		require.Equal(t, float64(1), firstRanked["rank_position"])
	})

	t.Run("user without ranking sees user_has_voted=false", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		// Owner submits, member doesn't
		optIDs := getRankPollOptionIDs(poll)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Member gets results
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, false, resp["user_has_voted"])
		require.Equal(t, float64(1), resp["total_voters"])

		// User ranking should be empty or nil
		userRanking := resp["user_ranking"]
		if userRanking != nil {
			require.Len(t, userRanking.([]any), 0)
		}
	})

	t.Run("non-member cannot get results", func(t *testing.T) {
		owner, _, nonMember, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

/* =========================
   GET VOTERS
=========================*/

func TestRankPollVoters(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("returns voter status for all members", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// Only owner votes
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1},
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 2},
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 3},
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// Get voters
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollVotersRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		// DEBUG: Print what we actually got
		t.Logf("=== DEBUG INFO ===")
		t.Logf("Trip ID: %s", tripID)
		t.Logf("Poll ID: %s", pollID)
		t.Logf("Owner ID: %s", owner)
		t.Logf("Member ID: %s", member)
		t.Logf("Total members from API: %v", resp["total_members"])
		t.Logf("Total voters from API: %v", resp["total_voters"])

		voters := resp["voters"].([]any)
		t.Logf("Voters array length: %d", len(voters))
		for i, v := range voters {
			voter := v.(map[string]any)
			t.Logf("  Voter %d: user_id=%s, username=%s, has_voted=%v",
				i, voter["user_id"], voter["username"], voter["has_voted"])
		}
		t.Logf("=================")

		require.Equal(t, pollID, resp["poll_id"])
		require.Equal(t, float64(2), resp["total_members"])
		require.Equal(t, float64(1), resp["total_voters"])

		require.Len(t, voters, 2)

		// Verify one voted, one didn't
		votedCount := 0
		for _, v := range voters {
			voter := v.(map[string]any)
			if voter["has_voted"].(bool) {
				votedCount++
			}
		}
		require.Equal(t, 1, votedCount)
	})

	t.Run("non-member cannot get voters", func(t *testing.T) {
		owner, _, nonMember, tripID := setupRankPollTestEnv(t, app)
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollVotersRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

/* =========================
   END-TO-END LIFECYCLE
=========================*/

func TestRankPollLifecycle(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("full lifecycle with multiple voters and Borda count", func(t *testing.T) {
		owner, member, _, tripID := setupRankPollTestEnv(t, app)

		// 1. Create poll
		poll := createRankPoll(t, app, owner, tripID, defaultRankPollRequest())
		pollID := poll["id"].(string)
		optIDs := getRankPollOptionIDs(poll)

		// 2. Add a 4th option before any rankings
		addResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollOptionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Berlin",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		berlinID := addResp["id"].(string)
		optIDs = append(optIDs, berlinID)

		// 3. Owner ranks: Paris(1), Berlin(2), Tokyo(3), London(4)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 1}, // Paris
						{OptionID: uuid.MustParse(berlinID), Rank: 2},  // Berlin
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 3}, // Tokyo
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 4}, // London
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// 4. Member ranks: Tokyo(1), Paris(2), Berlin(3), London(4)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  submitRankingRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.SubmitRankingRequest{
					Rankings: []models.RankingItem{
						{OptionID: uuid.MustParse(optIDs[1]), Rank: 1}, // Tokyo
						{OptionID: uuid.MustParse(optIDs[0]), Rank: 2}, // Paris
						{OptionID: uuid.MustParse(berlinID), Rank: 3},  // Berlin
						{OptionID: uuid.MustParse(optIDs[2]), Rank: 4}, // London
					},
				},
			}).
			AssertStatus(http.StatusOK)

		// 5. Get results
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		// Verify Borda scores (4 options: 1st=4pts, 2nd=3pts, 3rd=2pts, 4th=1pt)
		// Paris: 4+3 = 7pts
		// Tokyo: 2+4 = 6pts
		// Berlin: 3+2 = 5pts
		// London: 1+1 = 2pts
		allOptions := resp["all_options"].([]any)
		require.Len(t, allOptions, 4)

		// Top 3 should be Paris, Tokyo, Berlin
		top3 := resp["top_3"].([]any)
		require.Len(t, top3, 3)

		firstPlace := top3[0].(map[string]any)
		require.Equal(t, "Paris", firstPlace["name"])
		require.Equal(t, float64(7), firstPlace["borda_score"])

		secondPlace := top3[1].(map[string]any)
		require.Equal(t, "Tokyo", secondPlace["name"])
		require.Equal(t, float64(6), secondPlace["borda_score"])

		thirdPlace := top3[2].(map[string]any)
		require.Equal(t, "Berlin", thirdPlace["name"])
		require.Equal(t, float64(5), thirdPlace["borda_score"])

		// Verify user ranking shows owner's choices
		userRanking := resp["user_ranking"].([]any)
		require.Len(t, userRanking, 4)
		require.Equal(t, true, resp["user_has_voted"])

		// 6. Check voters
		votersResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  rankPollVotersRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, float64(2), votersResp["total_voters"])
		require.Equal(t, float64(2), votersResp["total_members"])

		// 7. Delete poll
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Verify deleted
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singleRankPollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})
}
