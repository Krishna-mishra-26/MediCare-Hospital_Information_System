const mongoose = require('mongoose');

// Insurance Policy Sub-schema
const PolicyDetailsSchema = new mongoose.Schema({
    policyNumber: {
        type: String,
        required: true
    },
    insuranceCompany: {
        type: String,
        required: true
    },
    insuranceType: {
        type: String,
        enum: ['Individual', 'Family Floater', 'Group', 'Corporate', 'Government', 'CGHS', 'ECHS', 'ESI', 'Ayushman Bharat', 'Other'],
        required: true
    },
    
    // TPA Details
    tpaName: String,
    tpaId: String,
    tpaContact: String,
    tpaEmail: String,
    
    // Policy Period
    policyStartDate: Date,
    policyEndDate: Date,
    
    // Coverage
    sumInsured: Number,
    availableBalance: Number,
    usedAmount: { type: Number, default: 0 },
    roomRentLimit: Number,
    roomRentType: { type: String, enum: ['Per Day', 'Percentage of SI', 'As per actual', ''] },
    icuLimit: Number,
    
    // Deductibles & Co-pay
    deductible: { type: Number, default: 0 },
    copayPercentage: { type: Number, default: 0 },
    copayAmount: { type: Number, default: 0 },
    
    // Waiting Period
    waitingPeriodDays: Number,
    preExistingWaitingYears: Number,
    
    // Network
    isNetworkHospital: { type: Boolean, default: true },
    
    // Documents
    policyDocument: String,
    cardFrontImage: String,
    cardBackImage: String,
    
    // Verification
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: String,
    verificationRemarks: String,
    
    // Status
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Cancelled', 'Suspended'],
        default: 'Active'
    }
}, { _id: true });

// Pre-Authorization Item Schema
const PreAuthItemSchema = new mongoose.Schema({
    itemType: {
        type: String,
        enum: ['Room Rent', 'Procedure', 'Investigation', 'Medicine', 'Consumable', 'Doctor Fee', 'Other']
    },
    description: String,
    icdCode: String,
    procedureCode: String,
    requestedAmount: Number,
    approvedAmount: Number,
    rejectedAmount: Number,
    remarks: String,
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Partial'],
        default: 'Pending'
    }
}, { _id: true });

