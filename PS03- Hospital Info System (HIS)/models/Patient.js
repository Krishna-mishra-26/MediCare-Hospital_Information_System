const mongoose = require('mongoose');

// Audit Trail Sub-schema for tracking changes
const AuditTrailSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['CREATE', 'UPDATE', 'MERGE', 'TRANSFER', 'DISCHARGE', 'DELETE', 'VIEW'],
        required: true
    },
    performedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        role: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    changes: mongoose.Schema.Types.Mixed,
    previousValues: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    reason: String
}, { _id: false });

// ID Proof Sub-schema
const IDProofSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Aadhar', 'PAN', 'Passport', 'Driving License', 'Voter ID', 'Ration Card', 'Employee ID', 'Student ID', 'Other']
    },
    number: String,
    documentUrl: String,
    verifiedAt: Date,
    verifiedBy: String,
    isVerified: { type: Boolean, default: false }
}, { _id: false });

const PatientSchema = new mongoose.Schema({
    // UHID - Unique Health ID (Primary Identifier)
    uhid: {
        type: String,
        unique: true,
        sparse: true
    },
    
    // Legacy patientId for backward compatibility
    patientId: {
        type: String,
        index: true
    },
    
    // Demographics
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    firstName: String,
    middleName: String,
    lastName: String,
    
    dateOfBirth: Date,
    age: {
        type: Number,
        required: [true, 'Please add age']
    },
    ageUnit: {
        type: String,
        enum: ['Years', 'Months', 'Days'],
        default: 'Years'
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Unknown'],
        required: true
    },
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Unknown', '']
    },
    occupation: String,
    nationality: { type: String, default: 'Indian' },
    religion: String,
    
    // Contact Information
    contact: String,
    alternateContact: String,
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    address: String,
    addressDetails: {
        street: String,
        locality: String,
        city: String,
        district: String,
        state: String,
        country: { type: String, default: 'India' },
        pincode: String
    },
    
    // ID Proofs
    idProofs: [IDProofSchema],
    aadharNumber: String,
    panNumber: String,
    
    // Blood Group & Physical
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', '']
    },
    height: Number, // in cm
    weight: Number, // in kg
    
    // Emergency Contact
    emergencyContact: {
        name: String,
        relation: String,
        phone: String,
        address: String
    },
    
    // Next of Kin
    nextOfKin: {
        name: String,
        relation: String,
        phone: String,
        address: String,
        idProofType: String,
        idProofNumber: String
    },
    
    // Insurance Information (Basic - detailed in Insurance module)
    insurance: {
        hasInsurance: { type: Boolean, default: false },
        provider: String,
        policyNumber: String,
        validFrom: Date,
        validTill: Date,
        tpaName: String,
        groupId: String,
        employerId: String,
        coverageAmount: Number
    },
    
    // Registration Type
    type: {
        type: String,
        enum: ['OPD', 'IPD', 'Emergency', 'Daycare'],
        required: true
    },
    
    // Registration Status
    registrationStatus: {
        type: String,
        enum: ['Permanent', 'Temporary', 'Emergency'],
        default: 'Permanent'
    },
    
    // Temporary Registration (for emergencies)
    temporaryRegistration: {
        isTemporary: { type: Boolean, default: false },
        tempId: String,
        convertedToUHID: String,
        convertedAt: Date,
        reason: String,
        informantName: String,
        informantRelation: String,
        informantContact: String
    },
    
    // OPD specific
    department: String,
    doctor: String,
    appointmentTime: String,
    consultationFee: Number,
    symptoms: String,
    tokenNumber: String,
    visitNumber: { type: Number, default: 1 },
    
    // IPD specific
    ward: String,
    bed: String,
    admissionDate: Date,
    expectedDischargeDate: Date,
    diagnosis: String,
    roomType: {
        type: String,
        enum: ['General Ward', 'Semi-Private', 'Private', 'ICU', 'NICU', 'CCU', 'HDU', 'PICU', 'Deluxe', 'Suite', '']
    },
    attendingPhysician: String,
    admissionType: {
        type: String,
        enum: ['Elective', 'Emergency', 'Transfer', 'Referral', '']
    },
    
    // Emergency specific
    severity: {
        type: String,
        enum: ['Critical', 'Urgent', 'Stable', '']
    },
    chiefComplaint: String,
    triageCategory: {
        type: String,
        enum: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', ''] // Emergency color coding
    },
    triageScore: Number,
    triageTime: Date,
    triageNurse: String,
    modeOfArrival: {
        type: String,
        enum: ['Walk-in', 'Ambulance', 'Police', 'Referred', 'Other', '']
    },
    broughtBy: String,
    
    // Medico-Legal Case (MLC)
    isMLC: { type: Boolean, default: false },
    mlcDetails: {
        caseNumber: String,
        policeStation: String,
        ioPoliceName: String,
        ioPoliceContact: String,
        ioBadgeNumber: String,
        natureOfCase: {
            type: String,
            enum: ['Accident', 'Assault', 'Burns', 'Poisoning', 'Sexual Assault', 'Self-harm', 'Animal Bite', 'Other', '']
        },
        incidentDate: Date,
        incidentPlace: String,
        filedAt: Date,
        courtOrder: String,
        remarks: String
    },
    
    // Vitals
    vitals: {
        bloodPressure: String,
        systolic: Number,
        diastolic: Number,
        heartRate: String,
        pulseRate: Number,
        temperature: String,
        temperatureValue: Number,
        temperatureUnit: { type: String, enum: ['°C', '°F'], default: '°C' },
        oxygenSaturation: String,
        spo2: Number,
        respiratoryRate: Number,
        bmi: Number,
        painScore: { type: Number, min: 0, max: 10 },
        bloodSugar: Number,
        recordedAt: Date,
        recordedBy: String
    },
    
    // Medical History
    allergies: [{
        allergen: String,
        reaction: String,
        severity: { type: String, enum: ['Mild', 'Moderate', 'Severe', 'Life-threatening', ''] },
        verifiedAt: Date,
        verifiedBy: String,
        isActive: { type: Boolean, default: true }
    }],
    allergyAlerts: [String], // Quick access for critical allergies
    chronicConditions: [{
        condition: String,
        diagnosedDate: Date,
        currentStatus: String,
        notes: String
    }],
    previousSurgeries: [{
        procedure: String,
        date: Date,
        hospital: String,
        surgeon: String,
        notes: String
    }],
    currentMedications: [{
        name: String,
        genericName: String,
        dosage: String,
        frequency: String,
        route: String,
        startDate: Date,
        endDate: Date,
        prescribedBy: String,
        isActive: { type: Boolean, default: true }
    }],
    familyHistory: [{
        condition: String,
        relation: String,
        ageOfOnset: Number,
        notes: String
    }],
    socialHistory: {
        smoking: { type: String, enum: ['Never', 'Former', 'Current', 'Unknown', ''] },
        alcohol: { type: String, enum: ['Never', 'Occasional', 'Regular', 'Heavy', 'Unknown', ''] },
        tobaccoChewing: { type: String, enum: ['Never', 'Former', 'Current', 'Unknown', ''] },
        drugUse: String,
        diet: { type: String, enum: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', ''] },
        exercise: String,
        occupation: String,
        occupationalHazards: String
    },
    
    // Timestamps for workflow
    timestamps: {
        arrival: Date,
        registration: Date,
        triageStart: Date,
        triageEnd: Date,
        consultStart: Date,
        consultEnd: Date,
        treatmentStart: Date,
        treatmentEnd: Date,
        admission: Date,
        discharge: Date
    },
    
    // Status
    status: {
        type: String,
        enum: ['Active', 'Discharged', 'Transferred', 'Deceased', 'Waiting', 'Consulting', 'Completed', 'LAMA', 'Absconded', 'Referred', 'Admitted', 'Under Observation'],
        default: 'Active'
    },
    
    // Discharge Information
    dischargeDate: Date,
    dischargeSummary: String,
    dischargeType: {
        type: String,
        enum: ['Normal', 'LAMA', 'DAMA', 'Transfer', 'Absconded', 'Death', 'Referred', '']
    },
    dischargeInstructions: String,
    followUpDate: Date,
    followUpDoctor: String,
    followUpDepartment: String,
    deathDetails: {
        dateTime: Date,
        cause: String,
        certifiedBy: String,
        certificateNumber: String
    },
    
    // Patient Merge Information
    mergedWith: {
        uhid: String,
        mergedAt: Date,
        mergedBy: String,
        reason: String
    },
    mergedFrom: [{
        uhid: String,
        mergedAt: Date,
        oldRecordSummary: String
    }],
    isMerged: { type: Boolean, default: false },
    
    // Duplicate Detection
    duplicateFlags: [{
        potentialDuplicateUHID: String,
        matchScore: Number,
        matchCriteria: [String],
        flaggedAt: Date,
        resolvedAt: Date,
        resolution: { type: String, enum: ['Merged', 'Not Duplicate', 'Pending', ''] },
        resolvedBy: String
    }],
    
    // Photo
    photoUrl: String,
    photoBase64: String,
    
    // Consent
    generalConsent: {
        signed: { type: Boolean, default: false },
        signedAt: Date,
        witnessedBy: String,
        documentUrl: String
    },
    treatmentConsent: {
        signed: { type: Boolean, default: false },
        signedAt: Date,
        procedures: [String],
        witnessedBy: String
    },
    
    // Referral Information
    referredBy: {
        type: { type: String, enum: ['Doctor', 'Hospital', 'Self', 'Camp', 'Corporate', 'Other', ''] },
        name: String,
        hospitalName: String,
        contact: String,
        referralNote: String,
        referralDate: Date
    },
    referredTo: {
        hospital: String,
        doctor: String,
        department: String,
        reason: String,
        referralDate: Date,
        referralLetter: String
    },
    
    // Visit History Summary
    visitHistory: [{
        visitDate: Date,
        visitType: String,
        department: String,
        doctor: String,
        diagnosis: String,
        visitId: mongoose.Schema.Types.ObjectId
    }],
    totalVisits: { type: Number, default: 1 },
    lastVisitDate: Date,
    
    // Financial Summary
    financialSummary: {
        totalBilled: { type: Number, default: 0 },
        totalPaid: { type: Number, default: 0 },
        totalDue: { type: Number, default: 0 },
        depositAmount: { type: Number, default: 0 }
    },
    
    // Audit Trail
    auditTrail: [AuditTrailSchema],
    
    // Tags/Labels for quick identification
    tags: [String],
    vipStatus: { type: Boolean, default: false },
    
    // Metadata
    createdBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
    },
    updatedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
    },
    registrationLocation: String,
    sourceOfRegistration: {
        type: String,
        enum: ['Walk-in', 'Online', 'Phone', 'Camp', 'Referral', 'Transfer', 'Emergency', 'Other'],
        default: 'Walk-in'
    },
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

