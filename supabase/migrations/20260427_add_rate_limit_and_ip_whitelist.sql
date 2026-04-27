-- Add rate limiting and IP whitelist columns to api_keys table
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS rate_limit_requests INTEGER DEFAULT 100, -- requests per window
ADD COLUMN IF NOT EXISTS rate_limit_window_seconds INTEGER DEFAULT 60, -- time window in seconds
ADD COLUMN IF NOT EXISTS ip_whitelist TEXT[], -- array of allowed IP addresses/CIDR ranges
ADD COLUMN IF NOT EXISTS notes TEXT; -- admin notes about the key

-- Create api_rate_limit_tracker table to track request counts
CREATE TABLE IF NOT EXISTS api_rate_limit_tracker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(api_key_id, window_start)
);

-- Create index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracker_key_window 
  ON api_rate_limit_tracker(api_key_id, window_start);

-- Create api_key_blocked_events table to track rate limit violations
CREATE TABLE IF NOT EXISTS api_key_blocked_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  ip_address TEXT,
  reason TEXT, -- "rate_limit_exceeded", "ip_not_whitelisted", etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for tracking blocked events
CREATE INDEX IF NOT EXISTS idx_blocked_events_key_created 
  ON api_key_blocked_events(api_key_id, created_at);

-- RLS policies
ALTER TABLE api_rate_limit_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_blocked_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limit tracking
CREATE POLICY "Service role can manage rate limit tracker"
  ON api_rate_limit_tracker
  USING (true);

-- Users can view their rate limit status
CREATE POLICY "Users can view their rate limit data"
  ON api_rate_limit_tracker
  FOR SELECT
  USING (api_key_id IN (SELECT id FROM api_keys WHERE created_by = auth.uid()));

-- Allow service role to log blocked events
CREATE POLICY "Service role can log blocked events"
  ON api_key_blocked_events
  USING (true);

-- Users can view blocked events for their keys
CREATE POLICY "Users can view blocked events for their keys"
  ON api_key_blocked_events
  FOR SELECT
  USING (api_key_id IN (SELECT id FROM api_keys WHERE created_by = auth.uid()));
