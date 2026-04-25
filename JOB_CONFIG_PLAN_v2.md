# 512Hockey Job Configuration Management (v2)

## Overview
Add an admin interface to view, configure, and manually invoke 512Hockey's own cron jobs (event notification, email sends, etc.).

## Jobs to Manage

1. **Event Notification Job** (every 6 hours)
   - Check for new events
   - Send notifications to subscribers
   - Located in: `lib/eventNotificationJob.ts`

2. **Job Log Cleanup** (daily at 2 AM)
   - Delete logs older than 90 days
   - Located in: `lib/jobLogger.ts`

3. Future jobs...

## Database Schema

### `cron_job_configs` table
```sql
CREATE TABLE cron_job_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(255) NOT NULL UNIQUE,
  job_type VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  schedule_cron VARCHAR(50) NOT NULL,
  schedule_tz VARCHAR(50) DEFAULT 'UTC',
  description TEXT,
  config_data JSONB, -- Any job-specific config
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example data:
-- { job_name: 'event-notification', schedule_cron: '0 */6 * * *', enabled: true }
-- { job_name: 'job-log-cleanup', schedule_cron: '0 2 * * *', enabled: true }
```

## Features

### 1. Job List & Dashboard
- View all configured jobs
- Show: name, schedule, enabled status, description
- Sort by name/schedule
- Search

### 2. Job Details & Configuration
- Click job to see full config
- View:
  - Current cron schedule
  - Timezone
  - Enabled/disabled status
  - Custom config (JSON)
  - Last 10 runs from job_logs

### 3. Edit Job Config
- Update cron schedule
- Toggle enabled/disabled
- Update custom config
- Save changes to DB

### 4. Manual Job Invocation
- "Run Now" button
- Shows execution status
- Logs result to job_logs table
- Display any errors

## Implementation

### Phase 1: Create Database Table
```sql
-- Run in Supabase SQL editor
CREATE TABLE cron_job_configs (
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

-- Seed initial jobs
INSERT INTO cron_job_configs (job_name, job_type, schedule_cron, description) VALUES
('event-notification', 'notification', '0 */6 * * *', 'Check for new events and send notifications'),
('job-log-cleanup', 'maintenance', '0 2 * * *', 'Clean up job logs older than 90 days');
```

### Phase 2: Update cronJobs.ts
- Load schedule from DB instead of hardcoding
- Allow dynamic schedule updates (restart required or dynamic reload)
- Track which jobs are enabled/disabled

### Phase 3: Build Admin UI
- `/admin/job-config` page
- List all jobs from DB
- Edit schedule/config
- Manual invoke via API

## API Routes

### GET /api/admin/job-configs
- Fetch all job configs with last run info
- Join with job_logs for recent runs

### POST /api/admin/job-configs/:jobName/run
- Manually trigger a specific job
- Log the run to job_logs
- Return status/result

### PATCH /api/admin/job-configs/:jobName
- Update job schedule/config
- Validate cron expression
- Update in DB
- **Note:** Job won't use new schedule until next restart (unless we add dynamic reload)

## Next Steps

1. Create `cron_job_configs` table in Supabase
2. Seed initial job configs
3. Update `lib/cronJobs.ts` to read from DB
4. Create `/admin/job-config` UI
5. Create API routes for run/edit

## Benefits
- 🎛️ Manage schedules without code changes
- 🧪 Test jobs immediately ("Run Now")
- 📊 See job run history in one place
- 🔧 Enable/disable jobs on the fly
- 📋 Full audit trail of job configs
