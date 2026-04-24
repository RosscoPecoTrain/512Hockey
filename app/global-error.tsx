'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#0a1628', color: 'white', textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '80px' }}>🏒</div>
        <h1 style={{ fontSize: '48px' }}>Something went wrong</h1>
        <button
          onClick={reset}
          style={{ background: '#4fc3f7', color: '#0a1628', padding: '12px 32px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer', marginTop: '20px' }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
