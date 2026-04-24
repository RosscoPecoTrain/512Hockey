'use client'

import BoringAvatar from 'boring-avatars'

const PALETTE = ['#0a1628', '#4fc3f7', '#1a2f4a', '#81d4fa', '#0288d1']

interface AvatarProps {
  userId: string
  photoUrl?: string | null
  size?: number
  className?: string
}

export default function Avatar({ userId, photoUrl, size = 40, className = '' }: AvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt="Profile photo"
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div className={`rounded-full overflow-hidden flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <BoringAvatar
        size={size}
        name={userId}
        variant="beam"
        colors={PALETTE}
      />
    </div>
  )
}
