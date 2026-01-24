const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    patientName: String,
    billNumber: {
        type: String,
        required: true
    },
    items: [{
        description: String,
        quantity: Number,
        rate: Number,
        amount: Number
    }],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Partial', 'Paid'],
        default: 'Unpaid'
    },
    paymentMethod: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
BillSchema.index({ patient: 1 });
BillSchema.index({ billNumber: 1 });
BillSchema.index({ paymentStatus: 1 });
BillSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Bill', BillSchema);
