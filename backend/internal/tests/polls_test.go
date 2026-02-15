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
   Poll Helpers
=========================*/

func setupPollTestEnv(t *testing.T, app *fiber.App) (owner, member, nonMember, tripID string) {
	t.Helper()
	owner = createPollUser(t, app)
	member = createPollUser(t, app)
	nonMember = createPollUser(t, app)
	tripID = createPollTrip(t, app, owner)
	addPollMember(t, app, owner, member, tripID)
	return
}

func createPollUser(t *testing.T, app *fiber.App) string {
	t.Helper()
	id := fakes.GenerateUUID()
	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/users",
			Method: testkit.POST,
			UserID: &id,
			Body: models.CreateUserRequest{
				Name:        "PollUser",
				Username:    fakes.GenerateRandomUsername(),
				PhoneNumber: fakes.GenerateRandomPhoneNumber(),
			},
		}).
		AssertStatus(http.StatusCreated)
	return id
}

func createPollTrip(t *testing.T, app *fiber.App, ownerID string) string {
	t.Helper()
	resp := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/trips",
			Method: testkit.POST,
			UserID: &ownerID,
			Body: models.CreateTripRequest{
				Name:      "PollTrip-" + uuid.NewString()[:8],
				BudgetMin: 100,
				BudgetMax: 500,
			},
		}).
		AssertStatus(http.StatusCreated).
		GetBody()
	return resp["id"].(string)
}

func addPollMember(t *testing.T, app *fiber.App, adminID, userID, tripID string) {
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

func pollRoute(tripID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/vote-polls", tripID)
}

func singlePollRoute(tripID, pollID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/vote-polls/%s", tripID, pollID)
}

func optionRoute(tripID, pollID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/vote-polls/%s/options", tripID, pollID)
}

func deleteOptionRoute(tripID, pollID, optionID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/vote-polls/%s/options/%s", tripID, pollID, optionID)
}

func voteRoute(tripID, pollID string) string {
	return fmt.Sprintf("/api/v1/trips/%s/vote-polls/%s/vote", tripID, pollID)
}

// setPollDeadlineInDB directly sets the deadline column on a poll, bypassing
// the service-layer "deadline must be in the future" validation.
// Useful for tests that need a poll whose deadline has already passed.
func setPollDeadlineInDB(t *testing.T, pollID string, deadline time.Time) {
	t.Helper()
	db := fakes.GetSharedDB()
	_, err := db.NewUpdate().
		TableExpr("polls").
		Set("deadline = ?", deadline).
		Where("id = ?", uuid.MustParse(pollID)).
		Exec(context.Background())
	require.NoError(t, err)
}

func createPoll(t *testing.T, app *fiber.App, userID, tripID string, req models.CreatePollRequest) map[string]any {
	t.Helper()
	return testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  pollRoute(tripID),
			Method: testkit.POST,
			UserID: &userID,
			Body:   req,
		}).
		AssertStatus(http.StatusCreated).
		GetBody()
}

func defaultPollRequest() models.CreatePollRequest {
	return models.CreatePollRequest{
		Question: "Where should we eat?",
		PollType: models.PollTypeSingle,
		Options: []models.CreatePollOptionRequest{
			{OptionType: models.OptionTypeCustom, Name: "Pizza"},
			{OptionType: models.OptionTypeCustom, Name: "Sushi"},
		},
	}
}

func multiPollRequest() models.CreatePollRequest {
	return models.CreatePollRequest{
		Question: "What activities?",
		PollType: models.PollTypeMulti,
		Options: []models.CreatePollOptionRequest{
			{OptionType: models.OptionTypeCustom, Name: "Hiking"},
			{OptionType: models.OptionTypeCustom, Name: "Swimming"},
			{OptionType: models.OptionTypeCustom, Name: "Cycling"},
		},
	}
}

func threeOptionPollRequest() models.CreatePollRequest {
	return models.CreatePollRequest{
		Question: "Pick a food?",
		PollType: models.PollTypeSingle,
		Options: []models.CreatePollOptionRequest{
			{OptionType: models.OptionTypeCustom, Name: "Pizza"},
			{OptionType: models.OptionTypeCustom, Name: "Sushi"},
			{OptionType: models.OptionTypeCustom, Name: "Tacos"},
		},
	}
}

