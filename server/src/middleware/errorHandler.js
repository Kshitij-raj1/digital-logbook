// Turns any error into a JSON response. Errors made with HttpError carry their own status code.
export function errorHandler(err, _req, res, _next) {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });

  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
}
