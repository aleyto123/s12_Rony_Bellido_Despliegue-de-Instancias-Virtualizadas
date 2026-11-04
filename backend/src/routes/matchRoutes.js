const express = require('express');
const jwt = require('jsonwebtoken');
const { getMatches, createPrediction, getUserPredictions, getLeaderboardGlobal, recalculateAllScores } = require('../controllers/matchController');

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

router.get('/matches', requireAuth, getMatches);
router.post('/matches/:id/predictions', requireAuth, createPrediction);
router.get('/matches/predictions/me', requireAuth, getUserPredictions);
router.get('/leaderboard/global', requireAuth, getLeaderboardGlobal);
router.post('/admin/recalculate', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  recalculateAllScores();
  res.json({ message: 'Puntajes recalculados' });
});

module.exports = router;
