const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboard');
const { protect } = require('../middleware/auth');

// Dashboard accessible to all authenticated users
router.get('/stats', protect, getDashboardStats);

module.exports = router;