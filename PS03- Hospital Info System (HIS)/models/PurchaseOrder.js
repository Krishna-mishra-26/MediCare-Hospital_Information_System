const mongoose = require('mongoose');

// Purchase Order Item Sub-schema
const POItemSchema = new mongoose.Schema({
    drug: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drug'
    },
    drugId: String,
    brandName: String,
    genericName: String,
    form: String,
    strength: String,
    packSize: Number,
    packUnit: String,
    
    orderedQuantity: {
        type: Number,
        required: true
    },
    receivedQuantity: { type: Number, default: 0 },
    pendingQuantity: Number,
    rejectedQuantity: { type: Number, default: 0 },
    
    unitPrice: {
        type: Number,
        required: true
    },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxPercentage: { type: Number, default: 12 },
    taxAmount: Number,
    totalAmount: Number,
    
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    
    remarks: String,
    itemStatus: {
        type: String,
        enum: ['Pending', 'Partial', 'Received', 'Cancelled', 'Rejected'],
        default: 'Pending'
    }
}, { _id: true });

// Purchase Order Schema
const PurchaseOrderSchema = new mongoose.Schema({
    // PO Number
    poNumber: {
        type: String,
        unique: true
    },
    
    // Vendor Information
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    vendorId: String,
    vendorName: String,
    vendorAddress: String,
    vendorContact: String,
    vendorGST: String,
    
    // PO Details
    poDate: {
        type: Date,
        default: Date.now
    },
    expectedDeliveryDate: Date,
    deliveryAddress: String,
    
    // Order Type
    orderType: {
        type: String,
        enum: ['Regular', 'Emergency', 'Indent', 'Rate Contract', 'Spot Purchase'],
        default: 'Regular'
    },
    
    // Items
    items: [POItemSchema],
    
    // Financial Summary
    subtotal: {
        type: Number,
        required: true
    },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: {
        type: Number,
        required: true
    },
    
    // Currency
    currency: { type: String, default: 'INR' },
    
    // Payment Terms
    paymentTerms: {
        creditDays: { type: Number, default: 30 },
        advancePercentage: { type: Number, default: 0 },
        advanceAmount: { type: Number, default: 0 },
        advancePaid: { type: Boolean, default: false },
        paymentMode: String
    },
    
    // Terms & Conditions
    termsAndConditions: String,
    specialInstructions: String,
    
    // Reference
    indentReference: String,
    quotationReference: String,
    rateContractReference: String,
    
    // Approval Workflow
    approvalStatus: {
        type: String,
        enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Draft'
    },
    approvalHistory: [{
        status: String,
        approvedBy: {
            userId: mongoose.Schema.Types.ObjectId,
            username: String,
            designation: String
        },
        approvedAt: Date,
        remarks: String
    }],
    currentApprover: String,
    
    // GRN References
    grnReferences: [{
        grnId: mongoose.Schema.Types.ObjectId,
        grnNumber: String,
        receivedDate: Date,
        receivedAmount: Number
    }],
    
    // Status
    status: {
        type: String,
        enum: ['Draft', 'Pending', 'Approved', 'Partial', 'Completed', 'Cancelled', 'Closed'],
        default: 'Draft'
    },
    
    // Closure
    closureDetails: {
        closedAt: Date,
        closedBy: String,
        reason: String,
        finalAmount: Number
    },
    
    // Cancellation
    cancellationDetails: {
        cancelledAt: Date,
        cancelledBy: String,
        reason: String
    },
    
    // Attachments
    attachments: [{
        name: String,
        type: String,
        url: String,
        uploadedAt: Date
    }],
    
    // Notes
    notes: String,
    internalNotes: String,
    
    // Print Details
    printCount: { type: Number, default: 0 },
    lastPrintedAt: Date,
    lastPrintedBy: String,
    
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
    department: String,
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
PurchaseOrderSchema.index({ poNumber: 1 });
PurchaseOrderSchema.index({ vendor: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ poDate: -1 });
PurchaseOrderSchema.index({ approvalStatus: 1 });

// Pre-save middleware
PurchaseOrderSchema.pre('save', async function() {
    if (!this.poNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('PurchaseOrder').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        this.poNumber = `PO${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    this.items.forEach(item => {
        const itemSubtotal = item.orderedQuantity * item.unitPrice;
        item.discountAmount = (itemSubtotal * item.discountPercentage) / 100;
        const afterDiscount = itemSubtotal - item.discountAmount;
        item.taxAmount = (afterDiscount * item.taxPercentage) / 100;
        item.totalAmount = afterDiscount + item.taxAmount;
        
        subtotal += itemSubtotal;
        totalDiscount += item.discountAmount;
        totalTax += item.taxAmount;
        
        item.pendingQuantity = item.orderedQuantity - item.receivedQuantity;
    });
    
    this.subtotal = subtotal;
    this.totalDiscount = totalDiscount;
    this.totalTax = totalTax;
    this.grandTotal = subtotal - totalDiscount + totalTax + this.shippingCharges + this.otherCharges + this.roundOff;
    
    // Update status based on items
    const allReceived = this.items.every(item => item.itemStatus === 'Received');
    const someReceived = this.items.some(item => item.receivedQuantity > 0);
    
    if (allReceived) {
        this.status = 'Completed';
    } else if (someReceived) {
        this.status = 'Partial';
    }
    
    this.updatedAt = new Date();
});

// Method to approve PO
PurchaseOrderSchema.methods.approve = function(approver, remarks) {
    this.approvalStatus = 'Approved';
    this.status = 'Approved';
    this.approvalHistory.push({
        status: 'Approved',
        approvedBy: approver,
        approvedAt: new Date(),
        remarks: remarks
    });
    this.auditTrail.push({
        action: 'APPROVED',
        performedBy: approver.username,
        performedAt: new Date(),
        details: { remarks }
    });
    return this.save();
};

// Method to cancel PO
PurchaseOrderSchema.methods.cancel = function(cancelledBy, reason) {
    this.status = 'Cancelled';
    this.approvalStatus = 'Cancelled';
    this.cancellationDetails = {
        cancelledAt: new Date(),
        cancelledBy: cancelledBy,
        reason: reason
    };
    this.auditTrail.push({
        action: 'CANCELLED',
        performedBy: cancelledBy,
        performedAt: new Date(),
        details: { reason }
    });
    return this.save();
};

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
