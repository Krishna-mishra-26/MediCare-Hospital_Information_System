const express = require('express');
const router = express.Router();
const {
    getVendors,
    getVendor,
    createVendor,
    updateVendor,
    blacklistVendor,
    getPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
    updatePurchaseOrder,
    submitPurchaseOrder,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    cancelPurchaseOrder,
    getGRNs,
    getGRN,
    createGRN,
    completeQualityCheck,
    postToInventory,
    getInventoryStats,
    getLowStockReport,
    getExpiryReport,
    getStockMovementReport
} = require('../controllers/inventory');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('inventory'));

// ==================== STATS & REPORTS ====================
router.get('/stats', getInventoryStats);
router.get('/reports/low-stock', getLowStockReport);
router.get('/reports/expiry', getExpiryReport);
router.get('/reports/movement', getStockMovementReport);

// ==================== VENDORS ====================
router.route('/vendors')
    .get(getVendors)
    .post(restrictTo('inventory_manager', 'admin'), createVendor);

router.route('/vendors/:id')
    .get(getVendor)
    .put(restrictTo('inventory_manager', 'admin'), updateVendor);

router.post('/vendors/:id/blacklist', restrictTo('inventory_manager', 'admin'), blacklistVendor);

// ==================== PURCHASE ORDERS ====================
router.route('/purchase-orders')
    .get(getPurchaseOrders)
    .post(restrictTo('inventory_manager', 'pharmacist', 'admin'), createPurchaseOrder);

router.route('/purchase-orders/:id')
    .get(getPurchaseOrder)
    .put(restrictTo('inventory_manager', 'admin'), updatePurchaseOrder);

router.post('/purchase-orders/:id/submit', restrictTo('inventory_manager', 'admin'), submitPurchaseOrder);
router.post('/purchase-orders/:id/approve', restrictTo('admin'), approvePurchaseOrder);
router.post('/purchase-orders/:id/reject', restrictTo('admin'), rejectPurchaseOrder);
router.post('/purchase-orders/:id/cancel', restrictTo('inventory_manager', 'admin'), cancelPurchaseOrder);

// ==================== GOODS RECEIPT NOTES ====================
router.route('/grns')
    .get(getGRNs)
    .post(restrictTo('inventory_manager', 'admin'), createGRN);

router.get('/grns/:id', getGRN);
router.post('/grns/:id/quality-check', restrictTo('inventory_manager', 'pharmacist', 'admin'), completeQualityCheck);
router.post('/grns/:id/post-to-inventory', restrictTo('inventory_manager', 'admin'), postToInventory);

module.exports = router;
