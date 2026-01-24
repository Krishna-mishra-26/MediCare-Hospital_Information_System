const mongoose = require('mongoose');

// Drug Batch Schema for Inventory Tracking
const DrugBatchSchema = new mongoose.Schema({
    // Batch ID
    batchId: {
        type: String,
        unique: true
    },
    
    // Drug Reference
    drug: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drug',
        required: true
    },
    drugId: String,
    brandName: String,
    genericName: String,
    
    // Batch Information
    batchNumber: {
        type: String,
        required: true
    },
    manufacturingDate: Date,
    expiryDate: {
        type: Date,
        required: true
    },
    
    // Quantity
    receivedQuantity: {
        type: Number,
        required: true
    },
    currentQuantity: {
        type: Number,
        required: true
    },
    reservedQuantity: { type: Number, default: 0 },
    availableQuantity: {
        type: Number,
        get: function() {
            return this.currentQuantity - this.reservedQuantity;
        }
    },
    unit: String,
    
    // Pricing
    purchasePrice: Number,
    mrp: Number,
    sellingPrice: Number,
    
    // GRN Reference
    grn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GRN'
    },
    grnNumber: String,
    
    // Vendor/Supplier
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    vendorName: String,
    
    // Purchase Order Reference
    purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },
    poNumber: String,
    
    // Storage Location
    storageLocation: {
        warehouse: String,
        rack: String,
        shelf: String,
        bin: String
    },
    
    // Status
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Near-Expiry', 'Recalled', 'Quarantine', 'Consumed', 'Returned'],
        default: 'Active'
    },
    
    // Expiry Alerts
    expiryAlert: {
        daysToExpiry: Number,
        alertSent: { type: Boolean, default: false },
        alertSentAt: Date
    },
    
    // Quality
    qualityCheck: {
        checked: { type: Boolean, default: false },
        checkedBy: String,
        checkedAt: Date,
        result: { type: String, enum: ['Approved', 'Rejected', 'Pending', ''] },
        remarks: String
    },
    
    // Recall Status
    isRecalled: { type: Boolean, default: false },
    recallDetails: {
        recalledAt: Date,
        reason: String,
        actionTaken: String,
        returnedQuantity: Number
    },
    
    // Transaction History
    transactions: [{
        transactionType: {
            type: String,
            enum: ['Receipt', 'Issue', 'Return', 'Adjustment', 'Transfer', 'Expired', 'Damaged', 'Recall']
        },
        quantity: Number,
        balanceAfter: Number,
        reference: String,
        referenceType: { type: String, enum: ['Prescription', 'Ward', 'OT', 'Return', 'Adjustment', 'GRN', 'Other'] },
        patient: mongoose.Schema.Types.ObjectId,
        patientName: String,
        performedBy: String,
        performedAt: { type: Date, default: Date.now },
        notes: String
    }],
    
    // Barcode
    barcode: String,
    
    // Metadata
    receivedBy: String,
    receivedAt: {
        type: Date,
        default: Date.now
    },
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
DrugBatchSchema.index({ batchId: 1 });
DrugBatchSchema.index({ drug: 1 });
DrugBatchSchema.index({ batchNumber: 1 });
DrugBatchSchema.index({ expiryDate: 1 });
DrugBatchSchema.index({ status: 1 });
DrugBatchSchema.index({ barcode: 1 });
DrugBatchSchema.index({ 'storageLocation.warehouse': 1 });
DrugBatchSchema.index({ grn: 1 });

// Virtual for days to expiry
DrugBatchSchema.virtual('daysToExpiry').get(function() {
    const today = new Date();
    const expiry = new Date(this.expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
DrugBatchSchema.pre('save', async function() {
    if (!this.batchId) {
        const count = await mongoose.model('DrugBatch').countDocuments();
        this.batchId = `BTH${String(count + 1).padStart(8, '0')}`;
    }
    
    // Update status based on expiry
    const daysToExpiry = this.daysToExpiry;
    if (daysToExpiry <= 0) {
        this.status = 'Expired';
    } else if (daysToExpiry <= 90) {
        this.status = 'Near-Expiry';
        this.expiryAlert.daysToExpiry = daysToExpiry;
    }
    
    // Update available quantity
    this.availableQuantity = this.currentQuantity - this.reservedQuantity;
    
    this.updatedAt = new Date();
});

// Method to issue stock
DrugBatchSchema.methods.issueStock = function(quantity, reference, referenceType, patientId, patientName, issuedBy, notes) {
    if (quantity > this.availableQuantity) {
        throw new Error('Insufficient stock');
    }
    
    this.currentQuantity -= quantity;
    this.transactions.push({
        transactionType: 'Issue',
        quantity: -quantity,
        balanceAfter: this.currentQuantity,
        reference: reference,
        referenceType: referenceType,
        patient: patientId,
        patientName: patientName,
        performedBy: issuedBy,
        performedAt: new Date(),
        notes: notes
    });
    
    return this.save();
};

// Method to return stock
DrugBatchSchema.methods.returnStock = function(quantity, reference, returnedBy, notes) {
    this.currentQuantity += quantity;
    this.transactions.push({
        transactionType: 'Return',
        quantity: quantity,
        balanceAfter: this.currentQuantity,
        reference: reference,
        referenceType: 'Return',
        performedBy: returnedBy,
        performedAt: new Date(),
        notes: notes
    });
    
    return this.save();
};

// Static method to get batches by FEFO (First Expiry First Out)
DrugBatchSchema.statics.getAvailableBatchesFEFO = async function(drugId, requiredQty) {
    return this.find({
        drug: drugId,
        status: { $in: ['Active', 'Near-Expiry'] },
        currentQuantity: { $gt: 0 }
    })
    .sort({ expiryDate: 1 })
    .exec();
};

// Static method to get expiring batches
DrugBatchSchema.statics.getExpiringBatches = async function(days = 90) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.find({
        expiryDate: { $lte: futureDate },
        status: { $in: ['Active', 'Near-Expiry'] },
        currentQuantity: { $gt: 0 }
    })
    .populate('drug')
    .sort({ expiryDate: 1 });
};

module.exports = mongoose.model('DrugBatch', DrugBatchSchema);
