BINARY_NAME := toggo
MAIN_FILE := cmd/main.go
VERSION ?= dev
APP_ENVIRONMENT ?= dev

build:
	go build -ldflags "-X main.Version=$(VERSION)" -o $(BINARY_NAME) $(MAIN_FILE)

clean:
	rm -f $(BINARY_NAME)

dev:
	doppler run -- wgo run $(MAIN_FILE)

lint:
	golangci-lint run ./...

format:
	gofmt -s -w .

install-lint:
	@echo "Installing golangci-lint..."
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v1.59.0

.PHONY: build clean lint format install-lint