const mongoose = require('mongoose');

// Version History Sub-schema
const VersionHistorySchema = new mongoose.Schema({
    version: Number,
    modifiedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        role: String
    },
    modifiedAt: {
        type: Date,
        default: Date.now
    },
    changes: mongoose.Schema.Types.Mixed,
    previousData: mongoose.Schema.Types.Mixed,
    changeReason: String,
    ipAddress: String
}, { _id: true });

// Progress Note Sub-schema
const ProgressNoteSchema = new mongoose.Schema({
    noteDate: {
        type: Date,
        default: Date.now
    },
    noteTime: String,
    noteType: {
        type: String,
        enum: ['Doctor Note', 'Nurse Note', 'Consultant Note', 'Admission Note', 'Progress Note', 'Procedure Note', 'Discharge Note', 'Handover Note', 'Night Round', 'ICU Note'],
        default: 'Progress Note'
    },
    subjective: String, // Patient's complaints/symptoms (SOAP)
    objective: String, // Clinical findings/vitals (SOAP)
    assessment: String, // Diagnosis/impression (SOAP)
    plan: String, // Treatment plan (SOAP)
    note: String, // Free text note
    vitals: {
        bloodPressure: String,
        pulseRate: Number,
        temperature: Number,
        respiratoryRate: Number,
        spo2: Number,
        bloodSugar: Number,
        painScore: Number
    },
    writtenBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        designation: String,
        department: String
    },
    cosignedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        designation: String,
        cosignedAt: Date
    },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: String,
    attachments: [{
        name: String,
        url: String,
        type: String
    }]
}, { _id: true });

// Diagnosis Sub-schema
const DiagnosisSchema = new mongoose.Schema({
    diagnosisCode: String, // ICD-10/ICD-11 code
    diagnosisDescription: String,
    diagnosisType: {
        type: String,
        enum: ['Primary', 'Secondary', 'Provisional', 'Working', 'Differential', 'Final', 'Complication']
    },
    codingSystem: {
        type: String,
        enum: ['ICD-10', 'ICD-11', 'SNOMED-CT', 'Other'],
        default: 'ICD-10'
    },
    diagnosedBy: String,
    diagnosedAt: Date,
    status: {
        type: String,
        enum: ['Active', 'Resolved', 'Chronic', 'Recurrent'],
        default: 'Active'
    },
    notes: String
}, { _id: true });

// Allergy Alert Sub-schema
const AllergyAlertSchema = new mongoose.Schema({
    allergen: {
        type: String,
        required: true
    },
    allergenType: {
        type: String,
        enum: ['Drug', 'Food', 'Environmental', 'Contrast', 'Latex', 'Other']
    },
    reaction: String,
    severity: {
        type: String,
        enum: ['Mild', 'Moderate', 'Severe', 'Life-threatening'],
        required: true
    },
    onsetDate: Date,
    verifiedAt: Date,
    verifiedBy: String,
    informedBy: String,
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Resolved'],
        default: 'Active'
    },
    notes: String
}, { _id: true });

// Clinical Alert Sub-schema
const ClinicalAlertSchema = new mongoose.Schema({
    alertType: {
        type: String,
        enum: ['Allergy', 'Drug Interaction', 'Critical Value', 'Fall Risk', 'Infection Control', 'VIP', 'DNR', 'Isolation', 'NPO', 'Restraint', 'Other']
    },
    alertMessage: String,
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: String,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    acknowledgedAt: Date,
    acknowledgedBy: String
}, { _id: true });

// Consent Record Sub-schema
const ConsentRecordSchema = new mongoose.Schema({
    consentType: {
        type: String,
        enum: ['General Treatment', 'Surgery', 'Anesthesia', 'Blood Transfusion', 'HIV Testing', 'Research', 'Photography', 'Data Sharing', 'Procedure', 'LAMA', 'DNR', 'Organ Donation', 'Other'],
        required: true
    },
    procedure: String,
    consentGivenBy: {
        name: String,
        relation: String,
        contact: String,
        idProof: String
    },
    consentTakenBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        designation: String
    },
    witnessedBy: [{
        name: String,
        designation: String
    }],
    signedAt: Date,
    documentUrl: String,
    signatureUrl: String,
    isValid: { type: Boolean, default: true },
    revokedAt: Date,
    revokedBy: String,
    revocationReason: String,
    notes: String,
    language: String
}, { _id: true });

