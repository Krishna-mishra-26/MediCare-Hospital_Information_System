const mongoose = require('mongoose');

// Stock Issue Item Sub-schema
const StockIssueItemSchema = new mongoose.Schema({
    drug: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drug'
    },
    drugId: String,
    brandName: String,
    genericName: String,
    
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DrugBatch'
    },
    batchNumber: String,
    expiryDate: Date,
    
    requestedQuantity: Number,
    issuedQuantity: {
        type: Number,
        required: true
    },
    returnedQuantity: { type: Number, default: 0 },
    
    unitPrice: Number,
    totalAmount: Number,
    
    storageLocation: {
        warehouse: String,
        rack: String,
        shelf: String
    },
    
    remarks: String,
    itemStatus: {
        type: String,
        enum: ['Issued', 'Partial', 'Returned', 'Consumed'],
        default: 'Issued'
    }
}, { _id: true });

// Stock Issue Schema
const StockIssueSchema = new mongoose.Schema({
    // Issue Number
    issueNumber: {
        type: String,
        unique: true
    },
    
    // Issue Type
    issueType: {
        type: String,
        enum: ['Patient', 'Ward', 'OT', 'Emergency', 'Department', 'Transfer', 'Wastage', 'Sample', 'Other'],
        required: true
    },
    
    // Patient Reference (if applicable)
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    },
    uhid: String,
    patientName: String,
    
    // Prescription Reference (if applicable)
    prescription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
    },
    prescriptionId: String,
    
    // Ward/Department Reference
    issuedTo: {
        type: { type: String, enum: ['Patient', 'Ward', 'OT', 'Department', 'External', 'Other'] },
        name: String,
        code: String
    },
    
    // Request Reference
    requestNumber: String,
    requestedBy: String,
    requestDate: Date,
    
    // Items
    items: [StockIssueItemSchema],
    
    // Financial Summary
    totalItems: Number,
    totalQuantity: Number,
    totalAmount: Number,
    
    // Issue Details
    issueDate: {
        type: Date,
        default: Date.now
    },
    issuedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        name: String
    },
    
    // Received By
    receivedBy: {
        name: String,
        designation: String,
        signature: String,
        receivedAt: Date
    },
    
    // Return Information
    hasReturn: { type: Boolean, default: false },
    returnDetails: [{
        returnDate: Date,
        returnedBy: String,
        items: [{
            drug: mongoose.Schema.Types.ObjectId,
            batchNumber: String,
            quantity: Number,
            reason: String,
            condition: { type: String, enum: ['Good', 'Damaged', 'Expired', 'Other'] }
        }],
        totalReturnQuantity: Number,
        returnNumber: String,
        remarks: String
    }],
    
    // Consumption Tracking (for ward issues)
    consumption: {
        tracked: { type: Boolean, default: false },
        consumedQuantity: Number,
        remainingQuantity: Number,
        lastUpdated: Date
    },
    
    // Status
    status: {
        type: String,
        enum: ['Draft', 'Issued', 'Partial Return', 'Fully Returned', 'Cancelled'],
        default: 'Draft'
    },
    
    // Billing
    billing: {
        billed: { type: Boolean, default: false },
        billId: mongoose.Schema.Types.ObjectId,
        billNumber: String,
        billedAmount: Number
    },
    
    // Notes
    notes: String,
    internalRemarks: String,
    
    // Audit Trail
    auditTrail: [{
        action: String,
        performedBy: String,
        performedAt: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed
    }],
    
    // Metadata
    createdBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
    },
    fromWarehouse: String,
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
StockIssueSchema.index({ issueNumber: 1 });
StockIssueSchema.index({ patient: 1 });
StockIssueSchema.index({ prescription: 1 });
StockIssueSchema.index({ issueType: 1 });
StockIssueSchema.index({ issueDate: -1 });
StockIssueSchema.index({ status: 1 });

// Pre-save middleware
StockIssueSchema.pre('save', async function() {
    if (!this.issueNumber) {
        const prefix = this.issueType === 'Patient' ? 'ISS' : this.issueType === 'Ward' ? 'WIS' : 'SIS';
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('StockIssue').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        this.issueNumber = `${prefix}${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Calculate totals
    let totalQty = 0;
    let totalAmt = 0;
    
    this.items.forEach(item => {
        item.totalAmount = item.issuedQuantity * (item.unitPrice || 0);
        totalQty += item.issuedQuantity;
        totalAmt += item.totalAmount;
    });
    
    this.totalItems = this.items.length;
    this.totalQuantity = totalQty;
    this.totalAmount = totalAmt;
    
    this.updatedAt = new Date();
});

// Method to issue stock and update batches
StockIssueSchema.methods.issueStock = async function(issuedBy) {
    const DrugBatch = mongoose.model('DrugBatch');
    
    for (const item of this.items) {
        if (item.batch) {
            const batch = await DrugBatch.findById(item.batch);
            if (batch) {
                await batch.issueStock(
                    item.issuedQuantity,
                    this.issueNumber,
                    this.issueType,
                    this.patient,
                    this.patientName,
                    issuedBy,
                    item.remarks
                );
            }
        }
    }
    
    this.status = 'Issued';
    this.issuedBy = { username: issuedBy };
    this.issueDate = new Date();
    
    this.auditTrail.push({
        action: 'ISSUED',
        performedBy: issuedBy,
        performedAt: new Date(),
        details: { totalItems: this.totalItems, totalQuantity: this.totalQuantity }
    });
    
    return this.save();
};

// Method to process return
StockIssueSchema.methods.processReturn = async function(returnData, returnedBy) {
    const DrugBatch = mongoose.model('DrugBatch');
    
    const returnItems = [];
    let totalReturnQty = 0;
    
    for (const returnItem of returnData.items) {
        const item = this.items.find(i => 
            i.batchNumber === returnItem.batchNumber && 
            i.drug.toString() === returnItem.drug.toString()
        );
        
        if (item && returnItem.quantity <= (item.issuedQuantity - item.returnedQuantity)) {
            // Update batch
            if (returnItem.condition === 'Good') {
                const batch = await DrugBatch.findById(item.batch);
                if (batch) {
                    await batch.returnStock(returnItem.quantity, this.issueNumber, returnedBy, returnItem.reason);
                }
            }
            
            item.returnedQuantity += returnItem.quantity;
            totalReturnQty += returnItem.quantity;
            
            if (item.returnedQuantity >= item.issuedQuantity) {
                item.itemStatus = 'Returned';
            }
            
            returnItems.push(returnItem);
        }
    }
    
    // Generate return number
    const returnCount = this.returnDetails.length + 1;
    
    this.returnDetails.push({
        returnDate: new Date(),
        returnedBy: returnedBy,
        items: returnItems,
        totalReturnQuantity: totalReturnQty,
        returnNumber: `${this.issueNumber}-R${returnCount}`,
        remarks: returnData.remarks
    });
    
    this.hasReturn = true;
    
    // Check if fully returned
    const allReturned = this.items.every(item => item.returnedQuantity >= item.issuedQuantity);
    this.status = allReturned ? 'Fully Returned' : 'Partial Return';
    
    this.auditTrail.push({
        action: 'RETURN_PROCESSED',
        performedBy: returnedBy,
        performedAt: new Date(),
        details: { returnQuantity: totalReturnQty }
    });
    
    return this.save();
};

module.exports = mongoose.model('StockIssue', StockIssueSchema);
