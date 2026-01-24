const express = require('express');
const { 
    getLabTests, 
    getLabTest,
    createLabTest, 
    updateLabTest,
    collectSample,
    processSample,
    enterResults,
    verifyResults,
    getPendingCollections,
    getPendingVerifications,
    getLabStats
} = require('../controllers/labs');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('lab'));

// Statistics
router.get('/stats', getLabStats);

// Worklist routes for lab technicians
router.get('/pending-collections', restrictTo('lab_technician', 'admin'), getPendingCollections);
router.get('/pending-verifications', restrictTo('lab_technician', 'admin'), getPendingVerifications);

// General routes
router.route('/')
    .get(getLabTests)
    .post(authorizeAction('create'), restrictTo('doctor', 'admin'), createLabTest);

router.route('/:id')
    .get(getLabTest)
    .put(authorizeAction('update'), updateLabTest);

// Lab technician workflow
router.put('/:id/collect', 
    restrictTo('lab_technician', 'nurse', 'admin'), 
    collectSample
);

router.put('/:id/process', 
    restrictTo('lab_technician', 'admin'), 
    processSample
);

router.put('/:id/results', 
    restrictTo('lab_technician', 'admin'), 
    enterResults
);

router.put('/:id/verify', 
    restrictTo('lab_technician', 'admin'), 
    verifyResults
);

module.exports = router;