// Medical History Sub-schema
const MedicalHistorySchema = new mongoose.Schema({
    historyType: {
        type: String,
        enum: ['Past Medical', 'Surgical', 'Family', 'Social', 'Obstetric', 'Menstrual', 'Immunization', 'Developmental']
    },
    condition: String,
    details: String,
    date: Date,
    duration: String,
    status: String,
    notes: String,
    recordedBy: String,
    recordedAt: { type: Date, default: Date.now }
}, { _id: true });

// Main EMR Schema
const EMRSchema = new mongoose.Schema({
    // Patient Reference
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    uhid: String,
    patientName: String,
    
    // Visit/Encounter Information
    visitId: {
        type: String,
        unique: true
    },
    visitType: {
        type: String,
        enum: ['OPD', 'IPD', 'Emergency', 'Daycare', 'Home Visit', 'Telemedicine'],
        required: true
    },
    encounterDate: {
        type: Date,
        default: Date.now
    },
    department: String,
    
    // Chief Complaint
    chiefComplaint: {
        complaint: String,
        duration: String,
        onset: String,
        severity: String,
        associatedSymptoms: [String],
        relievingFactors: [String],
        aggravatingFactors: [String]
    },
    
    // History of Present Illness
    historyOfPresentIllness: {
        narrative: String,
        symptoms: [{
            symptom: String,
            duration: String,
            severity: String,
            location: String,
            character: String
        }],
        timeline: String
    },
    
    // Review of Systems
    reviewOfSystems: {
        general: String,
        cardiovascular: String,
        respiratory: String,
        gastrointestinal: String,
        genitourinary: String,
        musculoskeletal: String,
        neurological: String,
        skin: String,
        psychiatric: String,
        endocrine: String,
        hematologic: String,
        other: String
    },
    
    // Medical History
    medicalHistory: [MedicalHistorySchema],
    pastMedicalHistory: String,
    pastSurgicalHistory: String,
    familyHistory: String,
    socialHistory: String,
    
    // Physical Examination
    physicalExamination: {
        generalAppearance: String,
        vitals: {
            bloodPressure: String,
            systolic: Number,
            diastolic: Number,
            pulseRate: Number,
            respiratoryRate: Number,
            temperature: Number,
            temperatureUnit: { type: String, default: '°C' },
            spo2: Number,
            height: Number,
            weight: Number,
            bmi: Number,
            painScore: Number,
            gcs: Number // Glasgow Coma Scale
        },
        head: String,
        eyes: String,
        ears: String,
        nose: String,
        throat: String,
        neck: String,
        chest: String,
        cardiovascular: String,
        respiratory: String,
        abdomen: String,
        genitourinary: String,
        musculoskeletal: String,
        neurological: String,
        skin: String,
        psychiatric: String,
        localExamination: String,
        systemicExamination: String
    },
    
    // Diagnoses
    diagnoses: [DiagnosisSchema],
    primaryDiagnosis: {
        code: String,
        description: String,
        codingSystem: String
    },
    secondaryDiagnoses: [{
        code: String,
        description: String,
        codingSystem: String
    }],
    provisionalDiagnosis: String,
    finalDiagnosis: String,
    differentialDiagnosis: [String],
    
    // ICD Coding
    icdCodes: [{
        code: String,
        description: String,
        type: { type: String, enum: ['Primary', 'Secondary', 'Complication'] },
        version: { type: String, enum: ['ICD-10', 'ICD-11'] }
    }],
    
    // Treatment Plan
    treatmentPlan: {
        summary: String,
        medications: [{
            name: String,
            dosage: String,
            frequency: String,
            route: String,
            duration: String,
            instructions: String
        }],
        procedures: [String],
        investigations: [String],
        diet: String,
        activity: String,
        precautions: String,
        referrals: [{
            department: String,
            doctor: String,
            reason: String
        }]
    },
    
    // Allergies & Alerts
    allergies: [AllergyAlertSchema],
    clinicalAlerts: [ClinicalAlertSchema],
    
    // Progress Notes
    progressNotes: [ProgressNoteSchema],
    
    // Prescriptions (Reference)
    prescriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
    }],
    
    // Lab Results (Reference)
    labResults: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LabTest'
    }],
    
    // Imaging Results (Reference)
    imagingResults: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Imaging'
    }],
    
    // Procedures
    procedures: [{
        procedureName: String,
        procedureCode: String,
        performedBy: String,
        performedAt: Date,
        findings: String,
        complications: String,
        notes: String
    }],
    
    // Consents
    consents: [ConsentRecordSchema],
    
    // Discharge Summary
    dischargeSummary: {
        admissionDate: Date,
        dischargeDate: Date,
        admissionDiagnosis: String,
        dischargeDiagnosis: String,
        proceduresDone: String,
        courseInHospital: String,
        conditionAtDischarge: {
            type: String,
            enum: ['Improved', 'Unchanged', 'Deteriorated', 'Expired', 'LAMA', 'Referred', '']
        },
        dischargeMedications: [{
            name: String,
            dosage: String,
            frequency: String,
            duration: String,
            instructions: String
        }],
        dietAdvice: String,
        activityAdvice: String,
        followUpInstructions: String,
        followUpDate: Date,
        followUpDoctor: String,
        warningSymptoms: [String],
        emergencyContact: String,
        preparedBy: String,
        verifiedBy: String,
        documentUrl: String
    },
    
    // Attending Physicians
    attendingPhysician: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        designation: String,
        department: String
    },
    consultingPhysicians: [{
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        designation: String,
        department: String,
        consultDate: Date,
        notes: String
    }],
    
    // Nurses Assigned
    assignedNurses: [{
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        shift: String,
        assignedDate: Date
    }],
    
    // Document Attachments
    attachments: [{
        name: String,
        type: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        category: {
            type: String,
            enum: ['Report', 'Image', 'Consent', 'Referral', 'ID Proof', 'Insurance', 'Previous Record', 'Other']
        }
    }],
    
    // Version History
    versionHistory: [VersionHistorySchema],
    currentVersion: {
        type: Number,
        default: 1
    },
    
    // Status
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Archived', 'Amended'],
        default: 'Active'
    },
    
    // Privacy & Access Control
    isConfidential: { type: Boolean, default: false },
    accessRestrictions: [{
        restrictedFrom: String,
        reason: String,
        restrictedBy: String,
        restrictedAt: Date
    }],
    
    // Metadata
    createdBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        role: String
    },
    lastModifiedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        role: String
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
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
EMRSchema.index({ patient: 1 });
EMRSchema.index({ uhid: 1 });
EMRSchema.index({ visitId: 1 });
EMRSchema.index({ visitType: 1, status: 1 });
EMRSchema.index({ encounterDate: -1 });
EMRSchema.index({ 'attendingPhysician.userId': 1 });
EMRSchema.index({ 'diagnoses.diagnosisCode': 1 });
EMRSchema.index({ 'icdCodes.code': 1 });
EMRSchema.index({ department: 1 });
EMRSchema.index({ createdAt: -1 });

