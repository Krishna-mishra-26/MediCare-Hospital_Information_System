const express = require('express');
const router = express.Router();
const {
    getEMRRecords,
    getPatientEMRHistory,
    getEMRRecord,
    createEMRRecord,
    updateEMRRecord,
    addProgressNote,
    addDiagnosis,
    addAllergy,
    addConsent,
    generateDischargeSummary,
    getEMRHistory
} = require('../controllers/emr');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('emr'));

// EMR Records
router.route('/')
    .get(getEMRRecords)
    .post(authorizeAction('create'), restrictTo('doctor', 'nurse', 'admin'), createEMRRecord);

router.route('/:id')
    .get(getEMRRecord)
    .put(authorizeAction('update'), restrictTo('doctor', 'nurse', 'admin'), updateEMRRecord);

// Patient EMR History
router.get('/patient/:patientId', getPatientEMRHistory);

// Progress Notes - doctors and nurses can add
router.post('/:id/progress-notes', restrictTo('doctor', 'nurse', 'admin'), addProgressNote);

// Diagnosis - doctors only
router.post('/:id/diagnosis', restrictTo('doctor', 'admin'), addDiagnosis);

// Allergies - doctors and nurses
router.post('/:id/allergies', restrictTo('doctor', 'nurse', 'admin'), addAllergy);

// Consent Records - nurses and receptionists can collect
router.post('/:id/consents', restrictTo('nurse', 'receptionist', 'admin'), addConsent);

// Discharge Summary - doctors only
router.post('/:id/discharge-summary', restrictTo('doctor', 'admin'), generateDischargeSummary);

// EMR History/Versioning
router.get('/:id/history', getEMRHistory);

module.exports = router;
