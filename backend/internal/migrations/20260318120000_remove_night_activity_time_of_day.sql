-- +goose Up
-- +goose StatementBegin
-- Postgres does not support removing an enum label directly.
-- We migrate by creating a new type, casting, and swapping.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_time_of_day') THEN
        -- If the old type contains 'night', swap it out.
        IF EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'activity_time_of_day'
              AND e.enumlabel = 'night'
        ) THEN
            -- Drop any rows using the soon-to-be-invalid value.
            UPDATE activities SET time_of_day = NULL WHERE time_of_day::text = 'night';

            CREATE TYPE activity_time_of_day_new AS ENUM ('morning', 'afternoon', 'evening');

            ALTER TABLE activities
                ALTER COLUMN time_of_day TYPE activity_time_of_day_new
                USING (time_of_day::text::activity_time_of_day_new);

            DROP TYPE activity_time_of_day;
            ALTER TYPE activity_time_of_day_new RENAME TO activity_time_of_day;
        END IF;
    END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Restore the 'night' enum value (reverse of Up) by swapping types again.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_time_of_day') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'activity_time_of_day'
              AND e.enumlabel = 'night'
        ) THEN
            CREATE TYPE activity_time_of_day_old AS ENUM ('morning', 'afternoon', 'evening', 'night');

            ALTER TABLE activities
                ALTER COLUMN time_of_day TYPE activity_time_of_day_old
                USING (time_of_day::text::activity_time_of_day_old);

            DROP TYPE activity_time_of_day;
            ALTER TYPE activity_time_of_day_old RENAME TO activity_time_of_day;
        END IF;
    END IF;
END $$;
-- +goose StatementEnd

