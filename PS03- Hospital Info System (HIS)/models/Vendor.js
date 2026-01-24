const mongoose = require('mongoose');

// Vendor/Supplier Schema
const VendorSchema = new mongoose.Schema({
    // Vendor ID
    vendorId: {
        type: String,
        unique: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Manufacturer', 'Distributor', 'Wholesaler', 'Importer', 'Local Supplier', 'Other'],
        default: 'Distributor'
    },
    category: {
        type: String,
        enum: ['Pharmaceutical', 'Medical Supplies', 'Equipment', 'Consumables', 'Lab Supplies', 'Surgical', 'General', 'Other']
    },
    
    // Contact Information
    contactPerson: {
        name: String,
        designation: String,
        phone: String,
        email: String
    },
    phone: String,
    alternatePhone: String,
    email: String,
    website: String,
    
    // Address
    address: {
        street: String,
        city: String,
        state: String,
        country: { type: String, default: 'India' },
        pincode: String
    },
    
    // Registration & Licenses
    registrationNumber: String,
    gstNumber: String,
    panNumber: String,
    drugLicense: {
        number: String,
        validTill: Date,
        type: { type: String, enum: ['Retail', 'Wholesale', 'Manufacturing', 'Import', ''] }
    },
    fssaiLicense: String,
    
    // Banking Details
    bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        accountType: String,
        branchName: String
    },
    
    // Credit Terms
    creditTerms: {
        creditPeriod: { type: Number, default: 30 }, // days
        creditLimit: Number,
        currentOutstanding: { type: Number, default: 0 },
        discountPercentage: Number,
        paymentTerms: String
    },
    
    // Performance Metrics
    performance: {
        totalOrders: { type: Number, default: 0 },
        ordersDeliveredOnTime: { type: Number, default: 0 },
        qualityRating: { type: Number, min: 0, max: 5 },
        serviceRating: { type: Number, min: 0, max: 5 },
        lastOrderDate: Date,
        totalPurchaseValue: { type: Number, default: 0 }
    },
    
    // Products/Categories Supplied
    productsSupplied: [String],
    specializations: [String],
    
    // Documents
    documents: [{
        documentType: String,
        documentUrl: String,
        uploadedAt: Date,
        validTill: Date
    }],
    
    // Status
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Blacklisted', 'Pending Approval'],
        default: 'Active'
    },
    blacklistReason: String,
    blacklistedAt: Date,
    
    // Verification
    isVerified: { type: Boolean, default: false },
    verifiedBy: String,
    verifiedAt: Date,
    
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
VendorSchema.index({ vendorId: 1 });
VendorSchema.index({ name: 'text' });
VendorSchema.index({ gstNumber: 1 });
VendorSchema.index({ status: 1 });
VendorSchema.index({ category: 1 });

// Pre-save middleware
VendorSchema.pre('save', async function() {
    if (!this.vendorId) {
        const count = await mongoose.model('Vendor').countDocuments();
        this.vendorId = `VND${String(count + 1).padStart(5, '0')}`;
    }
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Vendor', VendorSchema);
