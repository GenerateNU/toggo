BINARY_NAME := toggo
MAIN_FILE := cmd/main.go
VERSION ?= dev
APP_ENVIRONMENT ?= dev
MIGRATIONS_DIR := internal/migrations

build:
	go build -ldflags "-X main.Version=$(VERSION)" -o $(BINARY_NAME) $(MAIN_FILE)

clean:
	rm -f $(BINARY_NAME)

dev:
	doppler run -- wgo run $(MAIN_FILE)

lint:
	golangci-lint run ./...

api-doc:
	cd tooling/fluid-oas && bun run generate

migrate-create:
	@mkdir -p $(MIGRATIONS_DIR)
	goose -dir $(MIGRATIONS_DIR) create $(name) sql

migrate-up:
	@echo "Applying all pending migrations to $(APP_ENVIRONMENT)..."
	doppler run --config $(APP_ENVIRONMENT) -- sh -c 'goose -dir $(MIGRATIONS_DIR) postgres "postgres://$$DB_USER:$$DB_PASSWORD@$$DB_HOST:$$DB_PORT/$$DB_DATABASE?sslmode=disable" up'

migrate-down:
	@echo "Rolling back last migration in $(APP_ENVIRONMENT)..."
	doppler run --config $(APP_ENVIRONMENT) -- sh -c 'goose -dir $(MIGRATIONS_DIR) postgres "postgres://$$DB_USER:$$DB_PASSWORD@$$DB_HOST:$$DB_PORT/$$DB_DATABASE?sslmode=disable" down'

db-up:
	docker-compose up -d

db-down:
	docker-compose down

db-connect:
	@echo "Connecting to $(APP_ENVIRONMENT) database..."
	@doppler run --config $(APP_ENVIRONMENT) -- sh -c '\
	if [ "$$DB_HOST" = "localhost" ]; then \
		PGPASSWORD=$$DB_PASSWORD psql -h $$DB_HOST -p $$DB_PORT -U $$DB_USER -d $$DB_DATABASE; \
	else \
		PGPASSWORD=$$DB_PASSWORD psql -h $$DB_HOST -p $$DB_PORT -U $$DB_USER -d $$DB_DATABASE; \
	fi'

format:
	gofmt -s -w .

install-lint:
	@echo "Installing golangci-lint..."
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v1.59.0

.PHONY: build clean lint format install-lint