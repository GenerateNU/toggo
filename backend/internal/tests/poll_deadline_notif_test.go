package tests

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"
	"toggo/internal/models"
	"toggo/internal/workflows/notifications"

	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

type mockPollRepo struct {
	poll *models.Poll
	err  error
}

func (m *mockPollRepo) FindPollMetaByID(_ context.Context, _ uuid.UUID) (*models.Poll, error) {
	return m.poll, m.err
}

type mockPollRankingRepo struct {
	voters []models.VoterInfo
	err    error
}

func (m *mockPollRankingRepo) GetVoterStatus(_ context.Context, _, _ uuid.UUID) ([]models.VoterInfo, error) {
	return m.voters, m.err
}

type mockPollVotingRepo struct {
	voters []models.VoterInfo
	err    error
}

func (m *mockPollVotingRepo) GetVoterStatus(_ context.Context, _, _ uuid.UUID) ([]models.VoterInfo, error) {
	return m.voters, m.err
}

type mockTokenFetcher struct {
	users []*models.User
	err   error
}

func (m *mockTokenFetcher) GetUsersWithDeviceTokens(_ context.Context, _ []uuid.UUID) ([]*models.User, error) {
	return m.users, m.err
}

type mockNotificationSender struct {
	called    bool
	callCount int
	userIDs   []uuid.UUID
	err       error
}

func (m *mockNotificationSender) SendNotification(_ context.Context, req models.SendNotificationRequest) error {
	m.called = true
	m.callCount++
	m.userIDs = append(m.userIDs, req.UserID)
	return m.err
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func buildActivity(
	poll *mockPollRepo,
	rankingVoters *mockPollRankingRepo,
	votingVoters *mockPollVotingRepo,
	users *mockTokenFetcher,
	sender *mockNotificationSender,
) *notifications.NotificationActivities {
	return &notifications.NotificationActivities{
		PollRepo:           poll,
		PollRankingRepo:    rankingVoters,
		PollVotingRepo:     votingVoters,
		UserRepo:           users,
		NotificationSender: sender,
	}
}

func mustMarshalPayload(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(fmt.Sprintf("mustMarshalPayload: %v", err))
	}
	return b
}

func futureDeadline() time.Time {
	return time.Now().Add(12 * time.Hour).UTC()
}

func defaultPayload() notifications.PollDeadlineReminderPayload {
	return notifications.PollDeadlineReminderPayload{
		PollID:   uuid.New(),
		TripID:   uuid.New(),
		Deadline: futureDeadline(),
	}
}

func dispatchReminderInput(payload notifications.PollDeadlineReminderPayload) notifications.ScheduledNotificationInput {
	return notifications.ScheduledNotificationInput{
		TriggerAt: payload.Deadline.Add(-24 * time.Hour),
		JobType:   notifications.JobTypePollDeadlineReminder,
		Payload:   mustMarshalPayload(payload),
	}
}

func tokenPtr(s string) *string { return &s }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestPollDeadlineReminderActivity_PollNotFound(t *testing.T) {
	t.Parallel()

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{err: fmt.Errorf("not found")},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{},
		&mockTokenFetcher{},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Errorf("expected nil error when poll not found, got %v", err)
	}
	if sender.called {
		t.Error("expected notification NOT to be sent when poll not found")
	}
}

func TestPollDeadlineReminderActivity_DeadlinePassed(t *testing.T) {
	t.Parallel()

	past := time.Now().Add(-1 * time.Hour).UTC()
	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeSingle,
		Deadline: &past,
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{},
		&mockTokenFetcher{},
		sender,
	)

	payload := defaultPayload()
	payload.Deadline = past

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(payload))

	if err != nil {
		t.Errorf("expected nil error when deadline passed, got %v", err)
	}
	if sender.called {
		t.Error("expected notification NOT to be sent when deadline has passed")
	}
}

func TestPollDeadlineReminderActivity_NoDeadline(t *testing.T) {
	t.Parallel()

	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeSingle,
		Deadline: nil,
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{},
		&mockTokenFetcher{},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Errorf("expected nil error when poll has no deadline, got %v", err)
	}
	if sender.called {
		t.Error("expected notification NOT to be sent when poll has no deadline")
	}
}

func TestPollDeadlineReminderActivity_AllMembersVoted(t *testing.T) {
	t.Parallel()

	deadline := futureDeadline()
	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeSingle,
		Deadline: &deadline,
	}

	voters := []models.VoterInfo{
		{UserID: uuid.New(), Username: "alice", HasVoted: true},
		{UserID: uuid.New(), Username: "bob", HasVoted: true},
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{voters: voters},
		&mockTokenFetcher{},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Errorf("expected nil error when all members voted, got %v", err)
	}
	if sender.called {
		t.Error("expected notification NOT to be sent when all members have voted")
	}
}

