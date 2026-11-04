const express = require('express');
const { createMatch, updateMatchResult, updateMatchStatus } = require('../controllers/adminController');
const { asyncHandler, requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use('/admin', requireAuth, requireAdmin);
router.post('/admin/matches', asyncHandler(createMatch));
router.patch('/admin/matches/:id/status', asyncHandler(updateMatchStatus));
router.post('/admin/matches/:id/result', asyncHandler(updateMatchResult));

module.exports = router;
