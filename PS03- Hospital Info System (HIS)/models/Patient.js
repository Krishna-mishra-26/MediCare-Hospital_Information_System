const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    age: {
        type: Number,
        required: [true, 'Please add age']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    contact: String,
    email: String,
    address: String,
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
    },
    dateOfBirth: Date,
    aadharNumber: String,
    emergencyContact: {
        name: String,
        relation: String,
        phone: String
    },
    insurance: {
        provider: String,
        policyNumber: String,
        validTill: Date
    },
    type: {
        type: String,
        enum: ['OPD', 'IPD', 'Emergency'],
        required: true
    },
    // OPD specific
    department: String,
    doctor: String,
    appointmentTime: String,
    consultationFee: Number,
    symptoms: String,
    
    // IPD specific
    ward: String,
    bed: String,
    admissionDate: Date,
    expectedDischargeDate: Date,
    diagnosis: String,
    roomType: {
        type: String,
        enum: ['General Ward', 'Semi-Private', 'Private', 'ICU', 'NICU', 'CCU', '']
    },
    
    // Emergency specific
    severity: {
        type: String,
        enum: ['Critical', 'Urgent', 'Stable', '']
    },
    chiefComplaint: String,
    vitals: {
        bloodPressure: String,
        heartRate: String,
        temperature: String,
        oxygenSaturation: String
    },
    
    // Medical History
    allergies: [String],
    chronicConditions: [String],
    previousSurgeries: [String],
    currentMedications: [String],
    
    status: {
        type: String,
        enum: ['Active', 'Discharged', 'Transferred', 'Deceased', 'Waiting', 'Consulting', 'Completed'],
        default: 'Active'
    },
    dischargeDate: Date,
    dischargeSummary: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);