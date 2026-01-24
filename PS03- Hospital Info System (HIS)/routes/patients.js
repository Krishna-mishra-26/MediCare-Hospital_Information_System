const express = require('express');
const router = express.Router();
const { 
    getPatients, 
    getPatient,
    getPatientByUHID,
    createPatient, 
    updatePatient, 
    updateVitals,
    addAllergy,
    dischargePatient,
    deletePatient,
    getPatientStats,
    findDuplicates,
    mergePatients
} = require('../controllers/patients');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('patients'));

// Statistics
router.get('/stats', getPatientStats);
router.get('/stats/overview', getPatientStats);

// Duplicate management (admin only for merge)
router.post('/find-duplicates', restrictTo('receptionist', 'admin'), findDuplicates);
router.post('/merge', restrictTo('admin'), mergePatients);

// Search by UHID
router.get('/uhid/:uhid', getPatientByUHID);

// Main routes
router.route('/')
    .get(getPatients)
    .post(authorizeAction('create'), restrictTo('receptionist', 'nurse', 'doctor', 'admin'), createPatient);

router.route('/:id')
    .get(getPatient)
    .put(authorizeAction('update'), updatePatient)
    .delete(authorizeAction('delete'), restrictTo('admin'), deletePatient);

// Clinical routes
router.put('/:id/vitals', 
    restrictTo('nurse', 'doctor', 'admin'), 
    updateVitals
);

router.post('/:id/allergies', 
    restrictTo('nurse', 'doctor', 'admin'), 
    addAllergy
);

router.put('/:id/discharge', 
    restrictTo('doctor', 'admin'), 
    dischargePatient
);

module.exports = router;