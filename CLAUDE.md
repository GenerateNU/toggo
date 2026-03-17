# Engineering Principles

## 1. Code Quality

All code must be:

* readable
* modular
* maintainable
* production-ready

Rules:

* Do not generate unnecessary abstractions.
* Avoid overly clever or complex code.
* Prefer clarity over brevity.

---

## 2. Function Design

Functions must:

* do **one thing**
* be **small and focused**
* avoid mixed responsibilities

Guidelines:

* Prefer functions under ~40 lines.
* Extract helper functions when logic grows.
* Avoid deeply nested conditionals.

---

## 3. Hard-coded Values

Never introduce hard-coded values when avoidable.

Use instead:

* constants
* configuration
* design tokens
* environment variables

Example:

Bad

```
limit := 50
```

Good

```
limit := config.DefaultPageLimit
```

---

## 4. Naming

Use **explicit, descriptive names**.

Good examples:

```
CreateUser
FindUserByID
CalculateInvoiceTotal
```

Avoid vague names:

```
Handle
Process
DoThing
Stuff
```

---

## 5. Dead Code

Claude must:

* remove unused imports
* remove unused variables
* avoid commented-out code blocks

Generated code should always be **clean and minimal**.

---

# Backend (Go)

## Architecture

The backend follows a **layered architecture**.

```
config/
database/
repository/
services/
controllers/
validators/
middleware/
internal/errs/
```

Layer responsibilities:

| Layer       | Responsibility         |
| ----------- | ---------------------- |
| repository  | database access        |
| services    | business logic         |
| controllers | HTTP request/response  |
| validators  | request validation     |
| middleware  | cross-cutting concerns |

Rules:

* Controllers must not contain business logic.
* Services must not contain HTTP logic.
* Repositories must not contain business logic.

---

## Dependency Injection

Dependencies must always be **explicitly passed**.

Allowed dependencies:

* config
* database connections
* repositories
* services
* loggers
* publishers

Avoid:

* global variables
* hidden dependencies
* implicit state

Preferred constructor pattern:

```go
func NewUserService(repo UserRepository, logger Logger) *UserService
```

---

## Interfaces

Define interfaces for:

* repositories
* services
* external systems

Benefits:

* easier testing
* mockable dependencies
* loose coupling

---

## Error Handling

Errors must be **centralized and structured**.

Location:

```
internal/errs
```

Rules:

* Never expose raw database errors to clients.
* Convert infrastructure errors to domain errors.
* Return proper HTTP status codes.

Flow:

```
repository → service → controller
```


---

## Database Practices

### Query Efficiency

Always:

* join using indexed columns
* select only required fields
* use indexed filters

Avoid:

* `SELECT *`
* full table scans
* N+1 queries

---

### Pagination

All list endpoints must support pagination. Encourage to follow existing patterns of cursor pagination in the codebase.

Never return unbounded lists.

---

## Routing

Routes must be:

* versioned
* grouped by feature

Example:

```
/api/v1/users
/api/v1/auth
/api/v1/posts
```

Use middleware for:

* logging
* authentication
* CORS
* rate limiting
* tracing

---

# Frontend (React / Expo)

## Design System

The UI must use centralized **design system**.

Avoid:

* hard-coded color values
* magic spacing numbers
* duplicated style definitions

---

## Component Design

Components must be:

* reusable
* typed
* composable
* modular

Prefer primitive components:

```
Box
Text
Stack
```

Build complex components from primitives:

```
Button
Avatar
Card
```

---

## UI Error Handling

Do not expose raw API errors.

Use UI states:

* `LoadingState`
* `ErrorState`
* `EmptyState`

Errors shown to users must be **clear and user friendly**.

---

# Code Generation Rules for Claude

When generating code, Claude must:

1. Follow the architecture defined in this document.
2. Avoid introducing hard-coded values.
3. Keep functions small and focused.
4. Separate concerns across layers.
5. Prefer readability and maintainability.
6. Ensure code compiles and passes linting.
7. Avoid speculative abstractions unless clearly needed.

---

# Refactoring Rules

When refactoring existing code:

Claude should:

* reduce function complexity
* improve naming clarity
* remove duplication
* enforce architecture boundaries
* preserve behavior unless explicitly instructed otherwise


