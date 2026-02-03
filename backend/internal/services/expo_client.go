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
	SendNotifications(ctx context.Context, tokens []string, title string, body string, data map[string]interface{}) (*ExpoBulkResponse, error)
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
	To    string                 `json:"to"`
	Title string                 `json:"title"`
	Body  string                 `json:"body"`
	Data  map[string]interface{} `json:"data,omitempty"`
}

type ExpoNotificationResponse struct {
	Status  string                 `json:"status"`
	ID      string                 `json:"id,omitempty"`
	Message string                 `json:"message,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}

type ExpoBulkResponse struct {
	Data []ExpoNotificationResponse `json:"data"`
}

// sends notifications to multiple devices (max 100 per call per Expo limits)
func (c *expoClient) SendNotifications(ctx context.Context, tokens []string, title string, body string, data map[string]interface{}) (*ExpoBulkResponse, error) {
	if len(tokens) == 0 {
		return &ExpoBulkResponse{Data: []ExpoNotificationResponse{}}, nil
	}

	if len(tokens) > 100 {
		return nil, fmt.Errorf("cannot send to more than 100 tokens at once (got %d)", len(tokens))
	}

	var requests []ExpoNotificationRequest
	for _, token := range tokens {
		requests = append(requests, ExpoNotificationRequest{
			To:    token,
			Title: title,
			Body:  body,
			Data:  data,
		})
	}

	payload, err := json.Marshal(requests)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal notifications: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", expoAPIURL, bytes.NewBuffer(payload))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if c.accessToken != "" {
		httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.accessToken))
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send notifications: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("expo api error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	var expoResp ExpoBulkResponse
	if err := json.Unmarshal(respBody, &expoResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &expoResp, nil
}
