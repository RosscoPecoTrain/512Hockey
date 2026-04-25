-- Add RLS policy to locations table for public read access

-- Enable RLS on locations table if not already enabled
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to locations
CREATE POLICY "Allow public read locations" ON locations
  FOR SELECT USING (true);

-- Allow authenticated users to create/update locations
CREATE POLICY "Allow authenticated insert locations" ON locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update locations" ON locations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Make sure the table is exposed in the REST API
-- Go to https://app.supabase.com → Table Editor → locations → customize → toggle "Expose to REST API"
