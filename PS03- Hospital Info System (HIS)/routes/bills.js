const express = require('express');
const { getBills, createBill, updateBill } = require('../controllers/bills');

const router = express.Router();

router.route('/').get(getBills).post(createBill);
router.route('/:id').put(updateBill);

module.exports = router;
