const express = require('express');
const router = express.Router();
const {
    getTriageRecords,
    getTriageRecord,
    createTriageRecord,
    updateTriageRecord,
    completeTriage,
    retriagePatient,
    getEmergencyQueue,
    getMLCCases,
    getTriageStats
} = require('../controllers/triage');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('triage'));

// Emergency Queue - access to emergency staff
router.get('/queue/emergency', getEmergencyQueue);

// MLC Cases
router.get('/mlc/cases', getMLCCases);

// Statistics
router.get('/stats/summary', getTriageStats);

// Triage Records
router.route('/')
    .get(getTriageRecords)
    .post(authorizeAction('create'), restrictTo('nurse', 'doctor', 'admin'), createTriageRecord);

router.route('/:id')
    .get(getTriageRecord)
    .put(authorizeAction('update'), restrictTo('nurse', 'doctor', 'admin'), updateTriageRecord);

// Triage Actions - nurses and doctors
router.post('/:id/complete', restrictTo('nurse', 'doctor', 'admin'), completeTriage);
router.post('/:id/re-triage', restrictTo('doctor', 'admin'), retriagePatient);

module.exports = router;
