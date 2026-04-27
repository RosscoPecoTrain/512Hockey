# 512 Hockey - DaySmart Scraper

This is a self-hosted Docker container that scrapes DaySmart hockey calendar events and syncs them to Supabase.

## Overview

- **Runs on:** Docker (deploy via Portainer on your home network)
- **Scrapes:** DaySmart calendar for hockey events
- **Stores:** Events in Supabase `events` table
- **Schedule:** Configurable cron (default: every 6 hours)
- **Headless:** Puppeteer browser automation (no UI)

## Setup

### 1. Prerequisites

- Docker & Docker Compose
- Supabase account with `events` table (see schema below)
- DaySmart calendar URL for your rink

### 2. Configure Environment

Copy the example and fill in your details:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
DAYSMART_URL=https://www.daysmart.com/calendar/your-location-code
SCRAPE_SCHEDULE=0 */6 * * *
```

### 3. Supabase Schema

Create the `events` table in Supabase (SQL Editor):

```sql
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  source TEXT DEFAULT 'daysmart',
  external_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(title, start_time, source)
);

CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_source ON events(source);
```

### 4. Deploy with Docker Compose

From the project root (where `docker-compose.yml` lives):

```bash
docker-compose up -d daysmart-scraper
```

Check logs:

```bash
docker-compose logs -f daysmart-scraper
```

Stop:

```bash
docker-compose down daysmart-scraper
```

### 5. Deploy via Portainer

1. Go to your Portainer UI
2. **Stacks** → **Add Stack**
3. Paste the contents of `docker-compose.yml`
4. Add environment variables (or use `.env` file)
5. **Deploy**

## How It Works

1. **Starts up** → Puppeteer launches a headless Chrome browser
2. **Navigates** → Goes to your DaySmart calendar URL
3. **Waits** → Waits for JavaScript to render event elements
4. **Scrapes** → Extracts event title, time, location
5. **Parses** → Converts times to ISO 8601 format
6. **Syncs** → Upserts events into Supabase `events` table
7. **Cleans** → Removes events older than 30 days
8. **Schedules** → Waits for next cron interval, repeats

## Cron Schedule Examples

| Schedule | Meaning |
|----------|---------|
| `0 */6 * * *` | Every 6 hours |
| `0 7,12,18 * * *` | 7 AM, noon, 6 PM daily |
| `0 6 * * 1-5` | 6 AM on weekdays |
| `0 9 * * 0` | 9 AM on Sundays |
| `*/15 * * * *` | Every 15 minutes |

## Troubleshooting

### "Element not found" errors

The scraper uses generic selectors. If DaySmart's HTML structure is different, update `scraper.js`:

```javascript
// Find the actual selectors by inspecting DaySmart's page
const eventElements = document.querySelectorAll('YOUR_ACTUAL_SELECTOR');
```

### "Cannot find libnss3" errors

The Dockerfile installs Puppeteer dependencies. If you see missing libraries:

```bash
docker-compose logs daysmart-scraper | grep -i "not found"
```

Add the missing package to the `apt-get install` line in `Dockerfile`.

### Scraper runs but events aren't appearing

1. Check Supabase table exists: `events`
2. Verify credentials are correct in `.env`
3. Check browser logs: `docker-compose logs daysmart-scraper`
4. Test DaySmart URL manually in browser (events might be hidden)

### No events after first run

DaySmart might be detecting automation. Try:
- Adding delays: `await page.waitForTimeout(3000);`
- Randomizing user agent
- Using proxy (if DaySmart blocks scrapers)

## Performance Notes

- **CPU:** Minimal (browser only runs during scrape)
- **Memory:** ~500MB per scrape (Puppeteer + Chrome)
- **Network:** Depends on DaySmart response time (typically <10s)
- **Storage:** Events table grows by ~50-100 rows per day

## Next Steps

1. Test the scraper locally: `npm install && node scraper.js`
2. Deploy to Portainer on your home network
3. Monitor first few runs to catch parsing issues
4. Update your 512Hockey Vercel app to display events from Supabase

## Files

- `docker-compose.yml` — Compose config (at project root)
- `Dockerfile` — Image definition
- `scraper.js` — Main scraping logic
- `package.json` — Node dependencies
- `.env.example` — Environment template
- `README.md` — This file

---

**Questions?** Check Docker logs or review DaySmart's page structure in browser DevTools.
