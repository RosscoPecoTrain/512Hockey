#!/usr/bin/env node

/**
 * Migration: Rinks → Locations
 * 
 * This script:
 * 1. Creates a new `locations` table with location_type
 * 2. Migrates all rinks data to locations
 * 3. Updates event_types to reference locations instead of rink names
 * 4. Drops the old rinks table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting migration: rinks → locations');

    // Step 1: Create locations table
    console.log('\n1️⃣  Creating locations table...');
    const { error: createError } = await supabase.rpc('exec', {
      sql: `
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
      `
    });

    if (createError && !createError.message.includes('already exists')) {
      throw createError;
    }
    console.log('✅ Locations table created');

    // Step 2: Migrate rinks data
    console.log('\n2️⃣  Migrating rinks data...');
    const { data: rinks, error: fetchError } = await supabase
      .from('rinks')
      .select('*');

    if (fetchError) throw fetchError;

    if (rinks && rinks.length > 0) {
      const { error: insertError } = await supabase
        .from('locations')
        .insert(
          rinks.map(rink => ({
            id: rink.id,
            name: rink.name,
            address: rink.address,
            city: rink.city,
            website_url: rink.website_url,
            booking_url: rink.booking_url,
            description: rink.description,
            location_type: 'rink',
            created_at: rink.created_at,
            updated_at: rink.updated_at
          }))
        );

      if (insertError) throw insertError;
      console.log(`✅ Migrated ${rinks.length} rink(s) to locations`);
    } else {
      console.log('ℹ️  No rinks to migrate');
    }

    // Step 3: Update event_types
    console.log('\n3️⃣  Updating event_types...');
    
    // First add the location_id column if it doesn't exist
    await supabase.rpc('exec', {
      sql: `
        ALTER TABLE event_types 
        ADD COLUMN IF NOT EXISTS location_id UUID 
        REFERENCES locations(id) ON DELETE SET NULL;
      `
    }).catch(() => null); // Ignore if column already exists

    // Get event_types with rink names
    const { data: eventTypes, error: fetchEventsError } = await supabase
      .from('event_types')
      .select('*');

    if (fetchEventsError) throw fetchEventsError;

    // Update each event_type to reference the location
    for (const eventType of eventTypes || []) {
      if (eventType.rink) {
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('name', eventType.rink)
          .eq('location_type', 'rink')
          .single();

        if (location) {
          await supabase
            .from('event_types')
            .update({ location_id: location.id })
            .eq('id', eventType.id);
        }
      }
    }
    console.log(`✅ Updated event_types to reference locations`);

    // Step 4: Drop rink column from event_types
    console.log('\n4️⃣  Dropping rink column from event_types...');
    await supabase.rpc('exec', {
      sql: `ALTER TABLE event_types DROP COLUMN IF EXISTS rink;`
    }).catch(() => null);
    console.log('✅ Dropped rink column');

    // Step 5: Drop rinks table
    console.log('\n5️⃣  Dropping rinks table...');
    await supabase.rpc('exec', {
      sql: `DROP TABLE IF EXISTS rinks CASCADE;`
    }).catch(() => null);
    console.log('✅ Dropped rinks table');

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
