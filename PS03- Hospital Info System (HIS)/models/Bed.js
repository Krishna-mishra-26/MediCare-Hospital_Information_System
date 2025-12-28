const mongoose = require('mongoose');

const BedSchema = new mongoose.Schema({
    bedId: {
        type: String,
        required: true,
        unique: true
    },
    number: {
        type: String,
        required: true
    },
    ward: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ward',
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'critical', 'maintenance', 'reserved'],
        default: 'available'
    },
    patient: {
        name: String,
        diagnosis: String,
        admitDate: Date,
        doctor: String,
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient'
        }
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Bed', BedSchema);
