const express = require('express');
const router = express.Router();
const {
    getInsurancePolicies,
    getInsurancePolicy,
    getPatientInsurance,
    createInsurancePolicy,
    updateInsurancePolicy,
    verifyEligibility,
    requestPreAuth,
    updatePreAuth,
    enhancePreAuth,
    submitClaim,
    updateClaim,
    respondToQuery,
    recordSettlement,
    getInsuranceStats,
    getClaimAgingReport,
    getTPAWiseReport
} = require('../controllers/insurance');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('insurance'));

// ==================== STATS & REPORTS ====================
router.get('/stats/summary', getInsuranceStats);
router.get('/reports/aging', getClaimAgingReport);
router.get('/reports/tpa-wise', getTPAWiseReport);

// ==================== POLICIES ====================
router.route('/')
    .get(getInsurancePolicies)
    .post(restrictTo('insurance_coordinator', 'receptionist', 'admin'), createInsurancePolicy);

router.route('/:id')
    .get(getInsurancePolicy)
    .put(restrictTo('insurance_coordinator', 'admin'), updateInsurancePolicy);

// Patient Insurance
router.get('/patient/:patientId', getPatientInsurance);

// Eligibility Verification
router.post('/:id/verify', restrictTo('insurance_coordinator', 'receptionist', 'admin'), verifyEligibility);

// ==================== PRE-AUTHORIZATION ====================
router.post('/:id/pre-auth', restrictTo('insurance_coordinator', 'admin'), requestPreAuth);
router.put('/:id/pre-auth/:preAuthId', restrictTo('insurance_coordinator', 'admin'), updatePreAuth);
router.post('/:id/pre-auth/:preAuthId/enhance', restrictTo('insurance_coordinator', 'admin'), enhancePreAuth);

// ==================== CLAIMS ====================
router.post('/:id/claims', restrictTo('insurance_coordinator', 'billing_clerk', 'admin'), submitClaim);
router.put('/:id/claims/:claimId', restrictTo('insurance_coordinator', 'admin'), updateClaim);
router.post('/:id/claims/:claimId/respond-query', restrictTo('insurance_coordinator', 'admin'), respondToQuery);
router.post('/:id/claims/:claimId/settlement', restrictTo('insurance_coordinator', 'billing_clerk', 'admin'), recordSettlement);

module.exports = router;
