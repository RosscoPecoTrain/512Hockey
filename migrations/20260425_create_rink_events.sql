-- Create rink_events table for storing scraped events from DaySmart
CREATE TABLE IF NOT EXISTS rink_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'Hockey Drop In',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INT,
  skill_level TEXT,
  source_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Composite unique constraint to avoid duplicates
  CONSTRAINT unique_rink_event UNIQUE (rink_id, event_name, start_time),
  
  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes for efficient querying
CREATE INDEX idx_rink_events_rink_id ON rink_events(rink_id);
CREATE INDEX idx_rink_events_start_time ON rink_events(start_time);
CREATE INDEX idx_rink_events_event_type ON rink_events(event_type);
CREATE INDEX idx_rink_events_scraped_at ON rink_events(scraped_at);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE rink_events ENABLE ROW LEVEL SECURITY;

-- Public can read rink_events
CREATE POLICY "rink_events_public_read" ON rink_events
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "rink_events_admin_write" ON rink_events
  FOR INSERT, UPDATE, DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- Update the rinks table to add daysmart_company if it doesn't exist
ALTER TABLE rinks ADD COLUMN IF NOT EXISTS daysmart_company TEXT;

-- Add comment
COMMENT ON TABLE rink_events IS 'Hockey drop-in events scraped from DaySmart Recreation calendars';
COMMENT ON COLUMN rink_events.daysmart_company IS 'DaySmart company code (e.g., "chaparralice") used for scraping';
