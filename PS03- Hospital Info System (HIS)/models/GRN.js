const mongoose = require('mongoose');

// GRN Item Sub-schema
const GRNItemSchema = new mongoose.Schema({
    // PO Item Reference
    poItem: mongoose.Schema.Types.ObjectId,
    
    // Drug Details
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
    
    // Quantities
    orderedQuantity: Number,
    receivedQuantity: {
        type: Number,
        required: true
    },
    acceptedQuantity: Number,
    rejectedQuantity: { type: Number, default: 0 },
    shortQuantity: { type: Number, default: 0 },
    excessQuantity: { type: Number, default: 0 },
    freeQuantity: { type: Number, default: 0 },
    
    // Pricing
    unitPrice: Number,
    mrp: Number,
    sellingPrice: Number,
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxPercentage: { type: Number, default: 12 },
    taxAmount: Number,
    totalAmount: Number,
    
    // Quality Check
    qualityCheck: {
        checked: { type: Boolean, default: false },
        checkedBy: String,
        checkedAt: Date,
        result: { type: String, enum: ['Approved', 'Rejected', 'Pending', ''] },
        physicalCondition: String,
        packagingCondition: String,
        labelingCheck: Boolean,
        temperatureCheck: Boolean,
        remarks: String
    },
    
    // Rejection Details
    rejectionDetails: {
        reason: String,
        rejectedBy: String,
        rejectedAt: Date,
        disposalAction: String
    },
    
    // Storage Location
    storageLocation: {
        warehouse: String,
        rack: String,
        shelf: String,
        bin: String
    },
    
    // Batch Created
    batchCreated: { type: Boolean, default: false },
    drugBatchId: mongoose.Schema.Types.ObjectId,
    
    // Barcode
    barcode: String,
    
    // Status
    itemStatus: {
        type: String,
        enum: ['Pending', 'Inspected', 'Accepted', 'Rejected', 'Partial'],
        default: 'Pending'
    },
    
    remarks: String
}, { _id: true });

// Goods Receipt Note (GRN) Schema
const GRNSchema = new mongoose.Schema({
    // GRN Number
    grnNumber: {
        type: String,
        unique: true
    },
    
    // Purchase Order Reference
    purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },
    poNumber: String,
    
    // Vendor Information
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    vendorId: String,
    vendorName: String,
    vendorInvoiceNumber: String,
    vendorInvoiceDate: Date,
    
    // Delivery Details
    deliveryDate: {
        type: Date,
        default: Date.now
    },
    deliveryChallanNumber: String,
    transporterName: String,
    vehicleNumber: String,
    lrNumber: String, // Lorry Receipt Number
    ewayBillNumber: String,
    
    // Receipt Type
    receiptType: {
        type: String,
        enum: ['Against PO', 'Direct', 'Return', 'Transfer', 'Donation', 'Sample'],
        default: 'Against PO'
    },
    
    // Items
    items: [GRNItemSchema],
    
    // Financial Summary
    subtotal: Number,
    totalDiscount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    freightCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: Number,
    
    // Quality Inspection
    qualityInspection: {
        required: { type: Boolean, default: true },
        inspectedBy: String,
        inspectedAt: Date,
        overallResult: { type: String, enum: ['Approved', 'Rejected', 'Partial', 'Pending'] },
        remarks: String
    },
    
    // Approval
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
    },
    approvedAt: Date,
    approvalRemarks: String,
    
    // Status
    status: {
        type: String,
        enum: ['Draft', 'Pending Inspection', 'Inspected', 'Approved', 'Posted', 'Cancelled'],
        default: 'Draft'
    },
    
    // Inventory Posted
    inventoryPosted: { type: Boolean, default: false },
    postedAt: Date,
    postedBy: String,
    
    // Discrepancy
    hasDiscrepancy: { type: Boolean, default: false },
    discrepancyDetails: {
        type: { type: String, enum: ['Shortage', 'Excess', 'Damage', 'Quality Issue', 'Expiry Issue', 'Wrong Item', 'Other'] },
        description: String,
        action: String,
        resolvedAt: Date,
        resolvedBy: String
    },
    
    // Return/Rejection
    returnDetails: {
        hasReturn: { type: Boolean, default: false },
        returnQuantity: Number,
        returnReason: String,
        debitNoteNumber: String,
        debitNoteDate: Date
    },
    
    // Payment Reference
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Partial', 'Paid'],
        default: 'Pending'
    },
    paymentReference: String,
    
    // Attachments
    attachments: [{
        name: String,
        type: { type: String, enum: ['Invoice', 'Challan', 'Quality Report', 'Photo', 'Other'] },
        url: String,
        uploadedAt: Date
    }],
    
    // Notes
    notes: String,
    internalRemarks: String,
    
    // Print
    printCount: { type: Number, default: 0 },
    lastPrintedAt: Date,
    
    // Audit Trail
    auditTrail: [{
        action: String,
        performedBy: String,
        performedAt: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed
    }],
    
    // Metadata
    receivedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        name: String
    },
    createdBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
    },
    department: String,
    warehouse: String,
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
GRNSchema.index({ grnNumber: 1 });
GRNSchema.index({ purchaseOrder: 1 });
GRNSchema.index({ vendor: 1 });
GRNSchema.index({ status: 1 });
GRNSchema.index({ deliveryDate: -1 });
GRNSchema.index({ vendorInvoiceNumber: 1 });

