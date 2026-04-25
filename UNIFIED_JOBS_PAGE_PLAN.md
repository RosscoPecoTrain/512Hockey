# Unified Jobs Management Page Plan

## Overview
Combine the job configuration dashboard and job logs into a single admin page at `/admin/jobs`.

## Current State
- `/admin/jobs/page.tsx` — Job logs (run history) - **standalone page, admin-only**
- `/admin/job-config/page.tsx` — Job configuration (schedules, enable/disable) - **standalone page**

## Proposed Solution
Create a unified `/admin/jobs` page with two main sections:

### Layout
```
Admin: Jobs Management
├─ TAB 1: Configuration
│  ├─ Job list (table)
│  │  ├─ Job Name | Schedule | Status | Last Run | Next Run
│  │  └─ [Run Now] [Config]
│  └─ Job Details Panel (expanded config)
│     ├─ Edit schedule/timezone/enabled
│     ├─ Run Now button
│     └─ Recent runs (last 10 from logs)
│
└─ TAB 2: Logs
   ├─ Job logs (filterable table)
   │  ├─ Job Name | Type | Status | Duration | Started | Error
   │  └─ [Click for details]
   └─ Job Log Details Panel
      ├─ Full error message
      ├─ Output data (JSON)
      └─ Timestamps
```

## Implementation Strategy

### Phase 1: Merge Pages into Single Route
1. Rename `/admin/job-config/page.tsx` → `/admin/jobs/page.tsx` (replace existing)
2. Move job logs logic into the same component
3. Add tab navigation (Config | Logs)
4. Keep both functionalities side-by-side

### Phase 2: Share State
- Single component manages:
  - Job configs (from `cron_job_configs` table)
  - Job logs (from `job_logs` table)
  - Selected job (with config + recent logs)
  - Selected log (details)

### Phase 3: UI Integration
- Top: Tabs (Configuration | Logs)
- Configuration tab: Current job-config UI
- Logs tab: Current job-logs UI
- Both tabs share same auth check

## Code Structure

```typescript
export default function JobsPage() {
  const [tab, setTab] = useState<'config' | 'logs'>('config')
  
  // Shared auth
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Config state
  const [jobs, setJobs] = useState<JobConfig[]>([])
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null)
  
  // Logs state
  const [logs, setLogs] = useState<JobLog[]>([])
  const [selectedLog, setSelectedLog] = useState<JobLog | null>(null)
  
  return (
    <div>
      {/* Header */}
      
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('config')}>
          ⚙️ Configuration
        </button>
        <button onClick={() => setTab('logs')}>
          📊 Logs
        </button>
      </div>
      
      {/* Config Tab */}
      {tab === 'config' && <ConfigSection ... />}
      
      {/* Logs Tab */}
      {tab === 'logs' && <LogsSection ... />}
    </div>
  )
}
```

## Benefits
✅ Single admin page for all job management
✅ See configs and logs in same place
✅ Easier to debug (edit schedule + see logs on same page)
✅ Cleaner URL structure
✅ Reduced complexity (one page vs two)
✅ Better UX flow

## Files to Change
1. **Delete:**
   - `/admin/job-config/page.tsx` (move content)
   - `/admin/jobs/page.tsx` (replace with merged version)

2. **Create:**
   - `/admin/jobs/page.tsx` (unified page)

3. **Keep:**
   - `/admin/jobs/layout.tsx` (if needed for routing)
   - API routes unchanged

## Effort
- **Merge logic:** 30 min
- **Fix styling/layout:** 30 min
- **Testing:** 20 min
- **Total:** ~1.5 hours

## Migration Path
1. Create new merged page
2. Test both tabs work
3. Deploy
4. Delete old `/admin/job-config` route
5. Remove stale SQL files

## Backward Compatibility
- `/admin/job-config` will no longer exist
- All functionality moves to `/admin/jobs`
- Update any links pointing to `/admin/job-config`
