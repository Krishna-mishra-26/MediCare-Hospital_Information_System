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
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('beds'));

// Ward routes
router.route('/wards')
    .get(getWards)
    .post(restrictTo('admin'), createWard);

router.route('/wards/:id')
    .put(restrictTo('admin'), updateWard)
    .delete(restrictTo('admin'), deleteWard);

router.route('/wards/:id/beds')
    .post(restrictTo('admin'), addBed);

// Bed stats
router.get('/stats', getBedStats);

// Transfer
router.post('/transfer', restrictTo('nurse', 'doctor', 'admin'), transferPatient);

// Bed routes
router.route('/:wardId/:bedId')
    .put(restrictTo('nurse', 'admin'), updateBed)
    .delete(restrictTo('admin'), deleteBed);

router.post('/:wardId/:bedId/assign', restrictTo('receptionist', 'nurse', 'admin'), assignPatient);
router.post('/:wardId/:bedId/discharge', restrictTo('nurse', 'doctor', 'admin'), dischargePatient);

module.exports = router;
