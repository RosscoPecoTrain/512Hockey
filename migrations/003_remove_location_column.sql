-- Remove event_types.location column (derive from locations table instead)
ALTER TABLE event_types DROP COLUMN IF EXISTS location;
