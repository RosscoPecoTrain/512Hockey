-- Event Types table (admin-configured)
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(100) NOT NULL,
  rink VARCHAR(100) NOT NULL,
  
  -- Source configuration
  source_type VARCHAR(50) NOT NULL, -- 'shopify', 'api', 'website', etc.
  source_url VARCHAR(500) NOT NULL,
  source_pattern VARCHAR(500) NOT NULL, -- Regex pattern to match events
  
  -- Tracking state
  last_detected_event_id VARCHAR(255),
  last_detected_event_title VARCHAR(255),
  last_detected_event_date DATE,
  last_detected_at TIMESTAMP WITH TIME ZONE,
  
  -- Job status
  last_check_at TIMESTAMP WITH TIME ZONE,
  last_check_status VARCHAR(50), -- 'success', 'error', 'no_new_events'
  last_check_error TEXT,
  
  -- Metadata
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_event_type UNIQUE(location, rink, name)
);

-- User Subscriptions table
CREATE TABLE IF NOT EXISTS user_event_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  
  -- Notification preferences
  notify_via JSONB DEFAULT '["push"]', -- Array: ["push", "email", "sms"]
  active BOOLEAN DEFAULT true,
  
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_subscription UNIQUE(user_id, event_type_id)
);

-- Event Notifications table (for deduplication & audit trail)
CREATE TABLE IF NOT EXISTS event_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  
  -- What was detected
  detected_event_id VARCHAR(255) NOT NULL,
  detected_event_title VARCHAR(255) NOT NULL,
  detected_event_date DATE NOT NULL,
  registration_url VARCHAR(500) NOT NULL,
  
  -- Delivery status
  notify_channels JSONB NOT NULL, -- ["push", "email"], etc.
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Track if it was actually delivered
  delivery_status JSONB DEFAULT '{}', -- {"push": "sent", "email": "pending"}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_notification UNIQUE(user_id, detected_event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_types_active ON event_types(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_user_event_subscriptions_active ON user_event_subscriptions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_user_event_subscriptions_user ON user_event_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_user ON event_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_sent ON event_notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event_type ON event_notifications(event_type_id);

-- Seed initial event type (Friday 5v5 Lunch)
INSERT INTO event_types 
(name, location, rink, source_type, source_url, source_pattern, active)
VALUES (
  'Lunchtime 5v5 Adult Hockey',
  'pond',
  'the_pond_hockey_club',
  'shopify',
  'https://the-pond-hockey-club.myshopify.com/products',
  'Friday.*Lunch.*5v5.*Shinny',
  true
)
ON CONFLICT (location, rink, name) DO NOTHING;
