function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif', background: '#0a1628', color: 'white', minHeight: '100vh' }}>
      <div style={{ fontSize: '80px' }}>🏒</div>
      <h1 style={{ fontSize: '60px', margin: '20px 0' }}>{statusCode}</h1>
      <p style={{ fontSize: '20px', color: '#9ca3af' }}>
        {statusCode === 404 ? 'Page not found.' : 'Something went wrong.'}
      </p>
      <a href="/" style={{ color: '#4fc3f7', fontSize: '18px' }}>Back to 512Hockey.com</a>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }, err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
