const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7);

  if (!token) {
    return res.status(401).json({ error: 'Access token required', code: 401 });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 401 });
    }
    return res.status(401).json({ error: 'Invalid token', code: 401 });
  }
};

module.exports = { verifyToken };
