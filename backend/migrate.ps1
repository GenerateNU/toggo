param(
    [string]$Environment = "dev",
    [string]$MigrationsDir = "internal/migrations"
)

$dbHost = if ($Environment -eq 'dev') { 'localhost' } else { $env:DB_HOST }

$connectionString = "postgres://$($env:DB_USER):$($env:DB_PASSWORD)@${dbHost}:$($env:DB_PORT)/$($env:DB_DATABASE)?sslmode=disable"

Write-Host "Applying migrations to $Environment database..."
& goose -dir $MigrationsDir postgres $connectionString up