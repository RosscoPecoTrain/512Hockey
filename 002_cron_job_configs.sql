-- Create cron_job_configs table for managing 512Hockey cron jobs
CREATE TABLE IF NOT EXISTS cron_job_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(255) NOT NULL UNIQUE,
  job_type VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  schedule_cron VARCHAR(50) NOT NULL,
  schedule_tz VARCHAR(50) DEFAULT 'UTC',
  description TEXT,
  config_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_cron_job_configs_enabled ON cron_job_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_cron_job_configs_job_name ON cron_job_configs(job_name);

-- Enable RLS
ALTER TABLE cron_job_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view (admin check in app)
CREATE POLICY "Users can view job configs"
  ON cron_job_configs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow service role to update
CREATE POLICY "Service role can update job configs"
  ON cron_job_configs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed initial job configs
INSERT INTO cron_job_configs (job_name, job_type, schedule_cron, schedule_tz, description, enabled)
VALUES
  (
    'event-notification',
    'notification',
    '0 */6 * * *',
    'UTC',
    'Check for new events and send notifications to subscribers',
    true
  ),
  (
    'job-log-cleanup',
    'maintenance',
    '0 2 * * *',
    'UTC',
    'Clean up job logs older than 90 days',
    true
  )
ON CONFLICT (job_name) DO NOTHING;