// Indexes for better query performance
PatientSchema.index({ uhid: 1 });
PatientSchema.index({ patientId: 1 });
PatientSchema.index({ type: 1, status: 1 });
PatientSchema.index({ name: 'text', contact: 'text', aadharNumber: 'text', uhid: 'text' });
PatientSchema.index({ 'temporaryRegistration.tempId': 1 });
PatientSchema.index({ createdAt: -1 });
PatientSchema.index({ contact: 1 });
PatientSchema.index({ aadharNumber: 1 });
PatientSchema.index({ isMLC: 1 });
PatientSchema.index({ triageCategory: 1 });
PatientSchema.index({ department: 1 });
PatientSchema.index({ doctor: 1 });
PatientSchema.index({ 'insurance.policyNumber': 1 });
PatientSchema.index({ dateOfBirth: 1, name: 1 });

// Virtual for full name
PatientSchema.virtual('fullName').get(function() {
    if (this.firstName) {
        return `${this.firstName || ''} ${this.middleName || ''} ${this.lastName || ''}`.trim();
    }
    return this.name;
});

// Virtual for age from DOB
PatientSchema.virtual('calculatedAge').get(function() {
    if (this.dateOfBirth) {
        const today = new Date();
        const birth = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }
    return this.age;
});

// Pre-save middleware to generate UHID
PatientSchema.pre('save', async function() {
    if (!this.uhid && this.registrationStatus !== 'Temporary') {
        // Generate UHID: MCPH + Year + Timestamp-based unique ID
        const year = new Date().getFullYear().toString().slice(-2);
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.uhid = `MCPH${year}${timestamp}${random}`;
    }
    
    // Generate temporary ID for emergency registrations
    if (this.registrationStatus === 'Temporary' && !this.temporaryRegistration.tempId) {
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.temporaryRegistration.isTemporary = true;
        this.temporaryRegistration.tempId = `TEMP${Date.now().toString().slice(-6)}${random}`;
    }
    
    // Update timestamps
    this.updatedAt = new Date();
    
    // Split name into parts if not already done
    if (this.name && !this.firstName) {
        const nameParts = this.name.split(' ');
        this.firstName = nameParts[0] || '';
        this.lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';
        if (nameParts.length > 2) {
            this.middleName = nameParts.slice(1, -1).join(' ');
        }
    }
    
    // Calculate BMI if height and weight are provided
    if (this.height && this.weight) {
        const heightInMeters = this.height / 100;
        this.vitals.bmi = Math.round((this.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
});

// Static method for duplicate detection
PatientSchema.statics.findPotentialDuplicates = async function(patientData) {
    const duplicates = [];
    
    // Check by Aadhar
    if (patientData.aadharNumber) {
        const aadharMatch = await this.find({ 
            aadharNumber: patientData.aadharNumber,
            isMerged: false 
        });
        duplicates.push(...aadharMatch.map(p => ({
            patient: p,
            matchCriteria: ['Aadhar Number'],
            matchScore: 100
        })));
    }
    
    // Check by contact + name
    if (patientData.contact && patientData.name) {
        const contactNameMatch = await this.find({
            contact: patientData.contact,
            name: new RegExp(patientData.name.split(' ')[0], 'i'),
            isMerged: false
        });
        duplicates.push(...contactNameMatch.map(p => ({
            patient: p,
            matchCriteria: ['Contact', 'Name'],
            matchScore: 85
        })));
    }
    
    // Check by DOB + name + gender
    if (patientData.dateOfBirth && patientData.name && patientData.gender) {
        const dobNameMatch = await this.find({
            dateOfBirth: patientData.dateOfBirth,
            gender: patientData.gender,
            name: new RegExp(patientData.name.split(' ')[0], 'i'),
            isMerged: false
        });
        duplicates.push(...dobNameMatch.map(p => ({
            patient: p,
            matchCriteria: ['Date of Birth', 'Name', 'Gender'],
            matchScore: 80
        })));
    }
    
    // Remove duplicates from results
    const uniqueDuplicates = duplicates.filter((item, index, self) =>
        index === self.findIndex((t) => t.patient._id.toString() === item.patient._id.toString())
    );
    
    return uniqueDuplicates;
};

// Static method for patient merge
PatientSchema.statics.mergePatients = async function(primaryUHID, secondaryUHID, mergedBy, reason) {
    const primary = await this.findOne({ uhid: primaryUHID });
    const secondary = await this.findOne({ uhid: secondaryUHID });
    
    if (!primary || !secondary) {
        throw new Error('One or both patients not found');
    }
    
    // Update primary with merged from info
    primary.mergedFrom.push({
        uhid: secondaryUHID,
        mergedAt: new Date(),
        oldRecordSummary: `Name: ${secondary.name}, Visits: ${secondary.totalVisits || 1}`
    });
    
    // Merge visit history
    if (secondary.visitHistory && secondary.visitHistory.length > 0) {
        primary.visitHistory = [...(primary.visitHistory || []), ...secondary.visitHistory];
    }
    primary.totalVisits = (primary.totalVisits || 1) + (secondary.totalVisits || 1) - 1;
    
    // Merge allergies
    if (secondary.allergies && secondary.allergies.length > 0) {
        const existingAllergens = (primary.allergies || []).map(a => a.allergen?.toLowerCase());
        secondary.allergies.forEach(allergy => {
            if (!existingAllergens.includes(allergy.allergen?.toLowerCase())) {
                primary.allergies.push(allergy);
            }
        });
    }
    
    // Mark secondary as merged
    secondary.isMerged = true;
    secondary.mergedWith = {
        uhid: primaryUHID,
        mergedAt: new Date(),
        mergedBy: mergedBy,
        reason: reason
    };
    secondary.status = 'Discharged';
    
    // Add audit trail
    const auditEntry = {
        action: 'MERGE',
        performedBy: { username: mergedBy },
        timestamp: new Date(),
        changes: { mergedFrom: secondaryUHID },
        reason: reason
    };
    
    primary.auditTrail.push(auditEntry);
    secondary.auditTrail.push({
        ...auditEntry,
        changes: { mergedInto: primaryUHID }
    });
    
    await primary.save();
    await secondary.save();
    
    return primary;
};

// Static method for converting temporary to permanent registration
PatientSchema.statics.convertToPermanent = async function(tempId, additionalData, convertedBy) {
    const patient = await this.findOne({ 'temporaryRegistration.tempId': tempId });
    
    if (!patient) {
        throw new Error('Temporary registration not found');
    }
    
    // Generate UHID
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.countDocuments({ uhid: { $exists: true, $ne: null } });
    const newUHID = `MCPH${year}${String(count + 1).padStart(6, '0')}`;
    
    // Update patient
    patient.uhid = newUHID;
    patient.registrationStatus = 'Permanent';
    patient.temporaryRegistration.convertedToUHID = newUHID;
    patient.temporaryRegistration.convertedAt = new Date();
    patient.temporaryRegistration.isTemporary = false;
    
    // Merge additional data
    Object.assign(patient, additionalData);
    
    // Add audit trail
    patient.auditTrail.push({
        action: 'UPDATE',
        performedBy: { username: convertedBy },
        timestamp: new Date(),
        changes: { convertedFromTemp: tempId, newUHID: newUHID },
        reason: 'Converted from temporary to permanent registration'
    });
    
    await patient.save();
    return patient;
};

module.exports = mongoose.model('Patient', PatientSchema);