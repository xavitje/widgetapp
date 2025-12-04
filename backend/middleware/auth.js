// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-change-me';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';

  // Verwacht: Authorization: Bearer <token>
  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ msg: 'Geen of ongeldige authorization header.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Zet user info op req, inclusief customerId
    req.user = {
      id: payload.sub,
      email: payload.email,
      customerId: payload.customerId,
      role: payload.role,
    };

    next();
  } catch (err) {
    console.error('JWT verify error:', err);
    return res.status(401).json({ msg: 'Ongeldige of verlopen token.' });
  }
}

module.exports = authMiddleware;
