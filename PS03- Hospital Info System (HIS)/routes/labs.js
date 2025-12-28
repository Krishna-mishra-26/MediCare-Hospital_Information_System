const express = require('express');
const { getLabTests, createLabTest, updateLabTest } = require('../controllers/labs');

const router = express.Router();

router.route('/').get(getLabTests).post(createLabTest);
router.route('/:id').put(updateLabTest);

module.exports = router;
