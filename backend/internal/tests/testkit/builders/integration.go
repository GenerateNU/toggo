package testkit

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
	"toggo/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type IntegrationTestBuilder struct {
	t        *testing.T
	response *http.Response
	body     map[string]any
	raw      []byte
}

func New(t *testing.T) *IntegrationTestBuilder {
	t.Helper()
	return &IntegrationTestBuilder{t: t}
}

type HTTPMethod string

const (
	GET    HTTPMethod = "GET"
	POST   HTTPMethod = "POST"
	PUT    HTTPMethod = "PUT"
	PATCH  HTTPMethod = "PATCH"
	DELETE HTTPMethod = "DELETE"
)

type Request struct {
	App     *fiber.App
	Route   string
	Method  HTTPMethod
	Body    any
	Query   map[string]string
	Headers map[string]string
	Auth    *bool // if nil, defaults to true
	UserID  *string
}

func (tb *IntegrationTestBuilder) Request(r Request) *IntegrationTestBuilder {
	tb.t.Helper()

	// Default method to GET
	method := string(r.Method)
	if method == "" {
		method = http.MethodGet
	}

	// Build URL
	url := buildURL(r.Route, r.Query)

	// Encode body if present
	var bodyBuf *bytes.Buffer
	if r.Body != nil {
		b, err := json.Marshal(r.Body)
		require.NoError(tb.t, err)
		bodyBuf = bytes.NewBuffer(b)
	} else {
		bodyBuf = bytes.NewBuffer(nil)
	}

	// Create request
	req := httptest.NewRequest(method, url, bodyBuf)

	// Set headers
	for k, v := range r.Headers {
		req.Header.Set(k, v)
	}
	if r.Body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// Set Authorization (default true)
	auth := true
	if r.Auth != nil {
		auth = *r.Auth
	}
	if auth {
		userID := ""
		if r.UserID != nil {
			userID = *r.UserID
		}
		token := fakes.GenerateValidJWT(userID, time.Hour)
		req.Header.Set("Authorization", "Bearer "+token)
	}

	// Execute request
	resp, err := r.App.Test(req)
	require.NoError(tb.t, err)

	// Parse response
	tb.response = resp
	tb.raw, _ = io.ReadAll(resp.Body)
	_ = json.Unmarshal(tb.raw, &tb.body)

	return tb
}

func buildURL(route string, query map[string]string) string {
	if len(query) == 0 {
		return route
	}
	values := url.Values{}
	for k, v := range query {
		values.Set(k, v)
	}
	return route + "?" + values.Encode()
}

func (tb *IntegrationTestBuilder) ParseBody(resp *http.Response, raw []byte) *IntegrationTestBuilder {
	tb.response = resp
	tb.raw = raw
	_ = json.Unmarshal(raw, &tb.body)
	return tb
}

func (tb *IntegrationTestBuilder) AssertStatus(code int) *IntegrationTestBuilder {
	assert.Equal(tb.t, code, tb.response.StatusCode)
	return tb
}

func (tb *IntegrationTestBuilder) AssertFieldExists(field string) *IntegrationTestBuilder {
	_, ok := tb.body[field]
	assert.True(tb.t, ok, "field %s does not exist", field)
	return tb
}

func (tb *IntegrationTestBuilder) AssertField(field string, expected any) *IntegrationTestBuilder {
	assert.Equal(tb.t, expected, tb.body[field])
	return tb
}

func (tb *IntegrationTestBuilder) AssertFieldNotEqual(field string, expected any) *IntegrationTestBuilder {
	assert.NotEqual(tb.t, expected, tb.body[field])
	return tb
}

func (tb *IntegrationTestBuilder) AssertMessage(message string) *IntegrationTestBuilder {
	if m, ok := tb.body["message"]; ok {
		assert.Equal(tb.t, message, m)
	} else {
		assert.Fail(tb.t, "message field not found")
	}
	return tb
}

func (tb *IntegrationTestBuilder) AssertErrorMessage(expected any) *IntegrationTestBuilder {
	if err, ok := tb.body["error"]; ok {
		assert.Equal(tb.t, expected, err)
	} else if errs, ok := tb.body["errors"]; ok {
		assert.Equal(tb.t, expected, errs)
	} else {
		assert.Fail(tb.t, "error or errors field not found")
	}
	return tb
}

func (tb *IntegrationTestBuilder) AssertArraySize(size int) *IntegrationTestBuilder {
	arr, ok := tb.body["data"].([]any)
	assert.True(tb.t, ok, "data field is not an array")
	assert.Equal(tb.t, size, len(arr))
	return tb
}

func (tb *IntegrationTestBuilder) AssertArrayFieldExists(field string) *IntegrationTestBuilder {
	arr, ok := tb.body["data"].([]any)
	assert.True(tb.t, ok, "data field is not an array")
	for _, item := range arr {
		m, ok := item.(map[string]any)
		assert.True(tb.t, ok, "array item is not a map")
		_, exists := m[field]
		assert.True(tb.t, exists, "field %s does not exist in array item", field)
	}
	return tb
}

func (tb *IntegrationTestBuilder) AssertBody(expected any) *IntegrationTestBuilder {
	assert.Equal(tb.t, expected, tb.body)
	return tb
}

func (tb *IntegrationTestBuilder) DebugLogging() *IntegrationTestBuilder {
	tb.t.Logf("Response: %s", string(tb.raw))
	return tb
}
