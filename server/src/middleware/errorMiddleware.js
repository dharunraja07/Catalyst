export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500
  const isProd = process.env.NODE_ENV === 'production'

  if (status >= 500) {
    console.error(`[SERVER ERROR] ${req.method} ${req.path}:`, err)
  }

  const message = isProd && status >= 500
    ? 'Internal server error'
    : (err.message || 'Internal server error')

  res.status(status).json({ error: message })
}
