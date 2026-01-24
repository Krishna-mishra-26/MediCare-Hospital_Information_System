const mongoose = require('mongoose');

// Medicine Item Sub-schema
const MedicineItemSchema = new mongoose.Schema({
    drug: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drug'
    },
    drugId: String,
    name: {
        type: String,
        required: true
    },
    genericName: String,
    brandName: String,
    form: String,
    strength: String,
    dosage: {
        type: String,
        required: true
    },
    frequency: {
        type: String,
        required: true
    },
    route: {
        type: String,
        enum: ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Rectal', 'Vaginal', 'Ophthalmic', 'Otic', 'Nasal', 'Sublingual', 'Other'],
        default: 'Oral'
    },
    duration: String,
    durationDays: Number,
    quantity: Number,
    quantityUnit: String,
    timing: {
        beforeFood: Boolean,
        afterFood: Boolean,
        withFood: Boolean,
        morning: Boolean,
        afternoon: Boolean,
        evening: Boolean,
        night: Boolean,
        sos: Boolean // As needed
    },
    instructions: String,
    startDate: Date,
    endDate: Date,
    
    // Dispensing Information
    dispensed: { type: Boolean, default: false },
    dispensedQuantity: { type: Number, default: 0 },
    pendingQuantity: Number,
    batchesUsed: [{
        batchId: mongoose.Schema.Types.ObjectId,
        batchNumber: String,
        quantity: Number,
        expiryDate: Date
    }],
    dispensedAt: Date,
    dispensedBy: String,
    
    // Substitution
    substitutionAllowed: { type: Boolean, default: true },
    substitutedWith: {
        drugId: mongoose.Schema.Types.ObjectId,
        name: String,
        reason: String
    },
    
    // Alerts
    allergyAlert: { type: Boolean, default: false },
    interactionAlert: { type: Boolean, default: false },
    alerts: [{
        alertType: { type: String, enum: ['Allergy', 'Interaction', 'Duplicate', 'Contraindication', 'Dosage'] },
        severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
        message: String,
        overridden: Boolean,
        overriddenBy: String,
        overrideReason: String
    }],
    
    // Cost
    unitPrice: Number,
    totalPrice: Number,
    
    // Status
    itemStatus: {
        type: String,
        enum: ['Pending', 'Partial', 'Dispensed', 'Cancelled', 'Out of Stock', 'Substituted'],
        default: 'Pending'
    }
}, { _id: true });

// Administration Record Sub-schema
const AdministrationRecordSchema = new mongoose.Schema({
    medicine: {
        name: String,
        dosage: String
    },
    scheduledTime: Date,
    actualTime: Date,
    dose: String,
    route: String,
    administeredBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        designation: String,
        signature: String
    },
    witnessedBy: {
        name: String,
        signature: String
    },
    status: {
        type: String,
        enum: ['Scheduled', 'Administered', 'Missed', 'Refused', 'Held', 'Delayed'],
        default: 'Scheduled'
    },
    holdReason: String,
    refusalReason: String,
    patientResponse: String,
    vitalsBefore: mongoose.Schema.Types.Mixed,
    vitalsAfter: mongoose.Schema.Types.Mixed,
    notes: String,
    batchNumber: String
}, { _id: true });

const PrescriptionSchema = new mongoose.Schema({
    // Prescription ID
    prescriptionId: {
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
    patientAge: Number,
    patientGender: String,
    patientWeight: Number,
    patientAllergies: [String],
    
    // Visit/Encounter Reference
    visit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EMR'
    },
    visitId: String,
    visitType: {
        type: String,
        enum: ['OPD', 'IPD', 'Emergency', 'Daycare']
    },
    
    // Prescriber Information
    doctor: {
        type: String,
        required: true
    },
    doctorId: mongoose.Schema.Types.ObjectId,
    doctorRegistrationNo: String,
    doctorSpecialization: String,
    doctorSignature: String,
    department: String,
    
    // Prescription Type
    prescriptionType: {
        type: String,
        enum: ['Regular', 'Discharge', 'Emergency', 'Controlled', 'IV', 'PRN'],
        default: 'Regular'
    },
    
    // Medicines
    medicines: [MedicineItemSchema],
    
    // Diagnosis
    diagnosis: String,
    icdCode: String,
    
    // Instructions
    instructions: String,
    dietaryAdvice: String,
    precautions: String,
    
    // Validity
    prescriptionDate: {
        type: Date,
        default: Date.now
    },
    validTill: Date,
    isValidForRefill: { type: Boolean, default: false },
    refillsAllowed: { type: Number, default: 0 },
    refillsUsed: { type: Number, default: 0 },
    
    // Allergy & Interaction Checks
    allergyCheckDone: { type: Boolean, default: false },
    allergyAlerts: [{
        drug: String,
        allergen: String,
        severity: String,
        acknowledged: Boolean,
        acknowledgedBy: String
    }],
    interactionCheckDone: { type: Boolean, default: false },
    drugInteractions: [{
        drug1: String,
        drug2: String,
        severity: String,
        description: String,
        acknowledged: Boolean,
        acknowledgedBy: String
    }],
    
    // Dispensing Status
    status: {
        type: String,
        enum: ['Pending', 'Partial', 'Dispensed', 'Cancelled', 'Expired', 'On Hold'],
        default: 'Pending'
    },
    dispensingNotes: String,
    
    // Pharmacy Processing
    pharmacy: {
        receivedAt: Date,
        receivedBy: String,
        processedAt: Date,
        processedBy: String,
        verifiedAt: Date,
        verifiedBy: String,
        dispensedAt: Date,
        dispensedBy: String,
        pharmacistSignature: String,
        remarks: String
    },
    
    // Administration Records (for IPD)
    administrationRecords: [AdministrationRecordSchema],
    
    // Billing
    billing: {
        billGenerated: { type: Boolean, default: false },
        billId: mongoose.Schema.Types.ObjectId,
        billNumber: String,
        totalAmount: Number,
        paidAmount: Number,
        paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Waived', ''] }
    },
    
    // Insurance
    insurance: {
        claimed: { type: Boolean, default: false },
        claimId: String,
        approvedAmount: Number,
        coveredMedicines: [String]
    },
    
    // Print Details
    printed: { type: Boolean, default: false },
    printCount: { type: Number, default: 0 },
    lastPrintedAt: Date,
    lastPrintedBy: String,
    
    // Status History
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: String,
        reason: String
    }],
    
    // Notes
    internalNotes: String,
    pharmacistNotes: String,
    
    // Metadata
    createdBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
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

