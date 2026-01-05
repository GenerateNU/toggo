# Toggo

## Package Managers

Install the package manager for your operating system:

| OS | Package Manager |
|----|-----------------|
| macOS | [Homebrew](https://brew.sh/) |
| Windows | [Chocolatey](https://chocolatey.org/) or [Scoop](https://scoop.sh/) |
| Linux | Use your distro's package manager (`apt`, `dnf`, `pacman`, etc.) |

---

## Prerequisites

### General

| Tool | Description | Installation |
|------|-------------|--------------|
| Git | Version control | [git-scm.com](https://git-scm.com/downloads) |
| Docker | Containerization | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Doppler | Secrets management | [doppler.com/docs/install-cli](https://docs.doppler.com/docs/install-cli) |
| Figma | Design tool | [figma.com](https://www.figma.com/downloads/) |

> [!TIP]
> **macOS users:** Use [OrbStack](https://orbstack.dev/) instead of Docker Desktop — it's lighter and faster.

### Backend

| Tool | Description | Installation |
|------|-------------|--------------|
| Go | Backend language | [go.dev/dl](https://go.dev/dl/) |
| PostgreSQL 15 | Database | [postgresql.org](https://www.postgresql.org/download/) |
| Goose | Database migrations | `go install github.com/pressly/goose/v3/cmd/goose@latest` |
| golangci-lint | Go linter | [golangci-lint.run](https://golangci-lint.run/welcome/install/) |

**Useful Go resources:**
- [Effective Go](https://go.dev/doc/effective_go)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)

### Frontend

| Tool | Description | Installation |
|------|-------------|--------------|
| Bun | JavaScript runtime & package manager | [bun.sh](https://bun.sh/) |
| Xcode | iOS simulator (macOS only) | [App Store](https://apps.apple.com/us/app/xcode/id497799835) |
| Expo Go | Run app on physical device | [iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) |
| TestFlight | iOS beta testing (later) | [App Store](https://apps.apple.com/us/app/testflight/id899247664) |

> [!NOTE]
> If you're not on macOS, you can test the app on your physical phone using the Expo Go app.

---

## Doppler Setup

Doppler manages our environment variables. Set it up once:
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
- **Project:** `toggo`
- **Config:** `dev` (for local development)

---

## Getting Started

### Backend
```bash
cd backend
go mod download
make dev
```

To verify the server is running, visit: [http://localhost:8000/healthcheck](http://localhost:8000/healthcheck)

### Frontend
```bash
cd frontend
bun install
bun dev
```

---

## Database & Migrations

### Connecting to Database
```bash
# Local database
make db-connect

# Production database
make db-connect APP_ENVIRONMENT=prod
```

### Running Migrations

| Action | Local | Production |
|--------|-------|------------|
| Create migration | `make migrate-create name=<name>` | — |
| Migrate up | `make migrate-up` | `make migrate-up APP_ENVIRONMENT=prod` |
| Migrate down | `make migrate-down` | `make migrate-down APP_ENVIRONMENT=prod` |

> [!CAUTION]
> Always run migrations locally and ensure it works correctly first, then open a PR, get it reviewed and merged, then apply to production.

---

## Useful Commands

### Backend

| Command | Description |
|---------|-------------|
| `make dev` | Start backend server |
| `make test` | Run tests |
| `make lint` | Run linter |
| `make tidy` | Clean up unused dependencies in `go.mod` and `go.sum` |
| `make format` | Format code |

### Frontend

| Command | Description |
|---------|-------------|
| `bun dev` | Start frontend dev server |
| `bun lint` | Run linter |
| `bun format` | Format code |

---

## Contributing

**🦪 The codebase is your oyster!**

This is your playground. Build whatever feature excites you. If something annoys you, write some code to fix it, you'll be helping yourself *and* everyone else. Found a bug? Open an issue. Noticed this README is out of date? Update it. See a rough edge in the dev experience? Smooth it out.

Take ownership. Make it better. Ship it.

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. **Please read it!**

Examples:
```bash
feat: add user profile page
fix: resolve login redirect issue
docs: update README setup instructions
chore: upgrade dependencies
```

### Issues

Use the Issues tab to:
- Report bugs you find during development
- Request features that don't exist yet
- Track work that needs more discussion or clarification

> [!IMPORTANT]
> Keep PRs small and focused. Split large features into smaller PRs that are easy to review. This helps:
> - Maintain clear thought process
> - Ship features incrementally
> - Allow reviewers to focus on details