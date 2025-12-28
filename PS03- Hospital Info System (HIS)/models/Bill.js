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
        required: true,
        unique: true
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

module.exports = mongoose.model('Bill', BillSchema);
