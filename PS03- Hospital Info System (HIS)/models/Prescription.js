const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    patientName: String,
    doctor: {
        type: String,
        required: true
    },
    medicines: [{
        name: String,
        dosage: String,
        frequency: String,
        duration: String
    }],
    instructions: String,
    status: {
        type: String,
        enum: ['Pending', 'Dispensed', 'Partial'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);
