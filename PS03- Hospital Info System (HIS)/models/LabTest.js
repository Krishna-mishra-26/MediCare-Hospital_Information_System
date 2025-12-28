const mongoose = require('mongoose');

const LabTestSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    patientName: String,
    testType: {
        type: String,
        required: true
    },
    testCategory: {
        type: String,
        enum: ['Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Serology', 'Urine Analysis', 'Other'],
        default: 'Other'
    },
    orderedBy: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['Routine', 'Urgent', 'STAT'],
        default: 'Routine'
    },
    status: {
        type: String,
        enum: ['Pending', 'Sample Collected', 'In Progress', 'Completed'],
        default: 'Pending'
    },
    results: String,
    normalRange: String,
    unit: String,
    interpretation: {
        type: String,
        enum: ['Normal', 'Abnormal', 'Critical', '']
    },
    remarks: String,
    sampleType: {
        type: String,
        enum: ['Blood', 'Urine', 'Stool', 'Sputum', 'Swab', 'Tissue', 'CSF', 'Other'],
        default: 'Blood'
    },
    collectedAt: Date,
    reportedAt: Date,
    reportedBy: String,
    verifiedBy: String,
    orderDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LabTest', LabTestSchema);
