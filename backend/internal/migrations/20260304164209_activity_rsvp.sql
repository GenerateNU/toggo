-- +goose Up
-- +goose StatementBegin
CREATE TABLE activity_rsvps (
    trip_id UUID NOT NULL,
    user_id UUID NOT NULL,
    activity_id UUID NOT NULL,

    status VARCHAR(10) NOT NULL
        CHECK (status IN ('yes', 'no', 'maybe')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT activity_rsvp_pk
        PRIMARY KEY (trip_id, activity_id, user_id),

    CONSTRAINT activity_rsvp_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT activity_rsvp_activity_fk
        FOREIGN KEY (activity_id)
        REFERENCES activities(id)
        ON DELETE CASCADE,

    CONSTRAINT activity_rsvp_trip_fk
        FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_activity_rsvp_activity_id
    ON activity_rsvps (activity_id);

CREATE INDEX idx_activity_rsvp_user_id
    ON activity_rsvps (user_id);

CREATE INDEX idx_activity_rsvp_activity_status
    ON activity_rsvps (activity_id, status);

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_activity_rsvp_updated_at
BEFORE UPDATE ON activity_rsvps
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS set_activity_rsvp_updated_at ON activity_rsvps;
DROP FUNCTION IF EXISTS trigger_set_updated_at;
DROP TABLE activity_rsvps;
-- +goose StatementEnd