func getOptionIDs(pollResp map[string]any) []string {
	opts := pollResp["options"].([]any)
	ids := make([]string, len(opts))
	for i, o := range opts {
		ids[i] = o.(map[string]any)["id"].(string)
	}
	return ids
}

/* =========================
   CREATE POLL
=========================*/

func TestPollCreate(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creates single-choice poll", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		resp := createPoll(t, app, owner, tripID, defaultPollRequest())

		require.Equal(t, "Where should we eat?", resp["question"])
		require.Equal(t, "single", resp["poll_type"])
		require.NotEmpty(t, resp["id"])
		require.Equal(t, tripID, resp["trip_id"])
		options := resp["options"].([]any)
		require.Len(t, options, 2)

		// Each option should have vote_count=0 and voted=false
		for _, o := range options {
			opt := o.(map[string]any)
			require.Equal(t, float64(0), opt["vote_count"])
			require.Equal(t, false, opt["voted"])
		}
	})

	t.Run("creates multi-choice poll", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		resp := createPoll(t, app, owner, tripID, multiPollRequest())

		require.Equal(t, "multi", resp["poll_type"])
		options := resp["options"].([]any)
		require.Len(t, options, 3)
	})

	t.Run("non-member cannot create poll", func(t *testing.T) {
		_, _, nonMember, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &nonMember,
				Body:   defaultPollRequest(),
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("rejects poll with exactly 1 option", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollRequest{
					Question: "bad poll",
					PollType: models.PollTypeSingle,
					Options: []models.CreatePollOptionRequest{
						{OptionType: models.OptionTypeCustom, Name: "Only one"},
					},
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("creates default Yes/No poll when no options provided", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollRequest{
					Question: "Should we go?",
					PollType: models.PollTypeSingle,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		options := resp["options"].([]any)
		require.Len(t, options, 2)
		names := []string{
			options[0].(map[string]any)["name"].(string),
			options[1].(map[string]any)["name"].(string),
		}
		require.Contains(t, names, "Yes")
		require.Contains(t, names, "No")
	})

	t.Run("creates default Yes/No poll when empty options array", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollRequest{
					Question: "Should we stay?",
					PollType: models.PollTypeSingle,
					Options:  []models.CreatePollOptionRequest{},
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		options := resp["options"].([]any)
		require.Len(t, options, 2)
		names := []string{
			options[0].(map[string]any)["name"].(string),
			options[1].(map[string]any)["name"].(string),
		}
		require.Contains(t, names, "Yes")
		require.Contains(t, names, "No")
	})

	t.Run("rejects poll with more than 15 options", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
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
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollRequest{
					Question: "too many options",
					PollType: models.PollTypeSingle,
					Options:  opts,
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("accepts poll with exactly 15 options", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		opts := make([]models.CreatePollOptionRequest, 15)
		for i := range opts {
			opts[i] = models.CreatePollOptionRequest{
				OptionType: models.OptionTypeCustom,
				Name:       fmt.Sprintf("Option %d", i+1),
			}
		}
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollRequest{
					Question: "max options",
					PollType: models.PollTypeSingle,
					Options:  opts,
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		options := resp["options"].([]any)
		require.Len(t, options, 15)
	})

	t.Run("rejects poll with invalid poll type", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: map[string]any{
					"question":  "bad type",
					"poll_type": "invalid",
					"options": []map[string]any{
						{"option_type": "custom", "name": "A"},
						{"option_type": "custom", "name": "B"},
					},
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("rejects poll with deadline in the past", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		past := time.Now().Add(-1 * time.Hour).UTC()
		req := defaultPollRequest()
		req.Deadline = &past

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   req,
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   GET POLL
=========================*/

func TestPollGet(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("member can get poll with vote info", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, pollID, resp["id"])
		require.Equal(t, "Where should we eat?", resp["question"])
		options := resp["options"].([]any)
		require.Len(t, options, 2)
		for _, o := range options {
			opt := o.(map[string]any)
			require.Equal(t, float64(0), opt["vote_count"])
			require.Equal(t, false, opt["voted"])
		}
	})

	t.Run("non-member cannot get poll", func(t *testing.T) {
		owner, _, nonMember, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("returns 404 for nonexistent poll", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		fakePollID := uuid.NewString()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, fakePollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})
}

/* =========================
   UPDATE POLL
=========================*/

func TestPollUpdate(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creator can update question", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		newQ := "Where should we really eat?"

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Question: &newQ},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, newQ, resp["question"])
		// Ensure vote info is still present
		require.NotNil(t, resp["options"])
	})

	t.Run("creator can update deadline", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		deadline := time.Now().Add(48 * time.Hour).UTC().Truncate(time.Second)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Deadline: &deadline},
			}).
			AssertStatus(http.StatusOK).
			AssertFieldExists("deadline")
	})

	t.Run("non-creator cannot update", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		q := "hacked"

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &member,
				Body:   models.UpdatePollRequest{Question: &q},
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("cannot update after deadline passed", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		// Force a past deadline directly in the DB
		past := time.Now().Add(-1 * time.Hour).UTC()
		setPollDeadlineInDB(t, pollID, past)
		q := "too late"

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Question: &q},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("rejects update with deadline in the past", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		past := time.Now().Add(-1 * time.Hour).UTC()

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Deadline: &past},
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   DELETE POLL
=========================*/

func TestPollDelete(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("creator can delete poll", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
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
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-creator non-admin cannot delete", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &member,
			}).
			AssertStatus(http.StatusForbidden)
	})

	t.Run("admin can delete another member's poll", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, member, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		// owner is admin (trip creator)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, pollID, resp["id"])
	})
}

