FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o toggo ./cmd/server

FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/toggo .

EXPOSE 8000

CMD ["./toggo"]