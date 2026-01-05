# Backend Practices

## API Design & Performance

* **Batch/stream and chunk requests**
  * Split large or complex payloads into batches or streams them
  * Avoid fetching or sending everything at once, which can cause out of memory error
* **Pagination**
  * Prefer **cursor-based or keyset pagination** over offset
  * Offset pagination causes large in-memory scans as data grows
* **Limit payload size**
  * Enforce maximum page sizes
  * Return only necessary fields
* **Avoid N+1 API calls**
  * Fetch related data in a single request when possible

---

## Error Handling

### Error Response Format
* Use consistent error structure and meaningful HTTP status code
* Never expose internal details (stack traces, SQL errors) to clients
* Log full error details server-side for debugging

### Database Errors
* Catch and translate database errors to user-friendly messages:
  * Unique violation → `"Email already exists"`
  * Foreign key violation → `"Referenced resource not found"`
  * Not found → `"Resource not found"`
* Hide implementation details from API responses

---

## Database Guidelines

### Indexing

* Create indexes on columns used in:
  * `WHERE`
  * `JOIN`
  * `ORDER BY`
* Avoid adding too many indexes up front — indexes slow down writes
* Add indexes **only after** identifying slow, well-written queries
* Always join on indexed columns
* **Composite index ordering matters**
  * Put the column that reduces rows the most first
  * ✅ Good: `(school_id, grade_id, student_id)`
  * ❌ Bad: `(student_id, school_id, grade_id)`
* Consider adding index for functions if you think they are used frequently

---

### Query and Performance

* Fetch multiple records in a **single query** when possible
  * Batch queries instead of looping
  * Avoid N+1 queries
* Only select required columns (avoid `SELECT *`)
* Reduce rows **before** joining — joins are expensive
* Avoid functions in `WHERE` clauses (they prevent index usage)
* Prefer `GROUP BY` over `DISTINCT`
* Prefer window functions for analytics and ranking
* Prefer common table expressions (CTEs) to deeply nested subqueries:
  * Improve readability
  * Make complex queries easier to debug
* Always use these to measure your query:
  * `EXPLAIN` to inspect query plans
  * `EXPLAIN ANALYZE` to measure real execution
* Watch for:
  * Full table sequential scans
  * Large row counts early in the plan
* Lower cost is generally better
  * Rough target: `< 100` (depends on data size and workload)

---

## Testing

### Unit Tests
* Test complex processing (compression, encryption, parsing, calculations)
* Mock external dependencies (database, APIs, file system)
* Fast to run — no I/O or network calls

### Integration Tests
* Test API endpoints with database
* Test the full request/response cycle

### Mocking
* Mock external services (payment providers, email services, third-party APIs)
* Mock time-dependent functions for deterministic tests
* Use dependency injection to make mocking easier

### What to Test
* **Happy paths** — expected successful flows
* **Error paths** — invalid inputs, failures, edge cases
* **Edge cases**:
  * Empty inputs
  * Invalid format
  * Duplicate data
  * Boundary values (min/max limits)
  * Concurrent requests
* **Idempotency** — calling same endpoint twice should be safe
* **Lifecycle tests** — create → read → update → delete flows