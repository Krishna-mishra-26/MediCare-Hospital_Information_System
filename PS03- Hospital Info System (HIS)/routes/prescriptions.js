const express = require('express');
const { getPrescriptions, createPrescription, updatePrescription } = require('../controllers/prescriptions');

const router = express.Router();

router.route('/').get(getPrescriptions).post(createPrescription);
router.route('/:id').put(updatePrescription);

module.exports = router;
