const mongoose = require('mongoose');

const SurgerySchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    patientName: String,
    procedure: {
        type: String,
        required: true
    },
    procedureCode: String,
    surgeon: {
        type: String,
        required: true
    },
    assistantSurgeon: String,
    anesthesiologist: String,
    anesthesiaType: {
        type: String,
        enum: ['General', 'Spinal', 'Epidural', 'Local', 'Regional', 'Sedation']
    },
    otRoom: {
        type: String,
        required: true
    },
    surgeryDate: {
        type: Date,
        required: true
    },
    surgeryTime: {
        type: String,
        required: true
    },
    estimatedDuration: {
        type: String,
        required: true
    },
    actualDuration: String,
    preOpDiagnosis: String,
    postOpDiagnosis: String,
    surgeryNotes: String,
    complications: String,
    bloodLoss: String,
    status: {
        type: String,
        enum: ['Scheduled', 'Pre-Op', 'In Progress', 'Post-Op', 'Completed', 'Cancelled', 'Postponed'],
        default: 'Scheduled'
    },
    priority: {
        type: String,
        enum: ['Elective', 'Urgent', 'Emergency'],
        default: 'Elective'
    },
    consent: {
        signed: Boolean,
        signedAt: Date,
        witnessedBy: String
    },
    instruments: [String],
    implants: [{
        name: String,
        serialNumber: String,
        manufacturer: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Surgery', SurgerySchema);
