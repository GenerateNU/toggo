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
	@echo "Starting local Temporal server..."
	@temporal server start-dev &  # run Temporal server in background
	@sleep 5  # wait a few seconds for Temporal to initialize

	@echo "Starting Docker containers..."
	DOPPLER_TOKEN=$$(doppler configs tokens create --project backend --config dev --name dev-token-$$(date +%Y%m%d%H%M%S) --plain --max-age 1m) \
		docker-compose up --build

	@until docker exec backend-db pg_isready -U dev_user -d dev_db > /dev/null 2>&1; do sleep 1; done
	@echo "Database ready"

	$(MAKE) migrate-up

	@echo "Following logs... (Ctrl+C to stop)"
	docker-compose logs -f

dev-win:
	@powershell -Command "\
		$$env:DOPPLER_TOKEN = doppler configs tokens create --project backend --config dev --name dev-token-$$(Get-Date -Format 'yyyyMMddHHmmss') --plain --max-age 1m; \
		docker-compose up -d --build"
	@echo Waiting for database...
	@powershell -Command "while (!(docker exec database pg_isready -U dev_user -d dev_db 2>$$null)) { Start-Sleep -Seconds 1 }"
	@echo Database ready
	$(MAKE) migrate-up-win
	@echo Following logs... (Ctrl+C to stop)
	@docker-compose logs -f
	
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

db-connect-win:
	@echo Connecting to $(APP_ENVIRONMENT) database...
	@powershell -Command "doppler run --project backend --config $(APP_ENVIRONMENT) -- powershell -Command \"$$host = if ('$(APP_ENVIRONMENT)' -eq 'dev') { 'localhost' } else { $$env:DB_HOST }; $$env:PGPASSWORD=$$env:DB_PASSWORD; psql -h $$host -p $$env:DB_PORT -U $$env:DB_USER -d $$env:DB_DATABASE\""

migrate-up:
	@echo "Applying migrations to $(APP_ENVIRONMENT) database..."
	@doppler run --project backend --config $(APP_ENVIRONMENT) -- sh -c '\
		HOST=$$( [ "$(APP_ENVIRONMENT)" = "dev" ] && echo localhost || echo $$DB_HOST ); \
		goose -dir $(MIGRATIONS_DIR) postgres "postgres://$$DB_USER:$$DB_PASSWORD@$$HOST:$$DB_PORT/$$DB_DATABASE?sslmode=disable" up \
	'

migrate-up-win:
	@echo Applying migrations to $(APP_ENVIRONMENT) database...
	@doppler run --project backend --config $(APP_ENVIRONMENT) -- powershell -Command "\
		$$dbHost = if ('$(APP_ENVIRONMENT)' -eq 'dev') { 'localhost' } else { $$env:DB_HOST }; \
		$$connectionString = \"postgres://$${env:DB_USER}:$${env:DB_PASSWORD}@$${dbHost}:$${env:DB_PORT}/$${env:DB_DATABASE}?sslmode=disable\"; \
		Write-Host 'Applying migrations to $(APP_ENVIRONMENT) database...'; \
		goose -dir $(MIGRATIONS_DIR) postgres $$connectionString up"

migrate-down:
	@echo "Rolling back last migration on $(APP_ENVIRONMENT) database..."
	@doppler run --project backend --config $(APP_ENVIRONMENT) -- sh -c '\
		HOST=$$( [ "$(APP_ENVIRONMENT)" = "dev" ] && echo localhost || echo $$DB_HOST ); \
		goose -dir $(MIGRATIONS_DIR) postgres "postgres://$$DB_USER:$$DB_PASSWORD@$$HOST:$$DB_PORT/$$DB_DATABASE?sslmode=disable" down \
	'

migrate-down-win:
	@echo Rolling back last migration on $(APP_ENVIRONMENT) database...
	@powershell -Command "doppler run --project backend --config $(APP_ENVIRONMENT) -- powershell -Command \"$$host = if ('$(APP_ENVIRONMENT)' -eq 'dev') { 'localhost' } else { $$env:DB_HOST }; goose -dir $(MIGRATIONS_DIR) postgres \"postgres://$$env:DB_USER:$$env:DB_PASSWORD@$$host:$$env:DB_PORT/$$env:DB_DATABASE?sslmode=disable\" down\""

db-up:
	@echo "Starting Postgres container..."
	@DOPPLER_TOKEN=$$(doppler configs tokens create --project backend --config dev --name dev-token-$$(date +%Y%m%d%H%M%S) --plain --max-age 1m) \
		docker-compose up -d postgres
	@until docker exec database pg_isready -U dev_user -d dev_db > /dev/null 2>&1; do sleep 1; done
	$(MAKE) migrate-up

db-up-win:
	@echo Starting Postgres container...
	@powershell -Command "$$env:DOPPLER_TOKEN=$$(doppler configs tokens create --project backend --config dev --name dev-token-$$(Get-Date -Format 'yyyyMMddHHmmss') --plain --max-age 1m); docker-compose up -d postgres"
	@echo Waiting for database...
	@powershell -Command "while (!(docker exec database pg_isready -U dev_user -d dev_db 2>$$null)) { Start-Sleep -Seconds 1 }"
	@echo Database ready
	$(MAKE) migrate-up-win

db-down:
	@echo "Stopping Postgres container..."
	@docker-compose stop postgres

format:
	gofmt -s -w .

tidy:
	go mod tidy

test:
	docker compose -f docker-compose.test.yml up -d
	@until docker exec backend-test-db-1 pg_isready -U dev_user -d dev_db > /dev/null 2>&1; do sleep 1; done
	@echo "Database ready"
	doppler run --project backend --config test -- go test -v ./internal/tests -parallel 4
	docker compose -f docker-compose.test.yml down

test-win:
	docker compose -f docker-compose.test.yml up -d
	@echo Waiting for database...
	@powershell -Command "while (!(docker exec backend-test-db-1 pg_isready -U dev_user -d dev_db 2>$$null)) { Start-Sleep -Seconds 1 }"
	@echo Database ready
	doppler run --project backend --config test -- go test -v ./internal/tests -parallel 4
	docker compose -f docker-compose.test.yml down

localstack-up:
	./scripts/start-localstack.sh # if on windows, just use git bash to run this script

localstack-down:
	@echo "Stopping LocalStack..."
	localstack stop
	@echo "Removing LocalStack container..."
	docker rm localstack-main 2>/dev/null || true

.PHONY: format tidy build clean lint format install-lint dev dev-win db-up db-up-win db-down db-connect db-connect-win migrate-create migrate-up migrate-up-win migrate-down migrate-down-win api-doc test test-win
