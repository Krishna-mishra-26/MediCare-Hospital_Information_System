const mongoose = require('mongoose');

const ImagingSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    patientName: String,
    imagingType: {
        type: String,
        required: true,
        enum: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Mammography', 'Fluoroscopy', 'DEXA Scan']
    },
    bodyPart: {
        type: String,
        required: true
    },
    laterality: {
        type: String,
        enum: ['Left', 'Right', 'Bilateral', 'N/A'],
        default: 'N/A'
    },
    orderedBy: {
        type: String,
        required: true
    },
    clinicalIndication: String,
    priority: {
        type: String,
        enum: ['Routine', 'Urgent', 'Emergency'],
        default: 'Routine'
    },
    status: {
        type: String,
        enum: ['Scheduled', 'In Progress', 'Completed', 'Reported', 'Cancelled'],
        default: 'Scheduled'
    },
    scheduledTime: Date,
    performedAt: Date,
    performedBy: String,
    findings: String,
    impression: String,
    recommendations: String,
    reportedBy: String,
    reportedAt: Date,
    contrastUsed: {
        type: Boolean,
        default: false
    },
    contrastType: String,
    radiationDose: String,
    images: [{
        url: String,
        description: String
    }],
    orderDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
ImagingSchema.index({ patient: 1 });
ImagingSchema.index({ status: 1 });
ImagingSchema.index({ createdAt: -1 });
ImagingSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('Imaging', ImagingSchema);
