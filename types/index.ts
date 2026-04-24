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
  preferred_rinks?: string[]
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

export interface Rink {
  id: string
  name: string
  address?: string
  city?: string
  website_url?: string
  booking_url?: string
  description?: string
  created_at: string
  updated_at: string
}
