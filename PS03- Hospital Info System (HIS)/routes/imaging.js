const express = require('express');
const { getImagingOrders, createImagingOrder, updateImagingOrder } = require('../controllers/imaging');

const router = express.Router();

router.route('/').get(getImagingOrders).post(createImagingOrder);
router.route('/:id').put(updateImagingOrder);

module.exports = router;
