package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// ExpoClient handles communication with Expo API
type ExpoClient interface {
	SendNotification(ctx context.Context, deviceToken string, title string, body string) error
}

// expoClient implements ExpoClient
type expoClient struct {
	accessToken string
	httpClient  *http.Client
}

const expoAPIURL = "https://exp.host/--/api/v2/push/send"

func NewExpoClient(accessToken string) ExpoClient {
	return &expoClient{
		accessToken: accessToken,
		httpClient:  &http.Client{},
	}
}

// ExpoNotificationRequest matches Expo API format
type ExpoNotificationRequest struct {
	To    string `json:"to"`
	Title string `json:"title"`
	Body  string `json:"body"`
}

// ExpoNotificationResponse matches Expo API response
type ExpoNotificationResponse struct {
	Data   interface{} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

func (c *expoClient) SendNotification(ctx context.Context, deviceToken string, title string, body string) error {
	req := ExpoNotificationRequest{
		To:    deviceToken,
		Title: title,
		Body:  body,
	}

	payload, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", expoAPIURL, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.accessToken))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send notification: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	// Check for API errors
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo api error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse response to check for errors in JSON
	var expoResp ExpoNotificationResponse
	if err := json.Unmarshal(respBody, &expoResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if len(expoResp.Errors) > 0 {
		return fmt.Errorf("expo error: %s", expoResp.Errors[0].Message)
	}

	return nil
}
