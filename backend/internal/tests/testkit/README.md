# Testing

Testing allows us to confidently push out new features without regression and ensure our code works correctly. Most of the time we will do integration tests for basic APIs, but there will be times when we need other types of testing.

## Test Types

| **Type** | **Purpose** | **Example** |
|----------|-------------|-------------|
| **Unit** | Test isolated functions and complex logic | Image compression, data parsing, calculations |
| **Integration** | Test API endpoints with real database | `POST /users` → service → database → response |
| **Lifecycle** | Test full CRUD flows | Create user → get → update → delete → verify gone |
| **Mock** | Test external service integrations | Mock AWS S3, payment providers, email services |

## Integration Test Helpers

Writing tests from scratch can be tedious, so we have helpers to make it easy. See `user_test.go` for full examples.

> [!NOTE]
> Feel free to add new helper methods as needed, we want testing to be easy for everyone!

### Step-by-Step Breakdown

**Step 1: Create a test app**
```go
app := fakes.GetSharedTestApp()
```
This creates a test server that mirrors our real server, including middlewares, routes, and mocked external services.

**Step 2: Generate a user ID (for authenticated requests)**
```go
userID := fakes.GenerateUUID()
```
This creates a random UUID. When you pass it to `UserID`, the testkit auto-generates a valid JWT token to authorize users to backend endpoints.

**Step 3: Make a request**
```go
testkit.New(t).
    Request(testkit.Request{
        App:    app,
        Route:  "/api/v1/users",
        Method: testkit.POST,
        UserID: &userID,
        Body: map[string]any{
            "email": "test@example.com",
            "name":  "John Doe",
        },
    })
```

### Request Options

| Option | Type | Description |
|--------|------|-------------|
| `App` | `*fiber.App` | Test app instance (required) |
| `Route` | `string` | API endpoint (required) |
| `Method` | `HTTPMethod` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, default to GET if not provided |
| `Body` | `any` | Request body (auto-serialized to JSON) |
| `Query` | `map[string]string` | Query parameters |
| `Headers` | `map[string]string` | Custom headers |
| `UserID` | `*string` | User ID embedded in JWT token |
| `Auth` | `*bool` | `nil` or `true` = authenticated, `false` = no auth header |

### Assertions

We use a **builder pattern**, so after making a request, you can chain multiple assertions:

```go
testkit.New(t).
    Request(testkit.Request{...}).     // Making the request
    AssertStatus(http.StatusOK).       // Check status code
    AssertField("name", "John").       // Check a field value
    AssertFieldExists("id")            // Check field exists
```

**Available assertions:**

| Method | What it does |
|--------|--------------|
| `.AssertStatus(code)` | Check HTTP status code |
| `.AssertField("key", value)` | Check field equals value |
| `.AssertFieldExists("key")` | Check field exists |
| `.AssertFieldNotEqual("key", value)` | Check field does not equal value |
| `.AssertMessage("msg")` | Check `message` field |
| `.AssertErrorMessage("msg")` | Check `error` or `errors` field |
| `.AssertArraySize(n)` | Check array length in `data` field |
| `.AssertArrayFieldExists("key")` | Check all array items have field |
| `.AssertBody(map)` | Check entire response body |
| `.GetBody()` | Get response as `map[string]any` |
| `.DebugLogging()` | Print raw response (for debugging) |

### Common Patterns

**Test with authentication:**
```go
userID := fakes.GenerateUUID()

testkit.New(t).
    Request(testkit.Request{
        App:    app,
        Route:  "/api/v1/users/" + userID,
        Method: testkit.GET,
        UserID: &userID,
    }).
    AssertStatus(http.StatusOK)
```

**Test without authentication:**
```go
auth := false

testkit.New(t).
    Request(testkit.Request{
        App:    app,
        Route:  "/api/v1/users",
        Method: testkit.GET,
        Auth:   &auth,
    }).
    AssertStatus(http.StatusUnauthorized)
```

**Test validation errors:**
```go
testkit.New(t).
    Request(testkit.Request{
        App:    app,
        Route:  "/api/v1/users",
        Method: testkit.POST,
        UserID: &userID,
        Body:   map[string]any{},  // Empty body triggers validation error
    }).
    AssertStatus(http.StatusUnprocessableEntity)
```

**Get response data for use in next test:**
```go
resp := testkit.New(t).
    Request(testkit.Request{...}).
    AssertStatus(http.StatusCreated).
    GetBody()

createdID := resp["id"].(string)  // Use this ID in the next request
```

**Debug a failing test:**
```go
testkit.New(t).
    Request(testkit.Request{...}).
    DebugLogging().  // Prints: Response: {"id": "...", "name": "..."}
    AssertStatus(http.StatusOK)
```

### Running Tests
```
cd backend
make test
```

### Lifecycle Test Example

A lifecycle test verifies the full CRUD flow works correctly:

```go
func TestUserLifecycle(t *testing.T) {
    app := fakes.GetSharedTestApp()
    userID := fakes.GenerateUUID()
    var createdID string

    // Step 1: Create
    t.Run("create", func(t *testing.T) {
        resp := testkit.New(t).
            Request(testkit.Request{
                App:    app,
                Route:  "/api/v1/users",
                Method: testkit.POST,
                UserID: &userID,
                Body: map[string]any{
                    "email": "test@example.com",
                    "name":  "John",
                },
            }).
            AssertStatus(http.StatusCreated).
            GetBody()

        createdID = resp["id"].(string)
    })

    // Step 2: Read
    t.Run("get", func(t *testing.T) {
        testkit.New(t).
            Request(testkit.Request{
                App:    app,
                Route:  "/api/v1/users/" + createdID,
                Method: testkit.GET,
                UserID: &userID,
            }).
            AssertStatus(http.StatusOK).
            AssertField("name", "John")
    })

    // Step 3: Update
    t.Run("update", func(t *testing.T) {
        testkit.New(t).
            Request(testkit.Request{
                App:    app,
                Route:  "/api/v1/users/" + createdID,
                Method: testkit.PATCH,
                UserID: &userID,
                Body:   map[string]any{"name": "Jane"},
            }).
            AssertStatus(http.StatusOK).
            AssertField("name", "Jane")
    })

    // Step 4: Delete
    t.Run("delete", func(t *testing.T) {
        testkit.New(t).
            Request(testkit.Request{
                App:    app,
                Route:  "/api/v1/users/" + createdID,
                Method: testkit.DELETE,
                UserID: &userID,
            }).
            AssertStatus(http.StatusNoContent)
    })

    // Step 5: Verify deleted
    t.Run("get after delete returns 404", func(t *testing.T) {
        testkit.New(t).
            Request(testkit.Request{
                App:    app,
                Route:  "/api/v1/users/" + createdID,
                Method: testkit.GET,
                UserID: &userID,
            }).
            AssertStatus(http.StatusNotFound)
    })
}
```

## Guidelines

* Test happy paths **and** error paths
* Test edge cases: empty inputs, invalid IDs, duplicates
* Use `t.Parallel()` for independent tests (runs faster)
* Name tests clearly: `"returns 404 when user not found"`
* Keep lifecycle tests sequential (no `t.Parallel()`) to prevent race conditions
* Use `.DebugLogging()` when a test fails and you need to see the response