// Pre-save middleware
GRNSchema.pre('save', async function() {
    if (!this.grnNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('GRN').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        this.grnNumber = `GRN${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    this.items.forEach(item => {
        const itemSubtotal = item.acceptedQuantity * item.unitPrice;
        item.discountAmount = (itemSubtotal * item.discountPercentage) / 100;
        const afterDiscount = itemSubtotal - item.discountAmount;
        item.taxAmount = (afterDiscount * item.taxPercentage) / 100;
        item.totalAmount = afterDiscount + item.taxAmount;
        
        subtotal += itemSubtotal;
        totalDiscount += item.discountAmount;
        totalTax += item.taxAmount;
    });
    
    this.subtotal = subtotal;
    this.totalDiscount = totalDiscount;
    this.totalTax = totalTax;
    this.grandTotal = subtotal - totalDiscount + totalTax + this.freightCharges + this.otherCharges + this.roundOff;
    
    // Check for discrepancies
    this.hasDiscrepancy = this.items.some(item => 
        item.rejectedQuantity > 0 || 
        item.shortQuantity > 0 || 
        item.excessQuantity > 0
    );
    
    this.updatedAt = new Date();
});

// Method to post to inventory
GRNSchema.methods.postToInventory = async function(postedBy) {
    const DrugBatch = mongoose.model('DrugBatch');
    const PurchaseOrder = mongoose.model('PurchaseOrder');
    
    for (const item of this.items) {
        if (item.acceptedQuantity > 0 && !item.batchCreated) {
            // Create drug batch
            const batch = new DrugBatch({
                drug: item.drug,
                drugId: item.drugId,
                brandName: item.brandName,
                genericName: item.genericName,
                batchNumber: item.batchNumber,
                manufacturingDate: item.manufacturingDate,
                expiryDate: item.expiryDate,
                receivedQuantity: item.acceptedQuantity + (item.freeQuantity || 0),
                currentQuantity: item.acceptedQuantity + (item.freeQuantity || 0),
                unit: item.packSize ? 'pack' : 'unit',
                purchasePrice: item.unitPrice,
                mrp: item.mrp,
                sellingPrice: item.sellingPrice,
                grn: this._id,
                grnNumber: this.grnNumber,
                vendor: this.vendor,
                vendorName: this.vendorName,
                purchaseOrder: this.purchaseOrder,
                poNumber: this.poNumber,
                storageLocation: item.storageLocation,
                receivedBy: postedBy,
                receivedAt: new Date()
            });
            
            await batch.save();
            item.drugBatchId = batch._id;
            item.batchCreated = true;
        }
    }
    
    // Update PO if exists
    if (this.purchaseOrder) {
        const po = await PurchaseOrder.findById(this.purchaseOrder);
        if (po) {
            po.grnReferences.push({
                grnId: this._id,
                grnNumber: this.grnNumber,
                receivedDate: new Date(),
                receivedAmount: this.grandTotal
            });
            
            // Update PO item quantities
            for (const grnItem of this.items) {
                const poItem = po.items.id(grnItem.poItem);
                if (poItem) {
                    poItem.receivedQuantity += grnItem.acceptedQuantity;
                    poItem.pendingQuantity = poItem.orderedQuantity - poItem.receivedQuantity;
                    if (poItem.receivedQuantity >= poItem.orderedQuantity) {
                        poItem.itemStatus = 'Received';
                    } else if (poItem.receivedQuantity > 0) {
                        poItem.itemStatus = 'Partial';
                    }
                }
            }
            
            await po.save();
        }
    }
    
    this.inventoryPosted = true;
    this.postedAt = new Date();
    this.postedBy = postedBy;
    this.status = 'Posted';
    
    this.auditTrail.push({
        action: 'POSTED_TO_INVENTORY',
        performedBy: postedBy,
        performedAt: new Date(),
        details: { itemsPosted: this.items.length }
    });
    
    return this.save();
};

module.exports = mongoose.model('GRN', GRNSchema);
