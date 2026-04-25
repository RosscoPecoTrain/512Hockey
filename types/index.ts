export interface Profile {
  id: string
  email: string
  full_name: string
  position?: 'Forward' | 'Defense' | 'Goalie' | null
  skill_level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro' | null
  bio?: string
  avatar_url?: string
  leagues?: string[]
  phone?: string
  preferred_location_ids?: string[]
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read_at?: string
  created_at: string
  updated_at: string
}

export interface ForumPost {
  id: string
  author_id: string
  title: string
  content: string
  category?: string
  approved: boolean
  pinned: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface ForumReply {
  id: string
  post_id: string
  author_id: string
  content: string
  approved: boolean
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  location_type: 'rink' | 'arena' | 'bar' | 'practice' | string
  website_url?: string
  booking_url?: string
  description?: string
  created_at: string
  updated_at: string
}

/** @deprecated Use Location instead */
export type Rink = Location

export interface NotificationEventType {
  id: string
  name: string
  location_id?: string
  locations?: Location
  source_type: 'shopify' | 'api' | 'website'
  source_url: string
  source_pattern: string
  last_detected_event_id?: string
  last_detected_event_title?: string
  last_detected_event_date?: string
  last_detected_at?: string
  last_check_at?: string
  last_check_status?: 'success' | 'error' | 'no_new_events'
  last_check_error?: string
  active: boolean
  created_at: string
  updated_at: string
}

/** @deprecated Use NotificationEventType instead */
export type EventType = NotificationEventType

export interface UserNotificationSubscription {
  id: string
  user_id: string
  notification_event_type_id: string
  notify_via: string[] // ['push', 'email', 'sms']
  active: boolean
  subscribed_at: string
  updated_at: string
}

/** @deprecated Use UserNotificationSubscription instead */
export type UserEventSubscription = UserNotificationSubscription

export interface EventNotification {
  id: string
  user_id: string
  notification_event_type_id: string
  detected_event_id: string
  detected_event_title: string
  detected_event_date: string
  registration_url: string
  notify_channels: string[]
  sent_at: string
  delivery_status: Record<string, string>
  created_at: string
}

export interface DetectedEvent {
  id: string
  title: string
  date: string
  date_display: string
  registration_url: string
}

export interface EventType {
  id: string
  name: string
  description?: string
  color?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  location_id: string
  event_type_id: string
  title: string
  description?: string
  start_time: string
  end_time?: string
  registration_url?: string
  source_url?: string
  external_event_id?: string
  scraped_at?: string
  created_at: string
  updated_at: string
  // Relations
  locations?: Location
  event_types?: EventType
}
