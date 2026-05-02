# Client Handoff

A collaborative travel planning mobile app. Users create and manage trips together in real time. See detailed architecture of the app [here](https://deepwiki.com/GenerateNU/toggo).

---

## Table of Contents

- [Handoff Notes](#handoff-notes)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Database & Migrations](#database--migrations)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Infrastructure](#infrastructure)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Common Commands](#common-commands)
- [Additional Documentation](#additional-documentation)

---

## Handoff Notes

Everything below is something that will break or require action before the project is fully in your hands.

### Accounts & Access to Transfer

Every service below has active production resources. You either need to be added as an owner or have credentials rotated and shared.

| Service        | What it's used for                                     | Action needed                                       |
| -------------- | ------------------------------------------------------ | --------------------------------------------------- |
| **Supabase**   | Production PostgreSQL database + JWT auth              | Add as owner or transfer project                    |
| **DigitalOcean** | Backend app hosting                                  | Add as team member or transfer droplet/app          |
| **AWS**        | S3 bucket for file/asset storage                       | Share IAM credentials or create new IAM user        |
| **Pulumi**     | Infrastructure-as-code state (remote backend)          | Transfer Pulumi organization ownership              |
| **EAS / Expo** | iOS build and TestFlight distribution                  | Transfer EAS project or add as owner                |
| **Apple Developer** | App signing, TestFlight, App Store               | Replace with your own Apple Developer account; update Team ID and ASC App ID in `frontend/eas.json` |
| **Google Cloud** | Maps API key (`GOOGLE_MAPS_API_KEY`)                 | Transfer or regenerate the API key                  |
| **Temporal Cloud** | Workflow orchestration in production             | Transfer account or regenerate `TEMPORAL_API_KEY`   |
| **Datadog**    | Infrastructure monitoring (managed via Pulumi)         | Transfer or re-provision integration                |

### GitHub Actions Secrets

The CI pipelines require secrets configured in the GitHub repository settings. They will silently fail or error without these.

| Secret          | Used by                | Purpose                                     |
| --------------- | ---------------------- | ------------------------------------------- |
| `DOPPLER_TOKEN` | `backend.yml`          | Injects env vars for backend tests in CI    |

The iOS deploy workflow (`ios_deploy.yml`) delegates to a shared workflow at `GenerateNU/shiperate`. Any secrets it needs (e.g. EAS token, Apple credentials) are passed via `secrets: inherit` — check that repo for what's required, or replace the workflow with a direct EAS build step.

> If you switch away from Doppler, replace the `DOPPLER_TOKEN` usage in `backend.yml` with your own env injection (e.g. set individual secrets in GitHub and pass them as `env:` in the test step).

### Production Docker Image

`backend/prod.Dockerfile` installs the Doppler CLI and uses it to start the server:

```dockerfile
CMD ["doppler", "run", "--project", "backend", "--config", "prod", "--", "./toggo"]
```

If you switch to `.env`-based secrets, update the Dockerfile: remove the Doppler install block (lines 18–21) and change the `CMD` to just `["./toggo"]`, then inject env vars via your deployment platform.

### LocalStack Auth Token

`backend/scripts/start-localstack.sh` requires a **LocalStack Pro auth token** stored at `~/.localstack/auth.json`. The script will exit with an error if this file is missing. Get a token from [localstack.cloud](https://localstack.cloud/) and run:

```bash
localstack auth set-token <your-token>
```

### Temporal: Local vs. Production

In local development, `just dev-be` starts a free Temporal dev server automatically — no account needed.

In production, Temporal Cloud is used and requires `TEMPORAL_API_KEY`. Make sure you have the correct key from the account transfer before deploying.

---

## Tech Stack

| Layer            | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| Mobile           | React Native 0.81, Expo 54, TypeScript                   |
| Styling          | Nativewind (Tailwind CSS), Shopify Restyle design system |
| State            | Zustand (client), TanStack Query (server)                |
| Auth             | Supabase (JWT)                                           |
| Backend          | Go 1.24, Fiber v2                                        |
| Database         | PostgreSQL 16 (Supabase in prod)                         |
| Cache / Realtime | Redis 8, WebSocket                                       |
| Migrations       | Goose v3                                                 |
| Workflows        | Temporal                                                 |
| Storage          | AWS S3                                                   |
| Secrets          | Doppler                                                  |
| Infrastructure   | Pulumi (TypeScript), AWS, DigitalOcean                   |

---

## Architecture Overview

```
toggo/
├── backend/        # Go API server (Fiber)
├── frontend/       # React Native + Expo mobile app
├── infra/          # Pulumi infrastructure-as-code (AWS)
├── docs/           # Architecture, backend, frontend, realtime docs
└── .github/        # GitHub Actions CI/CD workflows
```

The backend follows a strict layered architecture:

```
repository → service → controller
```

- **Controllers** handle HTTP request/response only
- **Services** contain all business logic
- **Repositories** handle all database access

Real-time events (trip updates, comments, activities) flow over a single WebSocket connection per user, backed by Redis pub/sub with 200ms event batching. See `docs/REALTIME.md` for details.

---

## Prerequisites

### General

| Tool    | Install                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------- |
| Docker  | [docker.com](https://www.docker.com/products/docker-desktop/) — macOS: use [OrbStack](https://orbstack.dev/) instead |
| Doppler | [docs.doppler.com/docs/install-cli](https://docs.doppler.com/docs/install-cli) — only needed if keeping Doppler for secrets; see [Environment Setup](#environment-setup) for alternatives |
| Just    | [github.com/casey/just](https://github.com/casey/just)                                         |

### Backend

| Tool          | Install                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| Go 1.24+      | [go.dev/dl](https://go.dev/dl/)                                                          |
| Goose         | `go install github.com/pressly/goose/v3/cmd/goose@latest`                                |
| golangci-lint | [golangci-lint.run](https://golangci-lint.run/welcome/install/)                          |
| goimports     | `go install golang.org/x/tools/cmd/goimports@latest`                                     |
| Swag CLI      | `go install github.com/swaggo/swag/cmd/swag@latest`                                      |
| mockery v3    | `go install github.com/vektra/mockery/v3@v3.6.4`                                         |
| LocalStack    | [docs.localstack.cloud](https://docs.localstack.cloud/aws/getting-started/installation/) |
| Temporal CLI  | [docs.temporal.io/cli](https://docs.temporal.io/cli/setup-cli)                           |
| psql          | [postgresql.org](https://www.postgresql.org/download/)                                   |

### Frontend

| Tool    | Install                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Bun     | [bun.sh](https://bun.sh/)                                                                                                                    |
| Xcode   | [App Store](https://apps.apple.com/us/app/xcode/id497799835) (macOS only, for iOS simulator)                                                 |
| Expo Go | [iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) (physical device) |

---

## Environment Setup

The codebase currently uses **Doppler** for secrets management, but you are free to replace it with standard `.env` files — Doppler is not a hard requirement for the app to work.

**If you choose to use `.env` files instead of Doppler:**

1. Create a `backend/.env` file with the required variables listed below.
2. Create a `frontend/.env` file (Expo reads `EXPO_PUBLIC_*` variables automatically).
3. Remove the `doppler run --project ... --config dev --` prefix from:
   - `frontend/package.json` scripts (`dev`, `tunnel`, `android`, `ios`, `ios:device`)
   - `backend/scripts/seed.sh`
   - `backend/scripts/start-localstack.sh`
   - `backend/scripts/test_search.sh`
   - `backend/scripts/test_poll_voting.sh`
   - `backend/scripts/test_activity_feed.sh`
4. In each script that calls `doppler run`, replace it with sourcing your `.env` file before the command, e.g.:
   ```bash
   set -a; source .env; set +a
   ```
5. Remove the `doppler` preflight check from any script that has one.
6. For production, inject environment variables through your deployment platform (DigitalOcean App Platform, Docker `--env-file`, etc.) rather than Doppler.

**Required environment variables:**

| Category | Variables                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------- |
| Database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`                                   |
| Redis    | `REDIS_ADDRESS`, `REDIS_PASSWORD`                                                               |
| AWS S3   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_ENDPOINT`, `S3_BUCKET_NAME`    |
| Auth     | `JWT_SECRET`, `SUPABASE_JWT_SECRET`                                                             |
| External | `GOOGLE_MAPS_API_KEY`, `TEMPORAL_API_KEY` (prod only)                                          |
| App      | `APP_PORT` (default 8000), `APP_ENVIRONMENT` (`dev`/`prod`)                                    |

---

## Local Development

### 1. Install all dependencies

```bash
just setup
```

### 2. Start the backend

Ensure Docker is running, then:

```bash
just dev-be
```

This starts:
- PostgreSQL 16 on port 5432
- Redis 8 on port 6379
- Temporal dev server
- Go API server on port 8000 with hot reload (Air)

Verify:
- Healthcheck: http://localhost:8000/healthcheck
- Swagger docs: http://localhost:8000/docs

### 3. Start the frontend

```bash
just dev-fe          # Expo dev server
just ios-fe          # iOS simulator (macOS only)
just android-fe      # Android emulator
just dev-fe-tunnel   # Tunnel mode for physical device
```

### 4. Start everything at once

```bash
just dev
```

---

## Database & Migrations

### Connect

```bash
just up-db           # Start only the DB container
just connect-db      # Open psql (local)
just connect-prod-db # Open psql (production)
just down-db         # Stop the DB container
```

**Port conflict on 5432?**

```bash
lsof -i :5432
brew services stop postgresql@15   # stop Homebrew Postgres if running
```

### Migrations

Migration files live in `backend/internal/migrations/` using Goose SQL format:

```sql
-- +goose Up
CREATE TABLE users (...);

-- +goose Down
DROP TABLE users;
```

| Action                    | Command                                       |
| ------------------------- | --------------------------------------------- |
| Create new migration      | `just create-migrate name=<descriptive_name>` |
| Apply pending (local)     | `just migrate-up`                             |
| Rollback last (local)     | `just migrate-down`                           |
| Apply pending (production)| `just migrate-up-prod`                        |
| Rollback last (production)| `just migrate-down-prod`                      |

> Always run and verify migrations locally before applying to production.

### Seed

```bash
just seed
```

---

## API Documentation

The backend uses Swaggo to generate an OpenAPI spec from controller annotations. The frontend uses Kubb to generate TypeScript types, Zod schemas, and TanStack Query hooks from that spec.

Regenerate both in one step:

```bash
just gen-doc
```

This runs:
1. `just api-doc` → regenerates `backend/docs/swagger.json`
2. `just kubb` → regenerates `frontend/api/`, `frontend/types/`, `frontend/schemas/`

Live docs (while backend is running): http://localhost:8000/docs

---

## Testing

### Backend

```bash
just test-be
```

Tests run against a real PostgreSQL instance, not mocks. Interface mocks are generated with mockery:

```bash
cd backend
mockery
```

Mock config is in `backend/.mockery.yml`. Never edit generated mock files by hand — add interfaces there and re-run `mockery`.

### Frontend

```bash
cd frontend
bun test
bun test:coverage
```

---

## Infrastructure

Infrastructure is managed with **Pulumi** (TypeScript) in `infra/`.

**Resources managed:**
- AWS S3 buckets (asset storage)
- IAM roles and policies with key rotation
- Datadog monitoring integration

**Cloud providers:**
- AWS — S3 storage
- DigitalOcean — application hosting
- Supabase — managed PostgreSQL

### Working with Pulumi

```bash
cd infra
npm install

pulumi preview   # preview changes
pulumi up        # deploy changes
```

Pulumi state is stored remotely. You'll need access to the Pulumi organization to deploy.

### LocalStack (local AWS emulation)

To test S3 integrations locally without real AWS credentials:

```bash
just localstack-up
just localstack-down
```

---

## Deployment

### Backend

The backend runs in Docker on DigitalOcean.

**Production Docker build:**

```bash
cd backend
docker build -f prod.Dockerfile -t toggo-api .
```

The production Dockerfile is a multi-stage build — the final image contains only the compiled Go binary with no source code.

The container starts with:

```bash
./toggo
```

Environment variables must be injected by the deployment platform (DigitalOcean App Platform environment variables, `docker run --env-file`, etc.). If you are still using Doppler, prefix with `doppler run --project backend --config prod --`.

**Deploy database migrations to production:**

```bash
just migrate-up-prod
```

> Run production migrations during a low-traffic window. Always verify locally first.

### Frontend (iOS)

iOS builds are distributed via TestFlight using EAS (Expo Application Services).

Build config: `frontend/eas.json`
- Bundle ID: `com.generateneutoggo.frontend` — **belongs to Generate, must be changed**
- Apple Team ID: `N2FJ4NX75D` — **Generate's team, must be replaced**
- ASC App ID: `6760858044` — **Generate's App Store Connect app, must be replaced**

**Apple Developer Account:** The current Apple ID associated with this project belongs to **Generate** and must be replaced with your own. You will need to:

1. Enroll in (or use an existing) [Apple Developer Program](https://developer.apple.com/programs/) account.
2. Choose a new bundle ID (e.g. `com.yourcompany.toggo`) and register it in [App Store Connect](https://appstoreconnect.apple.com/).
3. Create a new app in App Store Connect to get your ASC App ID.
4. Update `frontend/eas.json` with your new bundle ID, Apple Team ID, and ASC App ID.
5. Authenticate EAS with your new account:

```bash
eas login
```

A TestFlight build triggers automatically via GitHub Actions when a PR with a `release/*` branch prefix is merged into `main`.

To trigger a manual build:

```bash
cd frontend
eas build --platform ios --profile production
```

To submit a build directly to the App Store:

```bash
cd frontend
eas submit --platform ios
```

---

## CI/CD

All pipelines are in `.github/workflows/`.

| Workflow            | Trigger                               | Jobs                                     |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| `backend.yml`       | PR touching `backend/**`              | Format, lint (golangci-lint), unit tests |
| `frontend.yml`      | PR touching `frontend/**`             | Format (Prettier), lint (ESLint), Jest   |
| `ios_deploy.yml`    | PR merged to `main` from `release/*`  | EAS iOS build → TestFlight               |
| `auto_assign_*.yml` | PR opened                             | Auto-assign author and reviewers         |

Draft PRs and Dependabot PRs skip CI automatically.

---

## Common Commands

```bash
just                       # List all available commands

just dev                   # Start backend + frontend
just dev-be                # Backend only
just dev-fe                # Frontend only
just ios-fe                # iOS simulator

just test-be               # Run backend tests
just fmt-lint              # Format + lint everything

just gen-doc               # Regenerate API docs + frontend client

just up-db                 # Start database container
just connect-db            # Open psql (local)
just migrate-up            # Apply pending migrations (local)
just migrate-up-prod       # Apply pending migrations (production)

just localstack-up         # Start local AWS environment
just localstack-down       # Stop local AWS environment
```

---

## Additional Documentation

| File                   | Contents                                             |
| ---------------------- | ---------------------------------------------------- |
| `docs/ARCHITECTURE.md` | High-level system architecture and tech stack        |
| `docs/BACKEND.md`      | Backend conventions, error handling, database usage  |
| `docs/FRONTEND.md`     | Component design, UX patterns, TanStack Query usage  |
| `docs/REALTIME.md`     | WebSocket architecture, Redis pub/sub, event topics  |
| `CONTRIBUTING.md`      | Git workflow, PR guidelines, full tooling setup      |
| `CLAUDE.md`            | Engineering principles for AI-assisted development   |
