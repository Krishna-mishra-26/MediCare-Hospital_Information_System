const mongoose = require('mongoose');

// Triage Schema for Emergency Department workflow
const TriageSchema = new mongoose.Schema({
    // Triage ID
    triageId: {
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
    
    // Visit Reference
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    emr: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EMR'
    },
    
    // Arrival Information
    arrivalMode: {
        type: String,
        enum: ['Walk-in', 'Ambulance', 'Police', 'Referred', 'Brought by Family', 'Self', 'Other'],
        required: true
    },
    arrivalTime: {
        type: Date,
        default: Date.now
    },
    broughtBy: {
        name: String,
        relation: String,
        contact: String
    },
    referredFrom: {
        hospital: String,
        doctor: String,
        referralNote: String
    },
    
    // Triage Color Code (Emergency Severity Index / Manchester Triage)
    triageCategory: {
        type: String,
        enum: ['Red', 'Orange', 'Yellow', 'Green', 'Blue'],
        required: true
    },
    triageLevel: {
        type: Number,
        min: 1,
        max: 5
    },
    triageCategoryDescription: {
        type: String,
        enum: ['Immediate/Resuscitation', 'Very Urgent', 'Urgent', 'Standard', 'Non-Urgent']
    },
    
    // Triage Score (ESI or other scoring)
    triageScore: {
        esi: Number, // Emergency Severity Index (1-5)
        news: Number, // National Early Warning Score
        pews: Number, // Pediatric Early Warning Score
        mews: Number, // Modified Early Warning Score
        gcs: Number, // Glasgow Coma Scale (3-15)
        apacheII: Number, // For ICU
        sofa: Number // Sequential Organ Failure Assessment
    },
    
    // Chief Complaint
    chiefComplaint: {
        type: String,
        required: true
    },
    presentingComplaints: [String],
    symptomDuration: String,
    symptomOnset: String,
    
    // Vital Signs at Triage
    vitals: {
        bloodPressure: String,
        systolic: Number,
        diastolic: Number,
        map: Number, // Mean Arterial Pressure
        heartRate: Number,
        pulseRate: Number,
        respiratoryRate: Number,
        temperature: Number,
        temperatureUnit: { type: String, enum: ['°C', '°F'], default: '°C' },
        spo2: Number,
        bloodSugar: {
            value: Number,
            type: { type: String, enum: ['Random', 'Fasting', 'PP'] }
        },
        painScore: { type: Number, min: 0, max: 10 },
        gcs: {
            eye: { type: Number, min: 1, max: 4 },
            verbal: { type: Number, min: 1, max: 5 },
            motor: { type: Number, min: 1, max: 6 },
            total: { type: Number, min: 3, max: 15 }
        },
        pupilResponse: {
            left: { type: String, enum: ['Reactive', 'Sluggish', 'Fixed', 'Dilated', ''] },
            right: { type: String, enum: ['Reactive', 'Sluggish', 'Fixed', 'Dilated', ''] }
        },
        weight: Number,
        height: Number
    },
    
    // Quick Assessment
    airway: {
        status: { type: String, enum: ['Patent', 'Partially Obstructed', 'Obstructed', 'Intubated', 'Tracheostomy'] },
        intervention: String
    },
    breathing: {
        status: { type: String, enum: ['Normal', 'Labored', 'Shallow', 'Absent', 'Assisted'] },
        oxygenSupport: {
            type: { type: String, enum: ['None', 'Nasal Cannula', 'Face Mask', 'Non-Rebreather', 'BiPAP', 'Ventilator'] },
            flowRate: Number
        }
    },
    circulation: {
        status: { type: String, enum: ['Normal', 'Poor', 'Shock', 'Arrested'] },
        capillaryRefill: String,
        skinCondition: String,
        peripheralPulse: String
    },
    disability: {
        consciousness: { type: String, enum: ['Alert', 'Verbal', 'Pain', 'Unresponsive'] }, // AVPU
        mobility: { type: String, enum: ['Ambulatory', 'Wheelchair', 'Stretcher', 'Bed-bound'] }
    },
    exposure: {
        injuries: [String],
        wounds: [String],
        notes: String
    },
    
    // Allergies (Critical Alert)
    allergies: [{
        allergen: String,
        severity: String
    }],
    allergyAlertDisplayed: { type: Boolean, default: false },
    
    // Medico-Legal Case
    isMLC: { type: Boolean, default: false },
    mlcDetails: {
        caseType: {
            type: String,
            enum: ['Road Traffic Accident', 'Assault', 'Burns', 'Poisoning', 'Sexual Assault', 'Self-harm', 'Animal Bite', 'Industrial Accident', 'Drowning', 'Hanging', 'Firearm', 'Other']
        },
        policeInformed: { type: Boolean, default: false },
        policeStation: String,
        policeOfficerName: String,
        policeOfficerContact: String,
        mlcNumber: String,
        incidentDate: Date,
        incidentTime: String,
        incidentPlace: String,
        briefHistory: String,
        injuries: [String],
        alcoholSmell: { type: Boolean, default: false },
        intoxicationStatus: String,
        evidenceCollected: [String],
        remarks: String
    },
    
    // Initial Actions
    initialActions: [{
        action: String,
        performedBy: String,
        performedAt: Date,
        notes: String
    }],
    
    // Triage Disposition
    disposition: {
        type: String,
        enum: ['Resuscitation', 'Emergency Treatment', 'Observation', 'Fast Track', 'OPD Referral', 'Admission', 'ICU', 'OT', 'Discharge', 'LAMA', 'Referred', 'Expired']
    },
    dispositionArea: String,
    assignedBed: String,
    assignedDoctor: String,
    
    // Timestamps
    timestamps: {
        arrival: { type: Date, default: Date.now },
        triageStart: Date,
        triageEnd: Date,
        seenByDoctor: Date,
        treatmentStart: Date,
        disposition: Date
    },
    
    // Wait Times
    waitTime: {
        toTriage: Number, // minutes from arrival
        toDoctor: Number, // minutes from triage to doctor
        toTreatment: Number,
        total: Number
    },
    
    // Triage Nurse
    triageNurse: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        employeeId: String
    },
    
    // Reassessment
    reassessments: [{
        reassessedAt: Date,
        reassessedBy: String,
        previousCategory: String,
        newCategory: String,
        reason: String,
        vitals: mongoose.Schema.Types.Mixed,
        notes: String
    }],
    
    // Status
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed', 'Re-triaged'],
        default: 'Pending'
    },
    
    // Notes
    triageNotes: String,
    nurseNotes: String,
    
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
}, {
    timestamps: true
});

