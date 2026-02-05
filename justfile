set windows-shell := ["powershell.exe", "-Command"]

suffix := if os() == "windows" { "-win" } else { "" }
sep := if os() == "windows" { ";" } else { "&&" }

alias i := setup
alias bd := dev-be
alias fd := dev-fe
alias fdt := dev-fe-tunnel
alias fx := ios-fe

# Toggo Project Commands
default:
    @just --list

# === Docker & Services ===
# Start both backend and frontend development servers

# Start both backend and frontend development servers
dev:
    @echo "Start Toggo development environment ✈️"
    {{ if os() == "windows" { "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'just dev-be'; just fdt" } else { "just dev-be & just dev-fe" } }}

# Start only the database container
up-db:
    cd backend {{ sep }} make db-up{{ suffix }}

# Stop the database container
down-db:
    cd backend {{ sep }} make db-down

# === Database ===

# Connect to local database
connect-db:
    cd backend {{ sep }} make db-connect{{ suffix }}

# Connect to production database
connect-prod-db:
    cd backend {{ sep }} make db-connect{{ suffix }} APP_ENVIRONMENT=prod

# Create a new migration (use: just create-migrate name=add_users_table)
create-migrate name:
    cd backend {{ sep }} make migrate-create name={{ name }}

# Run migrations up (local)
migrate-up:
    cd backend {{ sep }} make migrate-up{{ suffix }}

# Run migrations up (production)
migrate-up-prod:
    cd backend {{ sep }} make migrate-up{{ suffix }} APP_ENVIRONMENT=prod

# Run migrations down (local)
migrate-down:
    cd backend {{ sep }} make migrate-down{{ suffix }}

# Run migrations down (production)
migrate-down-prod:
    cd backend {{ sep }} make migrate-down{{ suffix }} APP_ENVIRONMENT=prod

# === Backend ===

# Install backend dependencies
install-be:
    cd backend {{ sep }} go mod download

# Start backend server
dev-be:
    cd backend {{ sep }} make dev{{ suffix }}

# Run backend tests
test-be:
    cd backend {{ sep }} make test{{ suffix }}

# Generate API documentation
api-doc:
    cd backend {{ sep }} make api-doc

# Run linters
lint: lint-be lint-fe

# Run Go linter
lint-be:
    cd backend {{ sep }} golangci-lint run

# Format Go code
format-be:
    cd backend {{ sep }} goimports -w .

# === Frontend ===

# Install frontend dependencies
install-fe:
    cd frontend {{ sep }} bun install

# Start frontend development server
dev-fe:
    cd frontend {{ sep }} bun dev

dev-fe-tunnel:
    cd frontend {{ sep }} bun tunnel

# Start iOS simulator (macOS only)
ios-fe:
    cd frontend {{ sep }} bun ios

# Format frontend code
format-fe:
    cd frontend {{ sep }} bun format

# Lint frontend code
lint-fe:
    cd frontend {{ sep }} bun lint

format:
    just format-be
    just format-fe

fmt-lint: 
    just format
    just lint

kubb:
    cd frontend {{ sep }} bun kubb

gen-doc:
    just api-doc
    just kubb
# === Localstack ===

# Create a localstack container
localstack-up:
    cd backend {{ sep }} make localstack-up

# Remove the localstack container
localstack-down:
    cd backend {{ sep }} make localstack-down

# === Setup ===

# Complete setup: install all dependencies
setup:
    @echo "Installing backend dependencies..."
    cd backend {{ sep }} go mod download
    @echo "Installing frontend dependencies..."
    cd frontend {{ sep }} bun install
    @echo "Setup complete!"

## == Lefthook Support ==
lint-be-staged files:
    {{ if os() == "windows" {
        "cd backend; $files = \"" + files + "\" -split ' '; $files = $files | % { $_ -replace '^backend/', '' }; golangci-lint run $files"
      } else {
        "cd backend && golangci-lint run " + files
      }
    }}

format-be-staged files:
    {{ if os() == "windows" {
        "cd backend; $files = \"" + files + "\" -split ' '; $files = $files | % { $_ -replace '^backend/', '' }; gofmt -s -w $files"
      } else {
        "cd backend && gofmt -s -w " + files
      }
    }}

lint-fe-staged files:
    {{ if os() == "windows" {
        "cd frontend; $files = \"" + files + "\" -split ' '; $files = $files | % { $_ -replace '^frontend/', '' }; bun lint $files"
      } else {
        "cd frontend && bun lint " + files
      }
    }}

format-fe-staged files:
    {{ if os() == "windows" {
        "cd frontend; $files = \"" + files + "\" -split ' '; $files = $files | % { $_ -replace '^frontend/', '' }; bun format $files"
      } else {
        "cd frontend && bun format " + files
      }
    }}

