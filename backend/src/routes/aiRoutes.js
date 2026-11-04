const express = require('express');
const { getAIInsights } = require('../controllers/aiController');

const router = express.Router();

router.get('/ai/insights', getAIInsights);

module.exports = router;
