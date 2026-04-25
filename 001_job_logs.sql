-- Create job_logs table for tracking cron job runs
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  error_message TEXT,
  output_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indices for fast queries
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_type_created_at ON job_logs(job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_logs(status);

-- Enable RLS
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view job logs (assumes admin check in app)
CREATE POLICY "Authenticated users can view job logs"
  ON job_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow service role (backend) to insert/update/delete logs
CREATE POLICY "Service role can manage job logs"
  ON job_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
