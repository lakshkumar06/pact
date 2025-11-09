// Auth0 middleware removed. This file remains as a harmless placeholder to avoid
// import errors from other modules. The application uses local JWTs stored in
// sessions/localStorage for authentication.

export function verifyAuth0Token(req, res, next) {
  return res.status(410).json({ error: 'Auth0 integration removed' });
}
