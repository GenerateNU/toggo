package services

import (
	"context"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type NotificationPreferencesServiceInterface interface {
	GetPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error)
	CreatePreferences(ctx context.Context, userID uuid.UUID, req models.CreateNotificationPreferencesRequest) (*models.NotificationPreferences, error)
	UpdatePreferences(ctx context.Context, userID uuid.UUID, req models.UpdateNotificationPreferencesRequest) (*models.NotificationPreferences, error)
	DeletePreferences(ctx context.Context, userID uuid.UUID) error
	GetOrCreateDefaultPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error)
}

var _ NotificationPreferencesServiceInterface = (*NotificationPreferencesService)(nil)

type NotificationPreferencesService struct {
	*repository.Repository
}

func NewNotificationPreferencesService(repo *repository.Repository) NotificationPreferencesServiceInterface {
	return &NotificationPreferencesService{Repository: repo}
}

func (s *NotificationPreferencesService) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	return s.NotificationPreferences.Find(ctx, userID)
}

func (s *NotificationPreferencesService) CreatePreferences(ctx context.Context, userID uuid.UUID, req models.CreateNotificationPreferencesRequest) (*models.NotificationPreferences, error) {
	prefs := &models.NotificationPreferences{
		UserID:             userID,
		PushEnabled:        true,
		UpcomingTrip:       true,
		VotingReminders:    true,
		FinalizedDecisions: true,
		TripActivity:       true,
		DeadlineReminders:  true,
	}

	if req.PushEnabled != nil {
		prefs.PushEnabled = *req.PushEnabled
	}
	if req.UpcomingTrip != nil {
		prefs.UpcomingTrip = *req.UpcomingTrip
	}
	if req.VotingReminders != nil {
		prefs.VotingReminders = *req.VotingReminders
	}
	if req.FinalizedDecisions != nil {
		prefs.FinalizedDecisions = *req.FinalizedDecisions
	}
	if req.TripActivity != nil {
		prefs.TripActivity = *req.TripActivity
	}
	if req.DeadlineReminders != nil {
		prefs.DeadlineReminders = *req.DeadlineReminders
	}

	return s.NotificationPreferences.Create(ctx, prefs)
}

func (s *NotificationPreferencesService) UpdatePreferences(ctx context.Context, userID uuid.UUID, req models.UpdateNotificationPreferencesRequest) (*models.NotificationPreferences, error) {
	return s.NotificationPreferences.Update(ctx, userID, &req)
}

func (s *NotificationPreferencesService) DeletePreferences(ctx context.Context, userID uuid.UUID) error {
	return s.NotificationPreferences.Delete(ctx, userID)
}

func (s *NotificationPreferencesService) GetOrCreateDefaultPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	existingPrefs, err := s.NotificationPreferences.Find(ctx, userID)
	if err == nil {
		return existingPrefs, nil
	}
	if !errs.IsNotFound(err) {
		return nil, err
	}

	prefs := &models.NotificationPreferences{
		UserID:             userID,
		PushEnabled:        true,
		UpcomingTrip:       true,
		VotingReminders:    true,
		FinalizedDecisions: true,
		TripActivity:       true,
		DeadlineReminders:  true,
	}

	return s.NotificationPreferences.Create(ctx, prefs)
}