/* =========================
   ADD / DELETE OPTION
=========================*/

func TestPollOptions(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("member can add option before any votes", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  optionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Tacos",
				},
			}).
			AssertStatus(http.StatusCreated).
			GetBody()

		require.Equal(t, "Tacos", resp["name"])
		require.Equal(t, "custom", resp["option_type"])
	})

	t.Run("cannot add option after votes exist", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Cast a vote first
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Try to add option — should fail with 409
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  optionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Late option",
				},
			}).
			AssertStatus(http.StatusConflict)
	})

	t.Run("member can delete option before any votes", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, threeOptionPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteOptionRoute(tripID, pollID, optIDs[0]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, optIDs[0], resp["id"])
		require.Equal(t, pollID, resp["poll_id"])
	})

	t.Run("cannot delete option after votes exist", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, threeOptionPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Cast a vote
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Deleting an option should now be rejected (votes exist)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteOptionRoute(tripID, pollID, optIDs[2]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusConflict)
	})

	t.Run("cannot delete option when only 2 remain", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Poll has exactly 2 options — deleting one should be rejected
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteOptionRoute(tripID, pollID, optIDs[0]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("non-member cannot add option", func(t *testing.T) {
		owner, _, nonMember, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  optionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &nonMember,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "Nope",
				},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("cannot add option when poll already has 15 options", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		// Create a poll with exactly 15 options
		opts := make([]models.CreatePollOptionRequest, 15)
		for i := range opts {
			opts[i] = models.CreatePollOptionRequest{
				OptionType: models.OptionTypeCustom,
				Name:       fmt.Sprintf("Opt %d", i+1),
			}
		}
		poll := createPoll(t, app, owner, tripID, models.CreatePollRequest{
			Question: "max options poll",
			PollType: models.PollTypeSingle,
			Options:  opts,
		})
		pollID := poll["id"].(string)

		// Try to add a 16th option — should fail
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  optionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CreatePollOptionRequest{
					OptionType: models.OptionTypeCustom,
					Name:       "One too many",
				},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("cannot add option after deadline passed", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		// Force a past deadline directly in the DB
		past := time.Now().Add(-1 * time.Hour).UTC()
		setPollDeadlineInDB(t, pollID, past)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  optionRoute(tripID, pollID),
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
   CAST VOTE
=========================*/

func TestPollVoting(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("member can vote on single-choice poll", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Response should be full PollAPIResponse with vote info
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, pollID, resp["id"])
		options := resp["options"].([]any)
		for _, o := range options {
			opt := o.(map[string]any)
			if opt["id"] == optIDs[0] {
				require.Equal(t, float64(1), opt["vote_count"])
				require.Equal(t, true, opt["voted"])
			} else {
				require.Equal(t, float64(0), opt["vote_count"])
				require.Equal(t, false, opt["voted"])
			}
		}
	})

	t.Run("member can vote on multi-choice poll", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, multiPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.CastVoteRequest{OptionIDs: []uuid.UUID{
					uuid.MustParse(optIDs[0]),
					uuid.MustParse(optIDs[2]),
				}},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		options := resp["options"].([]any)
		votedCount := 0
		for _, o := range options {
			opt := o.(map[string]any)
			if opt["voted"].(bool) {
				votedCount++
			}
		}
		require.Equal(t, 2, votedCount)
	})

	t.Run("single-choice poll rejects multiple votes", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.CastVoteRequest{OptionIDs: []uuid.UUID{
					uuid.MustParse(optIDs[0]),
					uuid.MustParse(optIDs[1]),
				}},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("vote replaces previous vote", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// First vote
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Change vote
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[1])}},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		// Verify only the second option has the vote
		for _, o := range resp["options"].([]any) {
			opt := o.(map[string]any)
			if opt["id"] == optIDs[0] {
				require.Equal(t, float64(0), opt["vote_count"])
				require.Equal(t, false, opt["voted"])
			} else if opt["id"] == optIDs[1] {
				require.Equal(t, float64(1), opt["vote_count"])
				require.Equal(t, true, opt["voted"])
			}
		}
	})

	t.Run("multiple users voting shows correct counts", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Owner votes for option 0
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Member votes for option 0
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Get poll and verify counts
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, o := range resp["options"].([]any) {
			opt := o.(map[string]any)
			if opt["id"] == optIDs[0] {
				require.Equal(t, float64(2), opt["vote_count"])
			} else {
				require.Equal(t, float64(0), opt["vote_count"])
			}
		}
	})

	t.Run("voted flag is per-user", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Owner votes option 0
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Member gets poll — should see vote_count=1 but voted=false for option 0
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, o := range resp["options"].([]any) {
			opt := o.(map[string]any)
			if opt["id"] == optIDs[0] {
				require.Equal(t, float64(1), opt["vote_count"])
				require.Equal(t, false, opt["voted"], "member did not vote, should be false")
			}
		}
	})

	t.Run("can fully remove all votes", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Vote for an option first
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Fully remove all votes by sending empty option_ids
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{}},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		// All options should have vote_count=0 and voted=false
		for _, o := range resp["options"].([]any) {
			opt := o.(map[string]any)
			require.Equal(t, float64(0), opt["vote_count"], "vote_count should be 0 after removing all votes")
			require.Equal(t, false, opt["voted"], "voted should be false after removing all votes")
		}
	})

	t.Run("rejects vote for option not in poll", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.New()}},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("non-member cannot vote", func(t *testing.T) {
		owner, _, nonMember, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &nonMember,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("cannot vote after deadline", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)
		// Force a past deadline directly in the DB
		past := time.Now().Add(-1 * time.Hour).UTC()
		setPollDeadlineInDB(t, pollID, past)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusBadRequest)
	})
}

