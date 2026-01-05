FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git curl bash libc6-compat

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -buildvcs=false -o toggo ./cmd/main.go

FROM alpine:3.19

RUN apk add --no-cache curl bash ca-certificates wget

RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' \
    -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub && \
    echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' >> /etc/apk/repositories && \
    apk add doppler

WORKDIR /app

COPY --from=builder /app/toggo .

EXPOSE 8000

CMD ["doppler", "run", "--project", "backend", "--config", "prod", "--", "./toggo"]
