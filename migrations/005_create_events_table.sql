-- Create events table for listing recreational hockey events (drop-ins, tournaments, etc.)

-- First, add daysmart_calendar_id to locations table
ALTER TABLE locations ADD COLUMN daysmart_calendar_id TEXT;
CREATE INDEX idx_locations_daysmart_id ON locations(daysmart_calendar_id);

-- Create event_types for event listing (separate from notification monitoring)
-- This will have entries like "Drop-In Hockey", "Tournament", etc.
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#4fc3f7',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for lookups
CREATE INDEX idx_event_types_name ON event_types(name);

-- Create events table for actual event instances
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  registration_url TEXT,
  source_url TEXT,
  external_event_id TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_events_location_id ON events(location_id);
CREATE INDEX idx_events_event_type_id ON events(event_type_id);
CREATE INDEX idx_events_start_time ON events(start_time DESC);
CREATE INDEX idx_events_external_id ON events(external_event_id);

-- Enable RLS on event_types (public read)
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read event_types" ON event_types
  FOR SELECT USING (true);

-- Enable RLS on events (public read, authenticated can create)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read events" ON events
  FOR SELECT USING (true);
CREATE POLICY "Allow service role to insert events" ON events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role to update events" ON events
  FOR UPDATE USING (true);

-- Insert the Drop-In Hockey event type
INSERT INTO event_types (name, description, color, active)
VALUES ('Drop-In Hockey', 'Recreational drop-in hockey games', '#4fc3f7', true)
ON CONFLICT (name) DO NOTHING;