// Indexes for better query performance
PrescriptionSchema.index({ prescriptionId: 1 });
PrescriptionSchema.index({ patient: 1 });
PrescriptionSchema.index({ uhid: 1 });
PrescriptionSchema.index({ status: 1 });
PrescriptionSchema.index({ createdAt: -1 });
PrescriptionSchema.index({ doctor: 1 });
PrescriptionSchema.index({ prescriptionDate: -1 });
PrescriptionSchema.index({ 'medicines.drug': 1 });

// Pre-save middleware
PrescriptionSchema.pre('save', async function() {
    if (!this.prescriptionId) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Prescription').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        this.prescriptionId = `RX${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Set validity (default 7 days for regular prescriptions)
    if (!this.validTill) {
        const validityDays = this.prescriptionType === 'Controlled' ? 3 : 7;
        this.validTill = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
    }
    
    // Check if prescription has expired
    if (new Date() > this.validTill && this.status === 'Pending') {
        this.status = 'Expired';
    }
    
    // Update overall status based on medicine statuses
    if (this.medicines && this.medicines.length > 0) {
        const dispensedCount = this.medicines.filter(m => m.itemStatus === 'Dispensed').length;
        const pendingCount = this.medicines.filter(m => m.itemStatus === 'Pending').length;
        
        if (dispensedCount === this.medicines.length) {
            this.status = 'Dispensed';
        } else if (dispensedCount > 0 || pendingCount < this.medicines.length) {
            this.status = 'Partial';
        }
    }
    
    this.updatedAt = new Date();
});

// Method to check drug allergies
PrescriptionSchema.methods.checkAllergies = async function(patientAllergies) {
    const Drug = mongoose.model('Drug');
    const alerts = [];
    
    for (const medicine of this.medicines) {
        if (medicine.drug) {
            const drug = await Drug.findById(medicine.drug);
            if (drug && drug.allergenGroups) {
                for (const allergen of drug.allergenGroups) {
                    if (patientAllergies.includes(allergen)) {
                        alerts.push({
                            drug: medicine.name,
                            allergen: allergen,
                            severity: 'High',
                            acknowledged: false
                        });
                        medicine.allergyAlert = true;
                    }
                }
            }
        }
    }
    
    this.allergyAlerts = alerts;
    this.allergyCheckDone = true;
    return alerts;
};

// Method to check drug interactions
PrescriptionSchema.methods.checkInteractions = async function() {
    const Drug = mongoose.model('Drug');
    const interactions = [];
    
    const medicines = this.medicines;
    for (let i = 0; i < medicines.length; i++) {
        for (let j = i + 1; j < medicines.length; j++) {
            if (medicines[i].drug && medicines[j].drug) {
                const drug1 = await Drug.findById(medicines[i].drug);
                if (drug1 && drug1.drugInteractions) {
                    const interaction = drug1.drugInteractions.find(
                        int => int.drug.toLowerCase() === medicines[j].genericName?.toLowerCase()
                    );
                    if (interaction) {
                        interactions.push({
                            drug1: medicines[i].name,
                            drug2: medicines[j].name,
                            severity: interaction.interactionType,
                            description: interaction.description,
                            acknowledged: false
                        });
                        medicines[i].interactionAlert = true;
                        medicines[j].interactionAlert = true;
                    }
                }
            }
        }
    }
    
    this.drugInteractions = interactions;
    this.interactionCheckDone = true;
    return interactions;
};

// Method to dispense medicines
PrescriptionSchema.methods.dispenseMedicines = async function(dispensingData, dispensedBy) {
    for (const item of dispensingData) {
        const medicine = this.medicines.id(item.medicineId);
        if (medicine) {
            medicine.dispensedQuantity = (medicine.dispensedQuantity || 0) + item.quantity;
            medicine.batchesUsed = [...(medicine.batchesUsed || []), ...item.batches];
            medicine.dispensedAt = new Date();
            medicine.dispensedBy = dispensedBy;
            
            if (medicine.dispensedQuantity >= medicine.quantity) {
                medicine.itemStatus = 'Dispensed';
                medicine.dispensed = true;
            } else {
                medicine.itemStatus = 'Partial';
            }
        }
    }
    
    this.pharmacy.dispensedAt = new Date();
    this.pharmacy.dispensedBy = dispensedBy;
    
    // Add to status history
    this.statusHistory.push({
        status: this.status,
        changedAt: new Date(),
        changedBy: dispensedBy,
        reason: 'Medicines dispensed'
    });
    
    return this.save();
};

module.exports = mongoose.model('Prescription', PrescriptionSchema);
