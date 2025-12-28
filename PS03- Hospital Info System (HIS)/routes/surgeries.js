const express = require('express');
const { getSurgeries, createSurgery, updateSurgery } = require('../controllers/surgeries');

const router = express.Router();

router.route('/').get(getSurgeries).post(createSurgery);
router.route('/:id').put(updateSurgery);

module.exports = router;
