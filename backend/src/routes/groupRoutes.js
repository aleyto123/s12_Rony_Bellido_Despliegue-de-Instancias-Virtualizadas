const express = require('express');
const jwt = require('jsonwebtoken');
const { createGroup, joinGroup, getGroups, getGroupLeaderboard } = require('../controllers/groupController');

const router = express.Router();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mundial-quiniela-secret-2026');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

router.post('/groups', requireAuth, createGroup);
router.post('/groups/join', requireAuth, joinGroup);
router.get('/groups', requireAuth, getGroups);
router.get('/groups/:id/leaderboard', requireAuth, getGroupLeaderboard);

module.exports = router;