// Insurance Schema
const InsuranceSchema = new mongoose.Schema({
    // Insurance Record ID
    insuranceId: {
        type: String,
        unique: true
    },
    
    // Patient Reference
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    uhid: String,
    patientName: String,
    
    // Visit/Admission Reference
    visit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EMR'
    },
    visitId: String,
    admissionDate: Date,
    dischargeDate: Date,
    
    // Policy Details
    policy: PolicyDetailsSchema,
    
    // Member Details
    memberDetails: {
        memberId: String,
        memberName: String,
        relation: { type: String, enum: ['Self', 'Spouse', 'Child', 'Parent', 'Other'] },
        dateOfBirth: Date,
        employeeId: String,
        employerName: String,
        corporateCode: String
    },
    
    // ICD Coding (Mandatory)
    icdCodes: [{
        code: {
            type: String,
            required: true
        },
        description: String,
        type: { type: String, enum: ['Primary', 'Secondary', 'Complication'] },
        version: { type: String, enum: ['ICD-10', 'ICD-11'], default: 'ICD-10' }
    }],
    
    // Procedure Codes
    procedureCodes: [{
        code: String,
        description: String,
        codeType: { type: String, enum: ['CPT', 'HCPCS', 'Local', 'Package'] }
    }],
    
    // Package Mapping
    packageDetails: {
        isPackage: { type: Boolean, default: false },
        packageCode: String,
        packageName: String,
        packageAmount: Number,
        packageInclusions: [String],
        packageExclusions: [String]
    },
    
    // Pre-Authorization
    preAuthorization: {
        required: { type: Boolean, default: false },
        preAuthNumber: String,
        requestDate: Date,
        responseDate: Date,
        status: {
            type: String,
            enum: ['Not Required', 'Pending', 'Query', 'Approved', 'Rejected', 'Partial', 'Expired'],
            default: 'Pending'
        },
        requestedAmount: Number,
        approvedAmount: Number,
        validFrom: Date,
        validTill: Date,
        approvedDays: Number,
        extensionCount: { type: Number, default: 0 },
        items: [PreAuthItemSchema],
        documents: [{
            name: String,
            type: { type: String, enum: ['Medical Report', 'Investigation', 'Prescription', 'ID Proof', 'Other'] },
            url: String,
            uploadedAt: Date
        }],
        tpaRemarks: String,
        hospitalRemarks: String,
        queryDetails: [{
            query: String,
            raisedAt: Date,
            response: String,
            respondedAt: Date
        }]
    },
    
    // Enhancement Requests
    enhancements: [{
        enhancementNumber: String,
        requestDate: Date,
        requestedAmount: Number,
        approvedAmount: Number,
        reason: String,
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Partial'] },
        responseDate: Date,
        remarks: String
    }],
    
    // Claim Details
    claim: {
        claimNumber: String,
        claimType: { type: String, enum: ['Cashless', 'Reimbursement'] },
        claimDate: Date,
        status: {
            type: String,
            enum: ['Not Submitted', 'Submitted', 'Under Process', 'Query', 'Approved', 'Rejected', 'Partial', 'Settled', 'Closed'],
            default: 'Not Submitted'
        },
        totalBillAmount: Number,
        claimedAmount: Number,
        approvedAmount: Number,
        deductions: {
            nonPayables: { type: Number, default: 0 },
            copay: { type: Number, default: 0 },
            deductible: { type: Number, default: 0 },
            proportionalDeduction: { type: Number, default: 0 },
            other: { type: Number, default: 0 }
        },
        netPayable: Number,
        patientResponsibility: Number,
        submittedDocuments: [{
            documentType: String,
            documentName: String,
            submittedAt: Date
        }]
    },
    
    // Rejection Details
    rejectionDetails: {
        rejectedAt: Date,
        rejectionReason: String,
        rejectionCode: String,
        rejectionCategory: {
            type: String,
            enum: ['Policy Issue', 'Non-coverage', 'Documentation', 'Pre-existing', 'Waiting Period', 'Exclusion', 'Fraud', 'Other']
        },
        appealFiled: { type: Boolean, default: false },
        appealDetails: {
            appealDate: Date,
            appealNumber: String,
            appealStatus: String,
            appealOutcome: String
        }
    },
    
    // Settlement Details
    settlement: {
        settlementNumber: String,
        settlementDate: Date,
        settlementAmount: Number,
        paymentMode: { type: String, enum: ['NEFT', 'RTGS', 'Cheque', 'DD', 'Online'] },
        paymentReference: String,
        paymentDate: Date,
        receivedBy: String,
        tdsDeducted: Number,
        netReceived: Number,
        remarks: String
    },
    
    // Communication Log
    communicationLog: [{
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['Email', 'Phone', 'Portal', 'Letter', 'Fax'] },
        direction: { type: String, enum: ['Incoming', 'Outgoing'] },
        subject: String,
        details: String,
        contactPerson: String,
        performedBy: String
    }],
    
    // Audit Trail
    auditTrail: [{
        action: String,
        performedBy: String,
        performedAt: { type: Date, default: Date.now },
        previousValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        remarks: String
    }],
    
    // Status Timeline
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: String,
        remarks: String
    }],
    
    // Notes
    notes: String,
    internalRemarks: String,
    
    // Metadata
    createdBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
    },
    assignedTo: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        name: String
    },
    facilityId: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Indexes
InsuranceSchema.index({ insuranceId: 1 });
InsuranceSchema.index({ patient: 1 });
InsuranceSchema.index({ uhid: 1 });
InsuranceSchema.index({ 'policy.policyNumber': 1 });
InsuranceSchema.index({ 'preAuthorization.status': 1 });
InsuranceSchema.index({ 'claim.status': 1 });
InsuranceSchema.index({ 'claim.claimNumber': 1 });
InsuranceSchema.index({ createdAt: -1 });
InsuranceSchema.index({ 'icdCodes.code': 1 });

