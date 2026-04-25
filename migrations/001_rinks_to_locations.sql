-- Migration: Convert rinks table to locations with location_type discriminator
-- This migration creates a new locations table, migrates rink data, updates references, and drops the old table

-- Step 1: Create locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  location_type TEXT NOT NULL DEFAULT 'rink',
  website_url TEXT,
  booking_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on location_type for filtering
CREATE INDEX idx_locations_type ON locations(location_type);

-- Step 2: Migrate data from rinks to locations
INSERT INTO locations (id, name, address, city, website_url, booking_url, description, location_type, created_at, updated_at)
SELECT id, name, address, city, website_url, booking_url, description, 'rink', created_at, updated_at
FROM rinks;

-- Step 3: Add location_id column to event_types
ALTER TABLE event_types ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Step 4: Populate location_id by matching rink names to location names
UPDATE event_types
SET location_id = locations.id
FROM locations
WHERE locations.name = event_types.rink
  AND locations.location_type = 'rink';

-- Step 5: Drop the rink column from event_types
ALTER TABLE event_types DROP COLUMN rink;

-- Step 6: Drop the old rinks table
DROP TABLE rinks;