func TestPollDeadlineReminderActivity_NoUsersWithTokens(t *testing.T) {
	t.Parallel()

	deadline := futureDeadline()
	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeSingle,
		Deadline: &deadline,
	}

	voters := []models.VoterInfo{
		{UserID: uuid.New(), Username: "alice", HasVoted: false},
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{voters: voters},
		&mockTokenFetcher{users: []*models.User{}},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Errorf("expected nil error when no users have tokens, got %v", err)
	}
	if sender.called {
		t.Error("expected notification NOT to be sent when no users have tokens")
	}
}

func TestPollDeadlineReminderActivity_HappyPath_VotePoll(t *testing.T) {
	t.Parallel()

	deadline := futureDeadline()
	userID := uuid.New()

	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeSingle,
		Question: "Where should we eat?",
		Deadline: &deadline,
	}

	voters := []models.VoterInfo{
		{UserID: userID, Username: "alice", HasVoted: false},
		{UserID: uuid.New(), Username: "bob", HasVoted: true},
	}

	users := []*models.User{
		{ID: userID, DeviceToken: tokenPtr("ExponentPushToken[aaa]"), Timezone: "America/New_York"},
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{voters: voters},
		&mockTokenFetcher{users: users},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !sender.called {
		t.Fatal("expected notification to be sent")
	}
	if sender.callCount != 1 {
		t.Errorf("expected 1 notification sent, got %d", sender.callCount)
	}
	if sender.userIDs[0] != userID {
		t.Errorf("expected notification sent to user %s, got %s", userID, sender.userIDs[0])
	}
}

func TestPollDeadlineReminderActivity_HappyPath_RankPoll(t *testing.T) {
	t.Parallel()

	deadline := futureDeadline()
	userID := uuid.New()

	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeRank,
		Question: "Where should we travel?",
		Deadline: &deadline,
	}

	voters := []models.VoterInfo{
		{UserID: userID, Username: "alice", HasVoted: false},
	}

	users := []*models.User{
		{ID: userID, DeviceToken: tokenPtr("ExponentPushToken[bbb]"), Timezone: "Asia/Tokyo"},
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{voters: voters},
		&mockPollVotingRepo{},
		&mockTokenFetcher{users: users},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !sender.called {
		t.Fatal("expected notification to be sent")
	}
	if sender.userIDs[0] != userID {
		t.Errorf("expected notification sent to user %s, got %s", userID, sender.userIDs[0])
	}
}

func TestPollDeadlineReminderActivity_OnlyUnvotedUsersNotified(t *testing.T) {
	t.Parallel()

	deadline := futureDeadline()
	votedUserID := uuid.New()
	unvotedUserID := uuid.New()

	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeSingle,
		Question: "Pizza or sushi?",
		Deadline: &deadline,
	}

	voters := []models.VoterInfo{
		{UserID: votedUserID, Username: "alice", HasVoted: true},
		{UserID: unvotedUserID, Username: "bob", HasVoted: false},
	}

	users := []*models.User{
		{ID: unvotedUserID, DeviceToken: tokenPtr("ExponentPushToken[ccc]"), Timezone: "UTC"},
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{voters: voters},
		&mockTokenFetcher{users: users},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if sender.callCount != 1 {
		t.Errorf("expected exactly 1 notification (unvoted user), got %d", sender.callCount)
	}
	if sender.userIDs[0] != unvotedUserID {
		t.Errorf("expected notification for unvoted user %s, got %s", unvotedUserID, sender.userIDs[0])
	}
}

func TestPollDeadlineReminderActivity_PerUserNotification(t *testing.T) {
	t.Parallel()

	deadline := futureDeadline()
	userID1 := uuid.New()
	userID2 := uuid.New()

	poll := &models.Poll{
		ID:       uuid.New(),
		PollType: models.PollTypeSingle,
		Question: "Tacos or pizza?",
		Deadline: &deadline,
	}

	voters := []models.VoterInfo{
		{UserID: userID1, HasVoted: false},
		{UserID: userID2, HasVoted: false},
	}

	users := []*models.User{
		{ID: userID1, DeviceToken: tokenPtr("ExponentPushToken[tz1]"), Timezone: "America/New_York"},
		{ID: userID2, DeviceToken: tokenPtr("ExponentPushToken[tz2]"), Timezone: "Asia/Tokyo"},
	}

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{poll: poll},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{voters: voters},
		&mockTokenFetcher{users: users},
		sender,
	)

	err := act.DispatchNotification(context.Background(), dispatchReminderInput(defaultPayload()))

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if sender.callCount != 2 {
		t.Errorf("expected 2 SendNotification calls (one per user), got %d", sender.callCount)
	}
}

func TestPollDeadlineReminderActivity_UnknownJobType(t *testing.T) {
	t.Parallel()

	sender := &mockNotificationSender{}
	act := buildActivity(
		&mockPollRepo{},
		&mockPollRankingRepo{},
		&mockPollVotingRepo{},
		&mockTokenFetcher{},
		sender,
	)

	err := act.DispatchNotification(context.Background(), notifications.ScheduledNotificationInput{
		JobType: "unknown_job_type",
		Payload: []byte(`{}`),
	})

	if err == nil {
		t.Error("expected error for unknown job type")
	}
}
