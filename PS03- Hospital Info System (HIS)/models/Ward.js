const mongoose = require('mongoose');

const WardSchema = new mongoose.Schema({
    wardId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    prefix: {
        type: String,
        required: true,
        maxlength: 5
    },
    type: {
        type: String,
        enum: ['general', 'icu', 'private', 'semi-private', 'pediatric', 'maternity', 'emergency', 'surgical', 'orthopedic', 'cardiac', 'neuro', 'oncology'],
        default: 'general'
    },
    ratePerDay: {
        type: Number,
        default: 0
    },
    totalBeds: {
        type: Number,
        default: 0
    },
    description: String,
    floor: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ward', WardSchema);
