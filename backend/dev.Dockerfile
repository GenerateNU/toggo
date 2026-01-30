FROM golang:1.24-alpine

RUN apk add --no-cache \
    git \
    curl \
    ca-certificates

RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub && \
    echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories && \
    apk add doppler

ENV GOTOOLCHAIN=auto

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

RUN go install github.com/air-verse/air@v1.52.3

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "exec doppler run --project backend --config ${DOPPLER_CONFIG:-dev} -- air -c .air.toml"]