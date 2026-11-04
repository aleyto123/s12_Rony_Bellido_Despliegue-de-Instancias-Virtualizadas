const express = require('express');
const jwt = require('jsonwebtoken');
const { updateMatchResult } = require('../controllers/adminController');

const router = express.Router();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mundial-quiniela-secret-2026');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

router.post('/admin/matches/:id/result', requireAuth, updateMatchResult);

module.exports = router;
