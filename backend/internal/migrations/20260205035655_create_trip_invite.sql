-- +goose Up
-- +goose StatementBegin
CREATE TABLE trip_invites (
    id UUID PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_trip_invites_trip_id ON trip_invites(trip_id);
CREATE INDEX idx_trip_invites_code ON trip_invites(code);
CREATE INDEX idx_trip_invites_created_by ON trip_invites(created_by);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_trip_invites_created_by;
DROP INDEX IF EXISTS idx_trip_invites_code;
DROP INDEX IF EXISTS idx_trip_invites_trip_id;
DROP TABLE IF EXISTS trip_invites;
-- +goose StatementEnd
