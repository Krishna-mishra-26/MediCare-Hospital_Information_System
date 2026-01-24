const express = require('express');
const router = express.Router();
const {
    getDrugs,
    getDrug,
    createDrug,
    updateDrug,
    recallDrug,
    getBatches,
    getExpiringBatches,
    adjustBatchStock,
    getPrescriptions,
    dispensePrescription,
    checkAllergies,
    checkInteractions,
    getStockIssues,
    createStockIssue,
    processStockReturn,
    getPharmacyStats
} = require('../controllers/pharmacy');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('pharmacy'));

// ==================== STATS ====================
router.get('/stats', getPharmacyStats);

// ==================== DRUGS ====================
router.route('/drugs')
    .get(getDrugs)
    .post(restrictTo('pharmacist', 'admin'), createDrug);

router.route('/drugs/:id')
    .get(getDrug)
    .put(restrictTo('pharmacist', 'admin'), updateDrug);

router.post('/drugs/:id/recall', restrictTo('pharmacist', 'admin'), recallDrug);

// ==================== BATCHES ====================
router.get('/batches', getBatches);
router.get('/batches/expiring', getExpiringBatches);
router.post('/batches/:id/adjust', restrictTo('pharmacist', 'admin'), adjustBatchStock);

// ==================== PRESCRIPTIONS ====================
router.get('/prescriptions', getPrescriptions);
router.post('/prescriptions/:id/dispense', restrictTo('pharmacist', 'admin'), dispensePrescription);

// ==================== SAFETY CHECKS ====================
router.post('/check-allergies', checkAllergies);
router.post('/check-interactions', checkInteractions);

// ==================== STOCK ISSUES ====================
router.route('/stock-issues')
    .get(getStockIssues)
    .post(restrictTo('pharmacist', 'nurse', 'admin'), createStockIssue);

router.post('/stock-issues/:id/return', restrictTo('pharmacist', 'admin'), processStockReturn);

module.exports = router;