/* =========================
   GET POLLS BY TRIP (PAGINATION)
=========================*/

func TestPollPagination(t *testing.T) {
	app := fakes.GetSharedTestApp()

	t.Run("returns paginated polls with vote info", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)

		// Create 5 polls
		for i := 0; i < 5; i++ {
			req := models.CreatePollRequest{
				Question: fmt.Sprintf("Question %d", i),
				PollType: models.PollTypeSingle,
				Options: []models.CreatePollOptionRequest{
					{OptionType: models.OptionTypeCustom, Name: "A"},
					{OptionType: models.OptionTypeCustom, Name: "B"},
				},
			}
			createPoll(t, app, owner, tripID, req)
		}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.GET,
				UserID: &owner,
				Query:  map[string]string{"limit": "3"},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]any)
		require.Len(t, items, 3)
		require.Equal(t, float64(3), resp["limit"])
		require.NotNil(t, resp["next_cursor"])

		// Each poll in the list should have options with vote_count and voted fields
		for _, it := range items {
			poll := it.(map[string]any)
			require.NotNil(t, poll["options"])
			for _, o := range poll["options"].([]any) {
				opt := o.(map[string]any)
				require.NotNil(t, opt["vote_count"])
				require.NotNil(t, opt["voted"])
			}
		}

		// Fetch next page
		nextResp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.GET,
				UserID: &owner,
				Query:  map[string]string{"limit": "3", "cursor": resp["next_cursor"].(string)},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		nextItems := nextResp["items"].([]any)
		require.Len(t, nextItems, 2)
		require.Nil(t, nextResp["next_cursor"])
	})

	t.Run("pagination with votes shows correct counts per poll", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)

		// Create 2 polls
		poll1 := createPoll(t, app, owner, tripID, defaultPollRequest())
		poll1ID := poll1["id"].(string)
		poll1Opts := getOptionIDs(poll1)

		poll2 := createPoll(t, app, owner, tripID, multiPollRequest())
		poll2ID := poll2["id"].(string)
		poll2Opts := getOptionIDs(poll2)

		// Vote on poll 1
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, poll1ID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(poll1Opts[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Vote on poll 2 with two options
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, poll2ID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.CastVoteRequest{OptionIDs: []uuid.UUID{
					uuid.MustParse(poll2Opts[0]),
					uuid.MustParse(poll2Opts[1]),
				}},
			}).
			AssertStatus(http.StatusOK)

		// List all polls as owner
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.GET,
				UserID: &owner,
				Query:  map[string]string{"limit": "10"},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]any)
		require.Len(t, items, 2)
		for _, it := range items {
			poll := it.(map[string]any)
			require.NotNil(t, poll["options"])
		}
	})

	t.Run("non-member cannot list polls", func(t *testing.T) {
		owner, _, nonMember, tripID := setupPollTestEnv(t, app)
		createPoll(t, app, owner, tripID, defaultPollRequest())

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.GET,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("invalid cursor returns 400", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.GET,
				UserID: &owner,
				Query:  map[string]string{"cursor": "not-a-valid-cursor"},
			}).
			AssertStatus(http.StatusBadRequest)
	})

	t.Run("empty trip returns empty items", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]any)
		require.Len(t, items, 0)
		require.Nil(t, resp["next_cursor"])
	})

	t.Run("polls are returned newest first", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)

		var createdIDs []string
		for i := 0; i < 3; i++ {
			p := createPoll(t, app, owner, tripID, models.CreatePollRequest{
				Question: fmt.Sprintf("Q%d", i),
				PollType: models.PollTypeSingle,
				Options: []models.CreatePollOptionRequest{
					{OptionType: models.OptionTypeCustom, Name: "A"},
					{OptionType: models.OptionTypeCustom, Name: "B"},
				},
			})
			createdIDs = append(createdIDs, p["id"].(string))
		}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.GET,
				UserID: &owner,
				Query:  map[string]string{"limit": "10"},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		items := resp["items"].([]any)
		require.Len(t, items, 3)
		// Most recently created should be first
		require.Equal(t, createdIDs[2], items[0].(map[string]any)["id"])
		require.Equal(t, createdIDs[1], items[1].(map[string]any)["id"])
		require.Equal(t, createdIDs[0], items[2].(map[string]any)["id"])
	})
}

