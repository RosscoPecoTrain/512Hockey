# Job Configuration Management Plan

## Overview
Add an admin interface to view, edit, and manually invoke OpenClaw cron jobs directly from the 512Hockey app.

## Features

### 1. Job Config Dashboard (`/admin/job-config`)
- **Route**: Protected admin-only page
- **List all cron jobs** with details:
  - Job name
  - Job type (event_notification, system_maintenance, etc.)
  - Schedule (cron expression or interval)
  - Status (enabled/disabled)
  - Last run time & result
  - Next scheduled run
  - Model/timeout config

### 2. Job Details & Edit
- **Click a job** to see full config:
  - Job ID
  - Full cron expression with timezone
  - Payload (message, model, timeout)
  - Delivery config (channel, webhook, etc.)
  - RLS policies
  - Full run history (last 10 runs)

- **Edit capability** (for non-critical jobs):
  - Change schedule (cron expression)
  - Enable/disable job
  - Update timeout
  - Update model override
  - Save changes back to OpenClaw

### 3. Manual Job Invocation
- **"Run Now" button** for each job:
  - Immediately trigger the job
  - Show real-time execution status
  - Display output/result
  - Log the manual run in job_logs table
  - Show any errors

### 4. Data Source
**OpenClaw Gateway API** (via your Vercel token):
```
GET https://gateway.openclaw.ai/cron/list
  → Returns all jobs for your workspace

POST https://gateway.openclaw.ai/cron/run
  → Manually trigger a job

PATCH https://gateway.openclaw.ai/cron/[jobId]
  → Update job config
```

**Local job_logs table:**
- Query run history
- Show metrics

## Implementation Steps

### Phase 1: Read-Only View (MVP)
1. Create `/admin/job-config` page
2. Fetch jobs from OpenClaw API using Vercel token
3. Display job list with:
   - Name, type, schedule, enabled status
   - Last run time & result
   - Next scheduled run
4. Click to see full details & run history

### Phase 2: Manual Invocation
1. Add "Run Now" button to each job
2. Call OpenClaw `POST /cron/run` endpoint
3. Show live execution feedback
4. Log result to job_logs table

### Phase 3: Edit & Update (Future)
1. Add edit form for schedule, timeout, model
2. Call `PATCH /cron/[jobId]` to update
3. Validation before saving
4. Audit trail of config changes

## API Integration

### Get Jobs List
```typescript
const response = await fetch(
  'https://api.openclaw.ai/v1/cron/list',
  {
    headers: {
      'Authorization': `Bearer ${process.env.OPENCLAW_TOKEN}`,
    }
  }
)
const jobs = await response.json()
```

### Run Job
```typescript
const response = await fetch(
  'https://api.openclaw.ai/v1/cron/run',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENCLAW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId: 'xxx' })
  }
)
const result = await response.json()
```

## Database
No new tables needed — use existing `job_logs` table for run history.

## UI Layout

```
Admin Panel Header
├── [Other Tabs] ... [⚙️ Job Logs] [📋 Job Config] ← NEW

Job Config Page
├── Job List (searchable, sortable)
│   ├── Job Name | Type | Schedule | Status | Last Run | Next Run
│   └── [Click row to expand]
│
├── Job Details Panel (expanded)
│   ├── Full config (JSON view)
│   ├── Last 10 runs (from job_logs)
│   ├── [Run Now] button
│   └── [Edit] button (future)
```

## Estimated Effort
- Phase 1 (Read-only): 1-1.5 hours
- Phase 2 (Manual run): 30 min
- Phase 3 (Edit): 1-2 hours
- **Total MVP**: ~2 hours

## Benefits
- Visibility into all system jobs
- Ability to test jobs on-demand (no waiting for schedule)
- Monitor job health & performance
- Debug issues by re-running jobs manually
- Quick config changes without redeploying
