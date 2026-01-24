const Insurance = require('../models/Insurance');
const Patient = require('../models/Patient');

// ==================== INSURANCE POLICIES ====================

// @desc    Get all insurance policies
// @route   GET /api/insurance
// @access  Private
exports.getInsurancePolicies = async (req, res) => {
    try {
        const { patient, status, insuranceProvider, claimStatus, limit = 50 } = req.query;
        const query = {};
        
        if (patient) query.patient = patient;
        if (status) query.status = status;
        if (insuranceProvider) query.insuranceProvider = new RegExp(insuranceProvider, 'i');
        if (claimStatus) query['claims.status'] = claimStatus;
        
        const policies = await Insurance.find(query)
            .populate('patient', 'name uhid contact')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: policies.length, data: policies });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single insurance policy
// @route   GET /api/insurance/:id
// @access  Private
exports.getInsurancePolicy = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id)
            .populate('patient', 'name uhid contact dateOfBirth gender');
            
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        res.status(200).json({ success: true, data: policy });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get patient's insurance policies
// @route   GET /api/insurance/patient/:patientId
// @access  Private
exports.getPatientInsurance = async (req, res) => {
    try {
        const policies = await Insurance.find({ 
            patient: req.params.patientId,
            status: 'Active'
        }).sort({ isPrimary: -1 });
        
        res.status(200).json({ success: true, count: policies.length, data: policies });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create insurance policy
// @route   POST /api/insurance
// @access  Private
exports.createInsurancePolicy = async (req, res) => {
    try {
        const policyData = {
            ...req.body,
            createdBy: req.body.createdBy || { username: 'system' }
        };
        
        // Get patient details
        if (req.body.patient) {
            const patient = await Patient.findById(req.body.patient);
            if (patient) {
                policyData.uhid = patient.uhid;
                policyData.patientName = patient.name;
            }
        }
        
        const policy = await Insurance.create(policyData);
        
        // Update patient record
        if (policy.patient) {
            await Patient.findByIdAndUpdate(policy.patient, {
                $push: {
                    insurance: {
                        provider: policy.insuranceProvider,
                        policyNumber: policy.policyNumber,
                        membershipId: policy.membershipId,
                        insuranceId: policy._id
                    }
                }
            });
        }
        
        const io = req.app.get('io');
        io.emit('newInsurancePolicy', policy);
        
        res.status(201).json({ success: true, data: policy });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update insurance policy
// @route   PUT /api/insurance/:id
// @access  Private
exports.updateInsurancePolicy = async (req, res) => {
    try {
        const policy = await Insurance.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        res.status(200).json({ success: true, data: policy });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Verify insurance eligibility
// @route   POST /api/insurance/:id/verify
// @access  Private
exports.verifyEligibility = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        // Simulate eligibility verification
        policy.verification = {
            lastVerifiedAt: new Date(),
            verifiedBy: req.body.verifiedBy,
            verificationStatus: req.body.status || 'Verified',
            verificationMethod: req.body.method || 'Online',
            remarks: req.body.remarks,
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
        };
        
        policy.statusHistory.push({
            status: `Verification: ${req.body.status || 'Verified'}`,
            changedAt: new Date(),
            changedBy: req.body.verifiedBy || 'system',
            remarks: req.body.remarks
        });
        
        await policy.save();
        
        res.status(200).json({ success: true, data: policy });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== PRE-AUTHORIZATION ====================

// @desc    Request pre-authorization
// @route   POST /api/insurance/:id/pre-auth
// @access  Private
exports.requestPreAuth = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        const preAuth = {
            preAuthNumber: `PA${Date.now()}`,
            requestedAt: new Date(),
            requestedBy: req.body.requestedBy,
            admissionType: req.body.admissionType,
            expectedAdmissionDate: req.body.expectedAdmissionDate,
            expectedDischargeDate: req.body.expectedDischargeDate,
            estimatedCost: req.body.estimatedCost,
            requestedAmount: req.body.requestedAmount,
            status: 'Pending',
            diagnosis: req.body.diagnosis,
            icdCodes: req.body.icdCodes || [],
            procedures: req.body.procedures || [],
            packageDetails: req.body.packageDetails,
            documents: req.body.documents || []
        };
        
        policy.preAuthorizations.push(preAuth);
        policy.statusHistory.push({
            status: 'Pre-Auth Requested',
            changedAt: new Date(),
            changedBy: req.body.requestedBy || 'system',
            remarks: `Pre-auth requested for ${req.body.admissionType}`
        });
        
        await policy.save();
        
        const io = req.app.get('io');
        io.emit('preAuthRequested', { policyId: policy._id, preAuth });
        
        res.status(200).json({ 
            success: true, 
            data: policy.preAuthorizations[policy.preAuthorizations.length - 1] 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update pre-authorization status
// @route   PUT /api/insurance/:id/pre-auth/:preAuthId
// @access  Private
exports.updatePreAuth = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        const preAuth = policy.preAuthorizations.id(req.params.preAuthId);
        if (!preAuth) {
            return res.status(404).json({ success: false, error: 'Pre-authorization not found' });
        }
        
        // Update pre-auth fields
        Object.assign(preAuth, req.body);
        
        if (req.body.status === 'Approved') {
            preAuth.approvedAt = new Date();
            preAuth.approvedBy = req.body.approvedBy;
            preAuth.approvedAmount = req.body.approvedAmount;
            preAuth.validUntil = req.body.validUntil;
            
            policy.statusHistory.push({
                status: 'Pre-Auth Approved',
                changedAt: new Date(),
                changedBy: req.body.approvedBy || 'system',
                remarks: `Approved amount: ${req.body.approvedAmount}`
            });
        } else if (req.body.status === 'Rejected') {
            preAuth.rejectedAt = new Date();
            preAuth.rejectionReason = req.body.rejectionReason;
            
            policy.statusHistory.push({
                status: 'Pre-Auth Rejected',
                changedAt: new Date(),
                changedBy: req.body.updatedBy || 'system',
                remarks: req.body.rejectionReason
            });
        }
        
        await policy.save();
        
        const io = req.app.get('io');
        io.emit('preAuthUpdated', { policyId: policy._id, preAuth });
        
        res.status(200).json({ success: true, data: preAuth });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Enhance pre-authorization
// @route   POST /api/insurance/:id/pre-auth/:preAuthId/enhance
// @access  Private
exports.enhancePreAuth = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        const preAuth = policy.preAuthorizations.id(req.params.preAuthId);
        if (!preAuth) {
            return res.status(404).json({ success: false, error: 'Pre-authorization not found' });
        }
        
        preAuth.enhancements.push({
            requestedAt: new Date(),
            requestedBy: req.body.requestedBy,
            additionalAmount: req.body.additionalAmount,
            reason: req.body.reason,
            status: 'Pending'
        });
        
        policy.statusHistory.push({
            status: 'Pre-Auth Enhancement Requested',
            changedAt: new Date(),
            changedBy: req.body.requestedBy || 'system',
            remarks: `Additional amount: ${req.body.additionalAmount}`
        });
        
        await policy.save();
        
        res.status(200).json({ success: true, data: preAuth });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== CLAIMS ====================

// @desc    Submit insurance claim
// @route   POST /api/insurance/:id/claims
// @access  Private
exports.submitClaim = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        const claim = {
            claimNumber: `CLM${Date.now()}`,
            submittedAt: new Date(),
            submittedBy: req.body.submittedBy,
            claimType: req.body.claimType || 'Cashless',
            admissionId: req.body.admissionId,
            admissionDate: req.body.admissionDate,
            dischargeDate: req.body.dischargeDate,
            diagnosis: req.body.diagnosis,
            icdCodes: req.body.icdCodes || [],
            procedures: req.body.procedures || [],
            packageDetails: req.body.packageDetails,
            billDetails: {
                totalBillAmount: req.body.totalBillAmount,
                claimableAmount: req.body.claimableAmount,
                nonPayableItems: req.body.nonPayableItems || [],
                deductions: req.body.deductions || [],
                coPayAmount: req.body.coPayAmount || 0,
                patientPayable: req.body.patientPayable || 0
            },
            preAuthReference: req.body.preAuthReference,
            status: 'Submitted',
            documents: req.body.documents || []
        };
        
        policy.claims.push(claim);
        policy.statusHistory.push({
            status: 'Claim Submitted',
            changedAt: new Date(),
            changedBy: req.body.submittedBy || 'system',
            remarks: `Claim amount: ${req.body.claimableAmount}`
        });
        
        await policy.save();
        
        const io = req.app.get('io');
        io.emit('claimSubmitted', { policyId: policy._id, claim });
        
        res.status(200).json({ 
            success: true, 
            data: policy.claims[policy.claims.length - 1] 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update claim status
// @route   PUT /api/insurance/:id/claims/:claimId
// @access  Private
exports.updateClaim = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        const claim = policy.claims.id(req.params.claimId);
        if (!claim) {
            return res.status(404).json({ success: false, error: 'Claim not found' });
        }
        
        const previousStatus = claim.status;
        Object.assign(claim, req.body);
        
        if (req.body.status === 'Approved') {
            claim.approvedAt = new Date();
            claim.approvedAmount = req.body.approvedAmount;
        } else if (req.body.status === 'Rejected') {
            claim.rejectedAt = new Date();
            claim.rejectionReason = req.body.rejectionReason;
        } else if (req.body.status === 'Query') {
            claim.queries = claim.queries || [];
            claim.queries.push({
                queryDate: new Date(),
                queryDetails: req.body.queryDetails,
                queryBy: req.body.updatedBy
            });
        }
        
        policy.statusHistory.push({
            status: `Claim ${req.body.status}`,
            changedAt: new Date(),
            changedBy: req.body.updatedBy || 'system',
            remarks: req.body.remarks || `Status changed from ${previousStatus} to ${req.body.status}`
        });
        
        await policy.save();
        
        const io = req.app.get('io');
        io.emit('claimUpdated', { policyId: policy._id, claim });
        
        res.status(200).json({ success: true, data: claim });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Respond to claim query
// @route   POST /api/insurance/:id/claims/:claimId/respond-query
// @access  Private
exports.respondToQuery = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        const claim = policy.claims.id(req.params.claimId);
        if (!claim) {
            return res.status(404).json({ success: false, error: 'Claim not found' });
        }
        
        // Find latest query and respond
        if (claim.queries && claim.queries.length > 0) {
            const latestQuery = claim.queries[claim.queries.length - 1];
            latestQuery.responseDate = new Date();
            latestQuery.response = req.body.response;
            latestQuery.responseBy = req.body.responseBy;
            latestQuery.documents = req.body.documents || [];
        }
        
        claim.status = 'Resubmitted';
        
        policy.statusHistory.push({
            status: 'Claim Query Responded',
            changedAt: new Date(),
            changedBy: req.body.responseBy || 'system',
            remarks: req.body.response
        });
        
        await policy.save();
        
        res.status(200).json({ success: true, data: claim });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== SETTLEMENTS ====================

// @desc    Record settlement
// @route   POST /api/insurance/:id/claims/:claimId/settlement
// @access  Private
exports.recordSettlement = async (req, res) => {
    try {
        const policy = await Insurance.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }
        
        const claim = policy.claims.id(req.params.claimId);
        if (!claim) {
            return res.status(404).json({ success: false, error: 'Claim not found' });
        }
        
        claim.settlement = {
            settledAt: new Date(),
            settledAmount: req.body.settledAmount,
            settlementMode: req.body.settlementMode,
            transactionReference: req.body.transactionReference,
            bankDetails: req.body.bankDetails,
            tdsDeducted: req.body.tdsDeducted || 0,
            netAmountReceived: req.body.netAmountReceived,
            settledBy: req.body.settledBy,
            remarks: req.body.remarks
        };
        
        claim.status = 'Settled';
        
        policy.statusHistory.push({
            status: 'Claim Settled',
            changedAt: new Date(),
            changedBy: req.body.settledBy || 'system',
            remarks: `Settled amount: ${req.body.settledAmount}`
        });
        
        // Update utilization
        policy.utilization.totalClaimed = (policy.utilization.totalClaimed || 0) + req.body.settledAmount;
        policy.utilization.remainingBalance = policy.coverage.sumInsured - policy.utilization.totalClaimed;
        
        await policy.save();
        
        const io = req.app.get('io');
        io.emit('claimSettled', { policyId: policy._id, claim });
        
        res.status(200).json({ success: true, data: claim });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== REPORTS & STATS ====================

// @desc    Get insurance dashboard stats
// @route   GET /api/insurance/stats
// @access  Private
exports.getInsuranceStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Active policies
        const activePolicies = await Insurance.countDocuments({ status: 'Active' });
        
        // Pending pre-authorizations
        const pendingPreAuths = await Insurance.countDocuments({
            'preAuthorizations.status': 'Pending'
        });
        
        // Pending claims
        const pendingClaims = await Insurance.countDocuments({
            'claims.status': { $in: ['Submitted', 'Under Review', 'Query'] }
        });
        
        // Claims stats for current month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const monthlyStats = await Insurance.aggregate([
            { $unwind: '$claims' },
            {
                $match: {
                    'claims.submittedAt': { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: '$claims.status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$claims.billDetails.claimableAmount' }
                }
            }
        ]);
        
        // Total settled this month
        const settledThisMonth = await Insurance.aggregate([
            { $unwind: '$claims' },
            {
                $match: {
                    'claims.settlement.settledAt': { $gte: startOfMonth },
                    'claims.status': 'Settled'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSettled: { $sum: '$claims.settlement.settledAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Provider-wise claims
        const providerWise = await Insurance.aggregate([
            { $unwind: '$claims' },
            {
                $match: {
                    'claims.submittedAt': { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: '$insuranceProvider',
                    claimCount: { $sum: 1 },
                    totalClaimed: { $sum: '$claims.billDetails.claimableAmount' }
                }
            },
            { $sort: { totalClaimed: -1 } },
            { $limit: 5 }
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                activePolicies,
                pendingPreAuths,
                pendingClaims,
                monthlyStats,
                settledThisMonth: settledThisMonth[0] || { totalSettled: 0, count: 0 },
                topProviders: providerWise
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get claim aging report
// @route   GET /api/insurance/reports/aging
// @access  Private
exports.getClaimAgingReport = async (req, res) => {
    try {
        const now = new Date();
        
        const agingReport = await Insurance.aggregate([
            { $unwind: '$claims' },
            {
                $match: {
                    'claims.status': { $nin: ['Settled', 'Rejected', 'Closed'] }
                }
            },
            {
                $addFields: {
                    daysOutstanding: {
                        $dateDiff: {
                            startDate: '$claims.submittedAt',
                            endDate: now,
                            unit: 'day'
                        }
                    }
                }
            },
            {
                $addFields: {
                    agingBucket: {
                        $switch: {
                            branches: [
                                { case: { $lte: ['$daysOutstanding', 7] }, then: '0-7 days' },
                                { case: { $lte: ['$daysOutstanding', 15] }, then: '8-15 days' },
                                { case: { $lte: ['$daysOutstanding', 30] }, then: '16-30 days' },
                                { case: { $lte: ['$daysOutstanding', 60] }, then: '31-60 days' }
                            ],
                            default: '60+ days'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$agingBucket',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$claims.billDetails.claimableAmount' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        
        res.status(200).json({ success: true, data: agingReport });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get TPA-wise report
// @route   GET /api/insurance/reports/tpa-wise
// @access  Private
exports.getTPAWiseReport = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        
        const startDate = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = toDate ? new Date(toDate) : new Date();
        
        const report = await Insurance.aggregate([
            { $unwind: '$claims' },
            {
                $match: {
                    'claims.submittedAt': { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        tpa: '$tpaDetails.tpaName',
                        provider: '$insuranceProvider'
                    },
                    totalClaims: { $sum: 1 },
                    totalClaimedAmount: { $sum: '$claims.billDetails.claimableAmount' },
                    totalApprovedAmount: { $sum: '$claims.approvedAmount' },
                    totalSettledAmount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$claims.status', 'Settled'] },
                                '$claims.settlement.settledAmount',
                                0
                            ]
                        }
                    },
                    rejectedCount: {
                        $sum: {
                            $cond: [{ $eq: ['$claims.status', 'Rejected'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    tpa: '$_id.tpa',
                    provider: '$_id.provider',
                    totalClaims: 1,
                    totalClaimedAmount: 1,
                    totalApprovedAmount: 1,
                    totalSettledAmount: 1,
                    rejectedCount: 1,
                    approvalRate: {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$totalClaims', '$rejectedCount'] },
                                    { $max: ['$totalClaims', 1] }
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { totalClaimedAmount: -1 } }
        ]);
        
        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
