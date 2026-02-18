# Toggo

## Contributing

Found a bug? Open an issue. Noticed documentation is out out of date? Update it. See a rough edge in the dev experience? Smooth it out.

**Take ownership. Make it better. Ship it.**

---

### Version Control (Git)

We use [Conventional Commits](https://www.conventionalcommits.org/) for PRs.

Examples:

```bash
feat: add user profile page
fix: resolve login redirect issue
docs: update README setup instructions
chore: upgrade dependencies
```

> [!IMPORTANT]
> Keep PRs small and focused. Split large features into smaller PRs that are easy to review. This helps:
>
> - Maintain clear thought process
> - Ship features incrementally
> - Allow reviewers to focus on details

---

## Prerequisites

### General

| Tool    | Description              | Installation                                                              |
| ------- | ------------------------ | ------------------------------------------------------------------------- |
| Docker  | Containerization         | [docker.com](https://www.docker.com/products/docker-desktop/)             |
| Doppler | Secrets management       | [doppler.com/docs/install-cli](https://docs.doppler.com/docs/install-cli) |
| Figma   | Design tool              | [figma.com](https://www.figma.com/downloads/)                             |
| Just    | CLI tool build with Rust | [Just](https://github.com/casey/just)                                     |

> [!TIP]
> **macOS users:** Use [OrbStack](https://orbstack.dev/) instead of Docker Desktop — it's lighter and faster.

### Backend

| Tool          | Description                                | Installation                                                                                 |
| ------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Go            | Backend language                           | [go.dev/dl](https://go.dev/dl/)                                                              |
| PostgreSQL 15 | Database                                   | [postgresql.org](https://www.postgresql.org/download/)                                       |
| psql          | CLI to interact with a PostgreSQL database | [install psql](https://dev.to/tigerdata/how-to-install-psql-on-mac-ubuntu-debian-windows-am) |
| Goose         | Database migrations                        | `go install github.com/pressly/goose/v3/cmd/goose@latest`                                    |
| golangci-lint | Go linter                                  | [golangci-lint.run](https://golangci-lint.run/welcome/install/)                              |
| goimports     | Formats code + manages imports             | `go install golang.org/x/tools/cmd/goimports@latest`                                         |
| Swag CLI      | Generate API doc                           | `go install github.com/swaggo/swag/cmd/swag@latest`                                          |
| LocalStack    | Run AWS services locally                   | [install cli](https://docs.localstack.cloud/aws/getting-started/installation/)               |
| Temporal      | Run workflow orchestration                 | [install cli](https://docs.temporal.io/cli/setup-cli)                                        |

**Useful Go resources:**

- [Effective Go](https://go.dev/doc/effective_go)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)

### Frontend

| Tool       | Description                          | Installation                                                                                                                       |
| ---------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Bun        | JavaScript runtime & package manager | [bun.sh](https://bun.sh/)                                                                                                          |
| Xcode      | iOS simulator (macOS only)           | [App Store](https://apps.apple.com/us/app/xcode/id497799835)                                                                       |
| Expo Go    | Run app on physical device           | [iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) |
| TestFlight | iOS beta testing (later)             | [App Store](https://apps.apple.com/us/app/testflight/id899247664)                                                                  |

> [!NOTE]
> If you're not on macOS, you can test the app on your physical phone using the Expo Go app.

---

## Doppler Setup

Doppler manages our environment variables. The token will expire once in a while for security reason, so you will need to do this process again.

```bash
# 1. Install Doppler CLI
brew install dopplerhq/cli/doppler  # macOS
# See https://docs.doppler.com/docs/install-cli for other OS

# 2. Login to Doppler
doppler login

# 3. Select the workspace (follow the prompts)
doppler setup
```

When prompted, select:

- **Project:** `backend`
- **Config:** `dev` (for local development)

---

## Running Commands

We use a justfile to run both frontend and backend commands from any directory at high speed. You can view all available commands with:

```bash
just
```

---

## Database & Migrations

### Connecting to Database

Ensure your database is up in the Docker Container by:

```bash
just dev-be # will start both server and database OR
just up-db # just start the database in container
```

Then you can go into PSQL and execute any SQL query

```bash
# Local database
just connect-db

# Production database
just connect-prod-db
```

```bash
# will turn off local database
just down-db
```

> [!NOTE]
> **Can't connect to the database?** Usually a port conflict or conflicting Postgres installations.
>
> **1. Check what's using port 5432:**
>
> ```bash
> lsof -i :5432
> ```
>
> **2. Check for running Postgres instances:**
>
> ```bash
> ps aux | grep postgres
> ```
>
> **3. Common fixes:**
>
> - Stop Homebrew Postgres: `brew services stop postgresql` or `brew services stop postgresql@15`
> - Stop system Postgres (Linux): `sudo systemctl stop postgresql`
> - Kill a specific process: `kill <PID>` (use the PID from above)
> - Remove old socket files: `rm /tmp/.s.PGSQL.5432` (if you see "socket file" errors)

### Running Migrations

| Action           | Local                                         | Production               |
| ---------------- | --------------------------------------------- | ------------------------ |
| Create migration | `just migrate-create name=<informative-name>` | —                        |
| Migrate up       | `just migrate-up`                             | `just migrate-up-prod`   |
| Migrate down     | `just migrate-down`                           | `just migrate-down-prod` |

> [!CAUTION]
> Always run migrations locally and ensure it works correctly first, then open a PR, get it reviewed and merged, then apply to production.

---

## Starting Server

### Backend

Ensure you have your Docker app running first.

```bash
cd backend
go mod download
just dev-be
```

To verify the server is running, visit Healthcheck at [http://localhost:8000/healthcheck](http://localhost:8000/healthcheck) or API doc at [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
bun install
just dev-fe
# you can do also `just ios-fe` to start iOS simulator on MacOS
```

---

## API Documentation

To generate API calls on frontend side and keep our API documentation up-to-date, we will need to add comments above the controllers

```ts
// @Summary Healthcheck endpoint
// @Description Returns OK if the server is running
// @Tags example
// @Produce json
// @Success 200 {string} string "ok"
// @Router /healthcheck [get]
func HealthcheckHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
	})
}
```

Then, we can generate the `swagger.yaml` file with:

```bash
just api-doc
```

You can now start the server and your documentation changes should reflect on the route [http://localhost:8000/docs](http://localhost:8000/docs)

---

## LocalStack Environment

```bash
# create a local AWS environment
just localstack-up

# remove local AWS environment
just localstack-down
```

---

## Testing

```bash
just test-be
```
