const express = require('express');
const { getBills, createBill, updateBill } = require('../controllers/bills');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('billing'));

router.route('/')
    .get(getBills)
    .post(authorizeAction('create'), restrictTo('billing_clerk', 'receptionist', 'admin'), createBill);

router.route('/:id')
    .put(authorizeAction('update'), restrictTo('billing_clerk', 'admin'), updateBill);

module.exports = router;
