function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px', background: '#0a1628', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: '80px' }}>🏒</div>
      <h1 style={{ fontSize: '60px' }}>{statusCode || 'Error'}</h1>
      <p style={{ color: '#9ca3af', fontSize: '20px' }}>{statusCode === 404 ? 'Page not found.' : 'Something went wrong.'}</p>
      <a href="/" style={{ color: '#4fc3f7' }}>Back to 512Hockey.com</a>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }, err?: { statusCode: number } }) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404
  return { statusCode }
}

export default Error
