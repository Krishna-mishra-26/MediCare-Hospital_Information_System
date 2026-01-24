const express = require('express');
const { getPrescriptions, createPrescription, updatePrescription } = require('../controllers/prescriptions');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('prescriptions'));

router.route('/')
    .get(getPrescriptions)
    .post(authorizeAction('create'), restrictTo('doctor', 'admin'), createPrescription);

router.route('/:id')
    .put(authorizeAction('update'), updatePrescription);

module.exports = router;