// Pre-save middleware
InsuranceSchema.pre('save', async function() {
    if (!this.insuranceId) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Insurance').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        this.insuranceId = `INS${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Validate ICD codes are present if claim is being submitted
    if (this.claim.status === 'Submitted' && (!this.icdCodes || this.icdCodes.length === 0)) {
        throw new Error('ICD codes are mandatory for claim submission');
    }
    
    // Calculate patient responsibility
    if (this.claim.approvedAmount) {
        const deductions = this.claim.deductions;
        const totalDeductions = (deductions.nonPayables || 0) + 
            (deductions.copay || 0) + 
            (deductions.deductible || 0) + 
            (deductions.proportionalDeduction || 0) + 
            (deductions.other || 0);
        
        this.claim.netPayable = this.claim.approvedAmount;
        this.claim.patientResponsibility = this.claim.totalBillAmount - this.claim.approvedAmount + totalDeductions;
    }
    
    this.updatedAt = new Date();
});

// Method to request pre-authorization
InsuranceSchema.methods.requestPreAuth = async function(requestData, requestedBy) {
    this.preAuthorization = {
        ...this.preAuthorization,
        required: true,
        requestDate: new Date(),
        status: 'Pending',
        requestedAmount: requestData.amount,
        items: requestData.items,
        documents: requestData.documents,
        hospitalRemarks: requestData.remarks
    };
    
    // Generate pre-auth number
    const count = await mongoose.model('Insurance').countDocuments({
        'preAuthorization.preAuthNumber': { $exists: true }
    });
    this.preAuthorization.preAuthNumber = `PA${Date.now().toString().slice(-8)}${String(count + 1).padStart(4, '0')}`;
    
    this.statusHistory.push({
        status: 'Pre-Auth Requested',
        changedAt: new Date(),
        changedBy: requestedBy
    });
    
    this.auditTrail.push({
        action: 'PRE_AUTH_REQUESTED',
        performedBy: requestedBy,
        performedAt: new Date(),
        newValue: { amount: requestData.amount }
    });
    
    return this.save();
};

// Method to submit claim
InsuranceSchema.methods.submitClaim = async function(claimData, submittedBy) {
    if (!this.icdCodes || this.icdCodes.length === 0) {
        throw new Error('ICD codes are mandatory for claim submission');
    }
    
    this.claim = {
        ...this.claim,
        claimType: claimData.claimType || 'Cashless',
        claimDate: new Date(),
        status: 'Submitted',
        totalBillAmount: claimData.totalBillAmount,
        claimedAmount: claimData.claimedAmount,
        submittedDocuments: claimData.documents
    };
    
    // Generate claim number
    const count = await mongoose.model('Insurance').countDocuments({
        'claim.claimNumber': { $exists: true }
    });
    this.claim.claimNumber = `CLM${Date.now().toString().slice(-8)}${String(count + 1).padStart(4, '0')}`;
    
    this.statusHistory.push({
        status: 'Claim Submitted',
        changedAt: new Date(),
        changedBy: submittedBy
    });
    
    this.auditTrail.push({
        action: 'CLAIM_SUBMITTED',
        performedBy: submittedBy,
        performedAt: new Date(),
        newValue: { claimNumber: this.claim.claimNumber, amount: claimData.claimedAmount }
    });
    
    return this.save();
};

// Static method to get pending pre-authorizations
InsuranceSchema.statics.getPendingPreAuths = async function() {
    return this.find({
        'preAuthorization.status': { $in: ['Pending', 'Query'] }
    }).populate('patient').sort({ 'preAuthorization.requestDate': -1 });
};

// Static method to get claims by status
InsuranceSchema.statics.getClaimsByStatus = async function(status) {
    return this.find({
        'claim.status': status
    }).populate('patient').sort({ 'claim.claimDate': -1 });
};

module.exports = mongoose.model('Insurance', InsuranceSchema);