/* =========================
   EDGE CASES
=========================*/

func TestPollEdgeCases(t *testing.T) {
	app := fakes.GetSharedTestApp()

	// ── Create ──────────────────────────────────────────────────────────

	t.Run("create poll with future deadline succeeds", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		future := time.Now().Add(72 * time.Hour).UTC()
		req := defaultPollRequest()
		req.Deadline = &future

		resp := createPoll(t, app, owner, tripID, req)
		require.NotNil(t, resp["deadline"])
	})

	t.Run("create poll missing question returns 422", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: map[string]any{
					"poll_type": "single",
					"options": []map[string]any{
						{"option_type": "custom", "name": "A"},
						{"option_type": "custom", "name": "B"},
					},
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("create poll missing poll_type returns 422", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: map[string]any{
					"question": "Where?",
					"options": []map[string]any{
						{"option_type": "custom", "name": "A"},
						{"option_type": "custom", "name": "B"},
					},
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("create poll with exactly 2 options succeeds", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		resp := createPoll(t, app, owner, tripID, defaultPollRequest())
		options := resp["options"].([]any)
		require.Len(t, options, 2)
	})

	t.Run("create poll option with missing name returns 422", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(tripID),
				Method: testkit.POST,
				UserID: &owner,
				Body: map[string]any{
					"question":  "Q?",
					"poll_type": "single",
					"options": []map[string]any{
						{"option_type": "custom", "name": "A"},
						{"option_type": "custom"},
					},
				},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	t.Run("create poll on nonexistent trip returns 404", func(t *testing.T) {
		owner, _, _, _ := setupPollTestEnv(t, app)
		fakeTripID := uuid.NewString()
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  pollRoute(fakeTripID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   defaultPollRequest(),
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("create poll with invalid trip UUID returns 400", func(t *testing.T) {
		owner, _, _, _ := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/trips/not-a-uuid/vote-polls",
				Method: testkit.POST,
				UserID: &owner,
				Body:   defaultPollRequest(),
			}).
			AssertStatus(http.StatusBadRequest)
	})

	// ── Get ─────────────────────────────────────────────────────────────

	t.Run("get poll from wrong trip returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		// Create a second trip
		otherTrip := createPollTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(otherTrip, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("get poll with invalid poll UUID returns 400", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, "not-a-uuid"),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusBadRequest)
	})

	// ── Update ──────────────────────────────────────────────────────────

	t.Run("update preserves options and existing votes", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Cast a vote first
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Update question
		newQ := "Updated question"
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Question: &newQ},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, newQ, resp["question"])
		options := resp["options"].([]any)
		require.Len(t, options, 2, "options should be preserved after update")

		// Vote should still be reflected
		for _, o := range options {
			opt := o.(map[string]any)
			if opt["id"] == optIDs[0] {
				require.Equal(t, float64(1), opt["vote_count"])
				require.Equal(t, true, opt["voted"])
			}
		}
	})

	t.Run("update only deadline leaves question unchanged", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		originalQuestion := poll["question"].(string)

		deadline := time.Now().Add(48 * time.Hour).UTC().Truncate(time.Second)
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Deadline: &deadline},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.Equal(t, originalQuestion, resp["question"], "question should not change when only deadline is updated")
	})

	t.Run("update only question leaves deadline unchanged", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		future := time.Now().Add(72 * time.Hour).UTC()
		req := defaultPollRequest()
		req.Deadline = &future
		poll := createPoll(t, app, owner, tripID, req)
		pollID := poll["id"].(string)

		newQ := "New question"
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Question: &newQ},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		require.NotNil(t, resp["deadline"], "deadline should not be removed when only question is updated")
	})

	t.Run("non-member cannot update poll", func(t *testing.T) {
		owner, _, nonMember, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		q := "hacked"

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.PATCH,
				UserID: &nonMember,
				Body:   models.UpdatePollRequest{Question: &q},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("update nonexistent poll returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		q := "ghost"
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, uuid.NewString()),
				Method: testkit.PATCH,
				UserID: &owner,
				Body:   models.UpdatePollRequest{Question: &q},
			}).
			AssertStatus(http.StatusNotFound)
	})

	// ── Delete ──────────────────────────────────────────────────────────

	t.Run("delete nonexistent poll returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, uuid.NewString()),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete poll from wrong trip returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		otherTrip := createPollTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(otherTrip, pollID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-member cannot delete poll", func(t *testing.T) {
		owner, _, nonMember, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete poll cascades votes", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Vote
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Delete
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK)

		// Verify the poll and its votes are gone
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	// ── Options ─────────────────────────────────────────────────────────

	t.Run("delete nonexistent option returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, threeOptionPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteOptionRoute(tripID, pollID, uuid.NewString()),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("delete option from wrong poll returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll1 := createPoll(t, app, owner, tripID, threeOptionPollRequest())
		poll2 := createPoll(t, app, owner, tripID, threeOptionPollRequest())
		poll2ID := poll2["id"].(string)
		poll1Opts := getOptionIDs(poll1)

		// Try to delete poll1's option via poll2's route
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteOptionRoute(tripID, poll2ID, poll1Opts[0]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("non-member cannot delete option", func(t *testing.T) {
		owner, _, nonMember, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, threeOptionPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteOptionRoute(tripID, pollID, optIDs[0]),
				Method: testkit.DELETE,
				UserID: &nonMember,
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("add option missing name returns 422", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  optionRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   map[string]any{"option_type": "custom"},
			}).
			AssertStatus(http.StatusUnprocessableEntity)
	})

	// ── Voting ──────────────────────────────────────────────────────────

	t.Run("vote on poll from wrong trip returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		otherTrip := createPollTrip(t, app, owner)

		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(otherTrip, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("vote on nonexistent poll returns 404", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, uuid.NewString()),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.New()}},
			}).
			AssertStatus(http.StatusNotFound)
	})

	t.Run("duplicate option IDs in vote are rejected", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, multiPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)
		sameOpt := uuid.MustParse(optIDs[0])

		// Send the same option ID twice in a multi-choice poll.
		// The DB has a composite PK (poll_id, option_id, user_id), so the
		// duplicate insert causes a constraint violation → 409 Conflict.
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{sameOpt, sameOpt}},
			}).
			AssertStatus(http.StatusConflict)
	})

	t.Run("re-voting for same option is idempotent", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, defaultPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)
		opt := uuid.MustParse(optIDs[0])

		// Vote
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{opt}},
			}).
			AssertStatus(http.StatusOK)

		// Vote again for same option
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{opt}},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, o := range resp["options"].([]any) {
			opt := o.(map[string]any)
			if opt["id"] == optIDs[0] {
				require.Equal(t, float64(1), opt["vote_count"], "re-voting same option should not increase count")
				require.Equal(t, true, opt["voted"])
			} else {
				require.Equal(t, float64(0), opt["vote_count"])
			}
		}
	})

	t.Run("multi-choice vote for all options", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, multiPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		allOpts := make([]uuid.UUID, len(optIDs))
		for i, id := range optIDs {
			allOpts[i] = uuid.MustParse(id)
		}

		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: allOpts},
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		options := resp["options"].([]any)
		for _, o := range options {
			opt := o.(map[string]any)
			require.Equal(t, float64(1), opt["vote_count"])
			require.Equal(t, true, opt["voted"])
		}
	})

	t.Run("delete option rejected after votes even on unvoted option", func(t *testing.T) {
		owner, _, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, threeOptionPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Vote for option 0
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body:   models.CastVoteRequest{OptionIDs: []uuid.UUID{uuid.MustParse(optIDs[0])}},
			}).
			AssertStatus(http.StatusOK)

		// Try to delete option 2 (unvoted) — should still be rejected because poll has votes
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  deleteOptionRoute(tripID, pollID, optIDs[2]),
				Method: testkit.DELETE,
				UserID: &owner,
			}).
			AssertStatus(http.StatusConflict)
	})

	t.Run("multiple users on multi-choice shows independent vote_counts", func(t *testing.T) {
		owner, member, _, tripID := setupPollTestEnv(t, app)
		poll := createPoll(t, app, owner, tripID, multiPollRequest())
		pollID := poll["id"].(string)
		optIDs := getOptionIDs(poll)

		// Owner votes for option 0 and 1
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &owner,
				Body: models.CastVoteRequest{OptionIDs: []uuid.UUID{
					uuid.MustParse(optIDs[0]),
					uuid.MustParse(optIDs[1]),
				}},
			}).
			AssertStatus(http.StatusOK)

		// Member votes for option 1 and 2
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  voteRoute(tripID, pollID),
				Method: testkit.POST,
				UserID: &member,
				Body: models.CastVoteRequest{OptionIDs: []uuid.UUID{
					uuid.MustParse(optIDs[1]),
					uuid.MustParse(optIDs[2]),
				}},
			}).
			AssertStatus(http.StatusOK)

		// Get poll as owner — verify counts and per-user voted flags
		resp := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &owner,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, o := range resp["options"].([]any) {
			opt := o.(map[string]any)
			switch opt["id"] {
			case optIDs[0]:
				require.Equal(t, float64(1), opt["vote_count"], "only owner voted for opt 0")
				require.Equal(t, true, opt["voted"], "owner voted for opt 0")
			case optIDs[1]:
				require.Equal(t, float64(2), opt["vote_count"], "both voted for opt 1")
				require.Equal(t, true, opt["voted"], "owner voted for opt 1")
			case optIDs[2]:
				require.Equal(t, float64(1), opt["vote_count"], "only member voted for opt 2")
				require.Equal(t, false, opt["voted"], "owner did NOT vote for opt 2")
			}
		}

		// Get poll as member — same counts, different voted flags
		respMember := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  singlePollRoute(tripID, pollID),
				Method: testkit.GET,
				UserID: &member,
			}).
			AssertStatus(http.StatusOK).
			GetBody()

		for _, o := range respMember["options"].([]any) {
			opt := o.(map[string]any)
			switch opt["id"] {
			case optIDs[0]:
				require.Equal(t, float64(1), opt["vote_count"])
				require.Equal(t, false, opt["voted"], "member did NOT vote for opt 0")
			case optIDs[1]:
				require.Equal(t, float64(2), opt["vote_count"])
				require.Equal(t, true, opt["voted"], "member voted for opt 1")
			case optIDs[2]:
				require.Equal(t, float64(1), opt["vote_count"])
				require.Equal(t, true, opt["voted"], "member voted for opt 2")
			}
		}
	})
}
