# Toggo

Package Managers
- Mac
- Windows
- Linux

Prerequisite
- Git
- Bun
- Golang (use official website)
- Docker
- Postgres - postgres 15
- Goose
- Golang linter
- Doppler
- Figma

Starting server
- backend: make dev
- frontend: bun dev

Migration & Database
- connect to local db: make db-connect
- connect to prod db: make db-connect APP_ENVIRONMENT=prod
- create migration file: make migrate-create name=<file-name here>
- migrate up locally: make migrate-up
- migrate up prod: make migrate-up APP_ENVIRONMENT=prod
- migrate down locally: make migrate-down
- migrate down prod: make migrate-down APP_ENVIRONMENT=prod

