-- +goose Up
-- +goose StatementBegin
CREATE TABLE memberships (
    user_id UUID NOT NULL,
    trip_id UUID NOT NULL,
    is_admin BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    budget_min INTEGER NOT NULL DEFAULT 0 CHECK (budget_min >= 0),
    budget_max INTEGER NOT NULL DEFAULT 0 CHECK (budget_max >= 0 AND budget_max >= budget_min),
    availability JSONB NULL,
    PRIMARY KEY (user_id, trip_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Performance indices
CREATE INDEX idx_memberships_trip_id ON memberships(trip_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_is_admin ON memberships(is_admin) WHERE is_admin = true;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for memberships table
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP INDEX IF EXISTS idx_memberships_trip_id;
DROP INDEX IF EXISTS idx_memberships_user_id;
DROP INDEX IF EXISTS idx_memberships_is_admin;
DROP TABLE IF EXISTS memberships;
-- +goose StatementEnd