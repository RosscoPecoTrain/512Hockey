#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting migration: rinks → locations\n');

  try {
    // Step 1: Fetch all rinks
    console.log('1️⃣  Fetching rinks data...');
    const { data: rinks, error: fetchError } = await supabase
      .from('rinks')
      .select('*');

    if (fetchError) throw fetchError;
    console.log(`✅ Found ${rinks?.length || 0} rink(s)`);

    // Step 2: Insert rinks as locations
    if (rinks && rinks.length > 0) {
      console.log('\n2️⃣  Inserting rinks as locations...');
      const locations = rinks.map(rink => ({
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
      }));

      const { error: insertError } = await supabase
        .from('locations')
        .insert(locations);

      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }
      console.log(`✅ Inserted ${locations.length} location(s)`);
    }

    // Step 3: Fetch event_types and update with location_id
    console.log('\n3️⃣  Updating event_types with location references...');
    const { data: eventTypes, error: fetchEventsError } = await supabase
      .from('event_types')
      .select('*');

    if (fetchEventsError) throw fetchEventsError;

    if (eventTypes && eventTypes.length > 0) {
      for (const eventType of eventTypes) {
        if (eventType.rink) {
          // Find matching location by rink name
          const { data: location } = await supabase
            .from('locations')
            .select('id')
            .eq('name', eventType.rink)
            .eq('location_type', 'rink')
            .single();

          if (location) {
            // Update event_type with location_id
            await supabase
              .from('event_types')
              .update({ location_id: location.id })
              .eq('id', eventType.id);
          } else {
            console.log(`⚠️  No matching location for rink: ${eventType.rink}`);
          }
        }
      }
      console.log(`✅ Updated ${eventTypes.length} event type(s)`);
    }

    console.log('\n✨ Manual migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to https://app.supabase.com → your project → SQL Editor');
    console.log('2. Run these commands to clean up:');
    console.log('   ALTER TABLE event_types DROP COLUMN IF EXISTS rink;');
    console.log('   DROP TABLE IF EXISTS rinks;');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
