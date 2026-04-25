-- Migration: Add is_enabled column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;

-- Backfill: set all existing users to enabled
UPDATE profiles SET is_enabled = TRUE WHERE is_enabled IS NULL;
