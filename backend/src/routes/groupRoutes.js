const express = require('express');
const { createGroup, joinGroup, getGroups, getGroupLeaderboard } = require('../controllers/groupController');
const { asyncHandler, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/groups', requireAuth, asyncHandler(createGroup));
router.post('/groups/join', requireAuth, asyncHandler(joinGroup));
router.get('/groups', requireAuth, asyncHandler(getGroups));
router.get('/groups/:id/leaderboard', requireAuth, asyncHandler(getGroupLeaderboard));

module.exports = router;
