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
	DOPPLER_TOKEN=$$(doppler configs tokens create --project backend --config dev --name dev-token-$$(date +%Y%m%d%H%M%S) --plain --max-age 1m) docker-compose up --build
	migrate-up

dev-down:
	docker compose down -v
	docker volume prune -f

lint:
	golangci-lint run ./...

api-doc:
	swag init -g ./cmd/main.go --output ./docs

migrate-create:
ifndef name
	$(error name is required, e.g. make migrate-create name=create_user)
endif
	@mkdir -p $(MIGRATIONS_DIR)
	goose -dir $(MIGRATIONS_DIR) create $(name) sql

db-connect:
	@echo "Connecting to $(APP_ENVIRONMENT) database..."
	@doppler run --project backend --config $(APP_ENVIRONMENT) -- sh -c '\
		HOST=$$( [ "$(APP_ENVIRONMENT)" = "dev" ] && echo localhost || echo $$DB_HOST ); \
		PGPASSWORD=$$DB_PASSWORD psql \
			-h $$HOST \
			-p $$DB_PORT \
			-U $$DB_USER \
			-d $$DB_DATABASE \
	'

migrate-up:
	@echo "Applying migrations to $(APP_ENVIRONMENT) database..."
	@doppler run --project backend --config $(APP_ENVIRONMENT) -- sh -c '\
		HOST=$$( [ "$(APP_ENVIRONMENT)" = "dev" ] && echo localhost || echo $$DB_HOST ); \
		goose -dir $(MIGRATIONS_DIR) postgres "postgres://$$DB_USER:$$DB_PASSWORD@$$HOST:$$DB_PORT/$$DB_DATABASE?sslmode=disable" up \
	'

migrate-down:
	@echo "Rolling back last migration on $(APP_ENVIRONMENT) database..."
	@doppler run --project backend --config $(APP_ENVIRONMENT) -- sh -c '\
		HOST=$$( [ "$(APP_ENVIRONMENT)" = "dev" ] && echo localhost || echo $$DB_HOST ); \
		goose -dir $(MIGRATIONS_DIR) postgres "postgres://$$DB_USER:$$DB_PASSWORD@$$HOST:$$DB_PORT/$$DB_DATABASE?sslmode=disable" down \
	'

db-up:
	@echo "Starting Postgres container..."
	@DOPPLER_TOKEN=$$(doppler configs tokens create --project backend --config dev --name dev-token-$$(date +%Y%m%d%H%M%S) --plain --max-age 1m) \
		docker-compose up -d postgres

db-down:
	@echo "Stopping Postgres container..."
	@docker-compose stop postgres

format:
	gofmt -s -w .

tidy:
	go mod tidy

install-lint:
	@echo "Installing golangci-lint..."
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v1.59.0

.PHONY: tidy build clean lint format install-lint dev db-up db-down db-connect migrate-create migrate-up migrate-down api-doc