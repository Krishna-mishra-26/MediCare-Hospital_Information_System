const mongoose = require('mongoose');

// Drug/Medicine Master Schema
const DrugSchema = new mongoose.Schema({
    // Drug ID
    drugId: {
        type: String,
        unique: true
    },
    
    // Drug Names
    brandName: {
        type: String,
        required: true
    },
    genericName: {
        type: String,
        required: true
    },
    composition: String,
    
    // Classification
    drugClass: {
        type: String,
        enum: ['Antibiotic', 'Analgesic', 'Antihypertensive', 'Antidiabetic', 'Antihistamine', 'Antacid', 'Cardiovascular', 'CNS', 'Respiratory', 'GI', 'Dermatological', 'Ophthalmic', 'Hormonal', 'Immunosuppressant', 'Chemotherapy', 'Vaccine', 'IV Fluid', 'Surgical', 'Other']
    },
    therapeuticClass: String,
    pharmacologicalClass: String,
    
    // Drug Form
    form: {
        type: String,
        enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Suspension', 'Gel', 'Suppository', 'Patch', 'Spray', 'Lotion', 'IV Fluid', 'Other'],
        required: true
    },
    
    // Strength & Packaging
    strength: String,
    strengthUnit: String,
    packSize: Number,
    packUnit: String,
    
    // Route of Administration
    route: {
        type: String,
        enum: ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Rectal', 'Vaginal', 'Ophthalmic', 'Otic', 'Nasal', 'Sublingual', 'Transdermal', 'Other']
    },
    
    // Manufacturer
    manufacturer: {
        name: String,
        country: String,
        license: String
    },
    
    // Scheduling
    schedule: {
        type: String,
        enum: ['H', 'H1', 'X', 'G', 'OTC', 'Narcotic', 'Psychotropic', ''] // Drug schedules
    },
    isControlled: { type: Boolean, default: false },
    requiresPrescription: { type: Boolean, default: true },
    
    // Storage
    storageConditions: {
        type: String,
        enum: ['Room Temperature', 'Refrigerated', 'Frozen', 'Cool & Dry', 'Light Protected', 'Humidity Controlled']
    },
    storageTemperature: {
        min: Number,
        max: Number,
        unit: { type: String, default: '°C' }
    },
    
    // Pricing
    mrp: Number,
    purchasePrice: Number,
    sellingPrice: Number,
    gstPercentage: { type: Number, default: 12 },
    
    // Reorder
    reorderLevel: { type: Number, default: 10 },
    reorderQuantity: { type: Number, default: 100 },
    minStockLevel: Number,
    maxStockLevel: Number,
    
    // Interactions & Warnings
    contraindications: [String],
    sideEffects: [String],
    drugInteractions: [{
        drug: String,
        interactionType: { type: String, enum: ['Major', 'Moderate', 'Minor'] },
        description: String
    }],
    foodInteractions: [String],
    warnings: [String],
    blackBoxWarning: String,
    
    // Allergy Cross-Reference
    allergenGroups: [String], // e.g., ['Penicillin', 'Sulfa']
    crossAllergy: [String], // Other drugs that may cause cross-allergy
    
    // Usage Instructions
    defaultDosage: String,
    defaultFrequency: String,
    defaultDuration: String,
    specialInstructions: String,
    
    // Barcode
    barcode: String,
    hsCode: String, // Harmonized System Code
    
    // Status
    isActive: { type: Boolean, default: true },
    isDiscontinued: { type: Boolean, default: false },
    discontinuedDate: Date,
    discontinuedReason: String,
    
    // Drug Recall
    isRecalled: { type: Boolean, default: false },
    recallDetails: {
        recallDate: Date,
        recallReason: String,
        recallBatches: [String],
        recalledBy: String,
        actionTaken: String
    },
    
    // Substitutes
    substitutes: [{
        drugId: mongoose.Schema.Types.ObjectId,
        brandName: String,
        genericName: String,
        isPreferred: Boolean
    }],
    
    // Metadata
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
DrugSchema.index({ drugId: 1 });
DrugSchema.index({ brandName: 'text', genericName: 'text' });
DrugSchema.index({ genericName: 1 });
DrugSchema.index({ drugClass: 1 });
DrugSchema.index({ barcode: 1 });
DrugSchema.index({ isActive: 1 });
DrugSchema.index({ allergenGroups: 1 });

// Pre-save middleware
DrugSchema.pre('save', async function() {
    if (!this.drugId) {
        const count = await mongoose.model('Drug').countDocuments();
        this.drugId = `DRG${String(count + 1).padStart(6, '0')}`;
    }
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Drug', DrugSchema);
