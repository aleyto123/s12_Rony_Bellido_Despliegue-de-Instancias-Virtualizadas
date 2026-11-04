const express = require('express');
const { getMatches, createPrediction, getUserPredictions, getLeaderboardGlobal, recalculateAllScores } = require('../controllers/matchController');
const { asyncHandler, requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/matches', requireAuth, asyncHandler(getMatches));
router.post('/matches/:id/predictions', requireAuth, asyncHandler(createPrediction));
router.get('/matches/predictions/me', requireAuth, asyncHandler(getUserPredictions));
router.get('/leaderboard/global', requireAuth, asyncHandler(getLeaderboardGlobal));
router.post('/admin/recalculate', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await recalculateAllScores();
  res.json({ message: 'Puntajes recalculados.' });
}));

module.exports = router;
