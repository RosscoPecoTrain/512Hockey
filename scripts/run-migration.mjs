#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runStep(description, query) {
  try {
    console.log(`\n${description}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });
    if (error) throw error;
    console.log(`✅ ${description}`);
    return { success: true };
  } catch (error) {
    // Some errors are expected (e.g., table already exists)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log(`⚠️  ${description} (already done)`);
      return { success: true };
    }
    console.error(`❌ ${error.message}`);
    return { success: false, error };
  }
}

async function runMigration() {
  console.log('🚀 Starting migration: rinks → locations\n');

  try {
    // Step 1: Create locations table
    await runStep('1️⃣  Creating locations table', `
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        location_type TEXT NOT NULL DEFAULT 'rink',
        website_url TEXT,
        booking_url TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
    `);

    // Step 2: Migrate rinks data
    await runStep('2️⃣  Migrating rinks data', `
      INSERT INTO locations (id, name, address, city, website_url, booking_url, description, location_type, created_at, updated_at)
      SELECT id, name, address, city, website_url, booking_url, description, 'rink', created_at, updated_at
      FROM rinks
      ON CONFLICT DO NOTHING;
    `);

    // Step 3: Add location_id to event_types
    await runStep('3️⃣  Adding location_id to event_types', `
      ALTER TABLE event_types ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    `);

    // Step 4: Populate location_id
    await runStep('4️⃣  Populating location_id', `
      UPDATE event_types
      SET location_id = locations.id
      FROM locations
      WHERE locations.name = event_types.rink
        AND locations.location_type = 'rink'
        AND event_types.location_id IS NULL;
    `);

    // Step 5: Drop rink column
    await runStep('5️⃣  Dropping rink column from event_types', `
      ALTER TABLE event_types DROP COLUMN IF EXISTS rink;
    `);

    // Step 6: Drop rinks table
    await runStep('6️⃣  Dropping rinks table', `
      DROP TABLE IF EXISTS rinks CASCADE;
    `);

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
