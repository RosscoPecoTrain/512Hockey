-- Rename tables for clarity: event_types → notification_event_types, user_event_subscriptions → user_notification_subscriptions

-- Rename event_types table
ALTER TABLE event_types RENAME TO notification_event_types;

-- Rename associated indexes and constraints
ALTER INDEX idx_locations_type RENAME TO idx_notification_event_types_active;

-- Rename user_event_subscriptions table
ALTER TABLE user_event_subscriptions RENAME TO user_notification_subscriptions;

-- Update foreign key references (if any constraints need updating)
-- The FK from notification_event_types to locations should still work
-- The FK from user_notification_subscriptions to notification_event_types will automatically update

-- Note: Verify all references in code are updated before running this migration
