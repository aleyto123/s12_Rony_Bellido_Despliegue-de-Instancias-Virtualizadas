const express = require('express');
const { getAIInsights } = require('../controllers/aiController');
const { asyncHandler, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/ai/insights', requireAuth, asyncHandler(getAIInsights));

module.exports = router;
