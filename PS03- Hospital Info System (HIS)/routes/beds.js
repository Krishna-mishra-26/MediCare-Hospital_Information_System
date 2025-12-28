const express = require('express');
const {
    getWards,
    createWard,
    updateWard,
    deleteWard,
    getBedStats,
    updateBed,
    assignPatient,
    dischargePatient,
    transferPatient,
    addBed,
    deleteBed
} = require('../controllers/beds');

const router = express.Router();

// Ward routes
router.route('/wards')
    .get(getWards)
    .post(createWard);

router.route('/wards/:id')
    .put(updateWard)
    .delete(deleteWard);

router.route('/wards/:id/beds')
    .post(addBed);

// Bed stats
router.get('/stats', getBedStats);

// Transfer
router.post('/transfer', transferPatient);

// Bed routes
router.route('/:wardId/:bedId')
    .put(updateBed)
    .delete(deleteBed);

router.post('/:wardId/:bedId/assign', assignPatient);
router.post('/:wardId/:bedId/discharge', dischargePatient);

module.exports = router;
