# Toggo Project Commands

default:
    @just --list

# === Docker & Services ===

# Start both backend and frontend development servers
dev:
    @echo "Starting development environment..."
    cd backend && make dev &
    cd frontend && bun dev

# Start only the database container
up-db:
    cd backend && make db-up

# Stop the database container
down-db:
    cd backend && make db-down

# === Database ===

# Connect to local database
connect-db:
    cd backend && make db-connect

# Connect to production database
connect-prod-db:
    cd backend && make db-connect APP_ENVIRONMENT=prod

# Create a new migration (use: just create-migrate name=add_users_table)
create-migrate name:
    cd backend && make migrate-create name={{name}}

# Run migrations up (local)
migrate-up:
    cd backend && make migrate-up

# Run migrations up (production)
migrate-up-prod:
    cd backend && make migrate-up APP_ENVIRONMENT=prod

# Run migrations down (local)
migrate-down:
    cd backend && make migrate-down

# Run migrations down (production)
migrate-down-prod:
    cd backend && make migrate-down APP_ENVIRONMENT=prod

# === Backend ===

# Install backend dependencies
install-be:
    cd backend && go mod download

# Start backend server
dev-be:
    cd backend && make dev

# Run backend tests
test-be:
    cd backend && make test

# Generate API documentation
api-doc:
    cd backend && make api-doc

# Run Go linter
lint-be:
    cd backend && golangci-lint run

# Format Go code
format-be:
    cd backend && goimports -w .

# === Frontend ===

# Install frontend dependencies
install-fe:
    cd frontend && bun install

# Start frontend development server
dev-fe:
    cd frontend && bun dev

# Start iOS simulator (macOS only)
ios-fe:
    cd frontend && bun ios

# Format frontend code
format-fe:
    cd frontend && bun format

# Lint frontend code
lint-fe:
    cd frontend && bun lint

# === Setup ===

# Complete setup: install all dependencies
setup:
    @echo "Installing backend dependencies..."
    cd backend && go mod download
    @echo "Installing frontend dependencies..."
    cd frontend && bun install
    @echo "Setup complete!"