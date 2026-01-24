const express = require('express');
const { getSurgeries, createSurgery, updateSurgery } = require('../controllers/surgeries');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('ot'));

router.route('/')
    .get(getSurgeries)
    .post(authorizeAction('create'), restrictTo('doctor', 'admin'), createSurgery);

router.route('/:id')
    .put(authorizeAction('update'), restrictTo('doctor', 'nurse', 'admin'), updateSurgery);

module.exports = router;
