const express = require('express');
const { 
    getImagingOrders, 
    getImagingOrder,
    createImagingOrder, 
    updateImagingOrder,
    startImaging,
    completeImaging,
    addReport,
    getPendingReports,
    getWorklist,
    getImagingStats
} = require('../controllers/imaging');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('radiology'));

// Statistics - accessible to authorized users
router.get('/stats', getImagingStats);

// Worklist for radiology technicians
router.get('/worklist', restrictTo('radiology_technician', 'admin'), getWorklist);

// Pending reports for radiologists
router.get('/pending-reports', restrictTo('radiologist', 'admin'), getPendingReports);

// General routes
router.route('/')
    .get(getImagingOrders)
    .post(authorizeAction('create'), restrictTo('doctor', 'admin'), createImagingOrder);

router.route('/:id')
    .get(getImagingOrder)
    .put(authorizeAction('update'), updateImagingOrder);

// Radiology technician actions
router.put('/:id/start', 
    restrictTo('radiology_technician', 'admin'), 
    startImaging
);

router.put('/:id/complete', 
    restrictTo('radiology_technician', 'admin'), 
    completeImaging
);

// Radiologist actions
router.put('/:id/report', 
    restrictTo('radiologist', 'admin'), 
    addReport
);

module.exports = router;