// Pre-save middleware
EMRSchema.pre('save', async function() {
    // Generate visit ID if not exists
    if (!this.visitId) {
        const prefix = this.visitType === 'OPD' ? 'V' : this.visitType === 'IPD' ? 'A' : 'E';
        const count = await mongoose.model('EMR').countDocuments();
        this.visitId = `${prefix}${Date.now().toString().slice(-8)}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Update version on modification
    if (this.isModified() && !this.isNew) {
        this.currentVersion += 1;
    }
    
    this.updatedAt = new Date();
});

// Method to add progress note
EMRSchema.methods.addProgressNote = function(note, author) {
    this.progressNotes.push({
        ...note,
        writtenBy: author,
        noteDate: new Date()
    });
    return this.save();
};

// Method to add version history
EMRSchema.methods.addVersionHistory = function(changes, previousData, modifiedBy, reason) {
    this.versionHistory.push({
        version: this.currentVersion,
        modifiedBy: modifiedBy,
        modifiedAt: new Date(),
        changes: changes,
        previousData: previousData,
        changeReason: reason
    });
};

// Static method to get patient's complete EMR history
EMRSchema.statics.getPatientHistory = async function(patientId) {
    return this.find({ patient: patientId })
        .populate('prescriptions')
        .populate('labResults')
        .populate('imagingResults')
        .sort({ encounterDate: -1 });
};

module.exports = mongoose.model('EMR', EMRSchema);
