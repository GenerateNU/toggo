-- +goose Up
-- +goose StatementBegin
CREATE TABLE polls (
	id UUID PRIMARY KEY,
	trip_id UUID NOT NULL,
	created_by UUID NOT NULL,
	question TEXT NOT NULL,
	poll_type TEXT NOT NULL CHECK (poll_type IN ('single', 'multi', 'rank')),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	deadline TIMESTAMP WITH TIME ZONE,
	FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
	FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE poll_options (
	id UUID PRIMARY KEY,
	poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
	option_type TEXT NOT NULL CHECK (option_type IN ('entity', 'custom')),
	entity_type TEXT,
	entity_id UUID,
	name TEXT NOT NULL,
	CHECK (
		option_type <> 'entity'
		OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)
	)
);

CREATE INDEX idx_polls_trip_id ON polls (trip_id);
CREATE INDEX idx_polls_created_by ON polls (created_by);
CREATE INDEX idx_polls_deadline ON polls (deadline);
CREATE INDEX idx_poll_options_poll_id ON poll_options (poll_id);
CREATE INDEX idx_poll_options_entity_type_entity_id ON poll_options (entity_type, entity_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_poll_options_entity_type_entity_id;
DROP INDEX IF EXISTS idx_poll_options_poll_id;
DROP INDEX IF EXISTS idx_polls_deadline;
DROP INDEX IF EXISTS idx_polls_created_by;
DROP INDEX IF EXISTS idx_polls_trip_id;

DROP TABLE IF EXISTS poll_options;
DROP TABLE IF EXISTS polls;
-- +goose StatementEnd
