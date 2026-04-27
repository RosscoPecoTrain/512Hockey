-- Create api_keys table for API authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the actual key (don't store raw keys)
  key_prefix TEXT NOT NULL, -- First 8 chars of key for display purposes (e.g., "sk_abc123de...")
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes TEXT[] DEFAULT '{}', -- Array of permission scopes: read:events, write:jobs, read:users, etc.
  description TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Create api_key_usage table for logging/auditing
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL, -- e.g., "/api/events/types"
  method TEXT NOT NULL, -- GET, POST, DELETE, etc.
  status_code INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
-- Users can only see their own keys
CREATE POLICY "Users can view their own API keys"
  ON api_keys
  FOR SELECT
  USING (auth.uid() = created_by);

-- Users can create their own keys
CREATE POLICY "Users can create API keys"
  ON api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own keys (e.g., deactivate, update description)
CREATE POLICY "Users can update their own API keys"
  ON api_keys
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete their own keys
CREATE POLICY "Users can delete their own API keys"
  ON api_keys
  FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for api_key_usage
-- Users can view usage logs for their own keys
CREATE POLICY "Users can view usage for their own keys"
  ON api_key_usage
  FOR SELECT
  USING (api_key_id IN (SELECT id FROM api_keys WHERE created_by = auth.uid()));

-- Service role can insert usage logs (for API endpoints)
CREATE POLICY "Service role can insert usage logs"
  ON api_key_usage
  FOR INSERT
  WITH CHECK (true);