// Indexes
TriageSchema.index({ triageId: 1 });
TriageSchema.index({ patient: 1 });
TriageSchema.index({ uhid: 1 });
TriageSchema.index({ triageCategory: 1 });
TriageSchema.index({ arrivalTime: -1 });
TriageSchema.index({ status: 1 });
TriageSchema.index({ isMLC: 1 });
TriageSchema.index({ disposition: 1 });

// Pre-save middleware
TriageSchema.pre('save', async function() {
    // Generate triage ID
    if (!this.triageId) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Triage').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        this.triageId = `TRI${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Auto-calculate triage category based on vitals and scores
    if (!this.triageCategory && this.vitals) {
        this.triageCategory = this.calculateTriageCategory();
    }
    
    // Set triage level description
    const categoryDescriptions = {
        'Red': 'Immediate/Resuscitation',
        'Orange': 'Very Urgent',
        'Yellow': 'Urgent',
        'Green': 'Standard',
        'Blue': 'Non-Urgent'
    };
    this.triageCategoryDescription = categoryDescriptions[this.triageCategory];
    
    // Calculate wait times
    if (this.timestamps.triageStart && this.timestamps.arrival) {
        this.waitTime.toTriage = Math.round((this.timestamps.triageStart - this.timestamps.arrival) / 60000);
    }
    if (this.timestamps.seenByDoctor && this.timestamps.triageEnd) {
        this.waitTime.toDoctor = Math.round((this.timestamps.seenByDoctor - this.timestamps.triageEnd) / 60000);
    }
    
    this.updatedAt = new Date();
});

// Method to calculate triage category
TriageSchema.methods.calculateTriageCategory = function() {
    const vitals = this.vitals;
    
    // Critical indicators - RED
    if (
        vitals.spo2 < 90 ||
        vitals.systolic < 90 ||
        vitals.gcs?.total < 9 ||
        vitals.respiratoryRate < 8 || vitals.respiratoryRate > 30 ||
        this.airway?.status === 'Obstructed' ||
        this.breathing?.status === 'Absent' ||
        this.circulation?.status === 'Arrested' ||
        this.disability?.consciousness === 'Unresponsive'
    ) {
        return 'Red';
    }
    
    // Very Urgent - ORANGE
    if (
        vitals.spo2 < 94 ||
        vitals.systolic < 100 ||
        vitals.heartRate > 130 ||
        vitals.gcs?.total < 13 ||
        vitals.painScore >= 8 ||
        vitals.temperature > 39 ||
        this.disability?.consciousness === 'Pain'
    ) {
        return 'Orange';
    }
    
    // Urgent - YELLOW
    if (
        vitals.heartRate > 110 ||
        vitals.systolic > 180 ||
        vitals.painScore >= 5 ||
        vitals.temperature > 38.5 ||
        this.disability?.consciousness === 'Verbal'
    ) {
        return 'Yellow';
    }
    
    // Standard - GREEN
    if (
        vitals.painScore >= 3 ||
        vitals.temperature > 38
    ) {
        return 'Green';
    }
    
    // Non-Urgent - BLUE
    return 'Blue';
};

// Static method to get queue by triage category
TriageSchema.statics.getEmergencyQueue = async function() {
    return this.aggregate([
        {
            $match: {
                status: { $in: ['Pending', 'In Progress'] },
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
        },
        {
            $group: {
                _id: '$triageCategory',
                count: { $sum: 1 },
                patients: { $push: '$$ROOT' }
            }
        },
        {
            $sort: {
                _id: 1 // Red first
            }
        }
    ]);
};

module.exports = mongoose.model('Triage', TriageSchema);
