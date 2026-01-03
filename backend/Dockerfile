# -------------------------
# 1. Build Stage
# -------------------------
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o togo ./cmd/server

# -------------------------
# 2. Runtime Stage
# -------------------------
FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/toggo .

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]