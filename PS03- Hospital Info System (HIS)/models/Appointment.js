const mongoose = require('mongoose');

// Appointment Schema for scheduling and workflow management
const AppointmentSchema = new mongoose.Schema({
    // Appointment ID
    appointmentId: {
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
    patientContact: String,
    patientAge: Number,
    patientGender: String,
    
    // Appointment Type
    appointmentType: {
        type: String,
        enum: ['New', 'Follow-up', 'Review', 'Referral', 'Emergency', 'Procedure', 'Consultation', 'Second Opinion', 'Pre-operative', 'Post-operative', 'Telemedicine'],
        default: 'New'
    },
    
    // Visit Type
    visitType: {
        type: String,
        enum: ['OPD', 'IPD', 'Emergency', 'Daycare'],
        required: true
    },
    
    // Department & Doctor
    department: {
        type: String,
        required: true
    },
    doctor: {
        type: String,
        required: true
    },
    doctorId: mongoose.Schema.Types.ObjectId,
    alternateDoctor: String,
    
    // Scheduling
    appointmentDate: {
        type: Date,
        required: true
    },
    appointmentTime: {
        type: String,
        required: true
    },
    slotNumber: Number,
    slotDuration: {
        type: Number,
        default: 15 // minutes
    },
    estimatedStartTime: Date,
    estimatedEndTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,
    
    // Token System
    tokenNumber: String,
    queuePosition: Number,
    
    // Timestamps for workflow tracking
    timestamps: {
        booked: { type: Date, default: Date.now },
        confirmed: Date,
        arrived: Date,
        checkedIn: Date,
        triageStart: Date,
        triageEnd: Date,
        waitingStart: Date,
        consultStart: Date,
        consultEnd: Date,
        completed: Date,
        cancelled: Date,
        noShow: Date
    },
    
    // Wait Time Tracking
    waitTime: {
        beforeTriage: Number, // minutes
        afterTriage: Number,
        totalWait: Number
    },
    
    // Consultation Details
    consultationFee: {
        type: Number,
        default: 0
    },
    feesPaid: {
        type: Boolean,
        default: false
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Card', 'UPI', 'Insurance', 'Credit', 'Waived', '']
    },
    receiptNumber: String,
    
    // Chief Complaint & Symptoms
    chiefComplaint: String,
    symptoms: [String],
    reasonForVisit: String,
    
    // Priority & Urgency
    priority: {
        type: String,
        enum: ['Normal', 'Urgent', 'Emergency', 'VIP'],
        default: 'Normal'
    },
    
    // Status
    status: {
        type: String,
        enum: ['Scheduled', 'Confirmed', 'Checked-in', 'In-queue', 'Triaged', 'Waiting', 'In-consultation', 'Completed', 'Cancelled', 'No-show', 'Rescheduled', 'Referred'],
        default: 'Scheduled'
    },
    
    // Cancellation Details
    cancellationDetails: {
        cancelledAt: Date,
        cancelledBy: String,
        reason: String,
        remarks: String,
        refundStatus: String,
        refundAmount: Number
    },
    
    // Rescheduling History
    rescheduledFrom: {
        appointmentId: mongoose.Schema.Types.ObjectId,
        originalDate: Date,
        originalTime: String,
        reason: String
    },
    rescheduleHistory: [{
        fromDate: Date,
        fromTime: String,
        toDate: Date,
        toTime: String,
        reason: String,
        rescheduledBy: String,
        rescheduledAt: Date
    }],
    
    // Referral Information
    referredBy: {
        name: String,
        hospital: String,
        contact: String,
        referralNote: String
    },
    referredTo: {
        department: String,
        doctor: String,
        reason: String
    },
    
    // Insurance Pre-authorization
    insuranceDetails: {
        hasInsurance: { type: Boolean, default: false },
        provider: String,
        policyNumber: String,
        preAuthRequired: { type: Boolean, default: false },
        preAuthStatus: {
            type: String,
            enum: ['Not Required', 'Pending', 'Approved', 'Rejected', '']
        },
        preAuthNumber: String,
        approvedAmount: Number
    },
    
    // Booking Source
    bookingSource: {
        type: String,
        enum: ['Walk-in', 'Phone', 'Online', 'Mobile App', 'Referral', 'Camp', 'Corporate', 'Emergency'],
        default: 'Walk-in'
    },
    bookedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        name: String
    },
    
    // Notes
    notes: String,
    internalNotes: String,
    
    // Follow-up
    isFollowUp: { type: Boolean, default: false },
    followUpOf: mongoose.Schema.Types.ObjectId, // Reference to previous appointment
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,
    followUpNotes: String,
    
    // Reminders
    remindersSent: [{
        type: { type: String, enum: ['SMS', 'Email', 'WhatsApp', 'Call'] },
        sentAt: Date,
        status: String
    }],
    reminderPreference: {
        sms: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false }
    },
    
    // Outcome
    outcome: {
        status: {
            type: String,
            enum: ['Treated', 'Admitted', 'Referred', 'Surgery Scheduled', 'Investigation Ordered', 'Follow-up Required', 'Discharged', '']
        },
        prescription: mongoose.Schema.Types.ObjectId,
        emrId: mongoose.Schema.Types.ObjectId,
        nextAction: String,
        doctorNotes: String
    },
    
    // Metadata
    createdBy: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String
    },
    modifiedBy: {
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
AppointmentSchema.index({ appointmentId: 1 });
AppointmentSchema.index({ patient: 1 });
AppointmentSchema.index({ uhid: 1 });
AppointmentSchema.index({ appointmentDate: 1, department: 1 });
AppointmentSchema.index({ appointmentDate: 1, doctor: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ department: 1, appointmentDate: 1 });
AppointmentSchema.index({ doctor: 1, appointmentDate: 1, status: 1 });
AppointmentSchema.index({ createdAt: -1 });
AppointmentSchema.index({ tokenNumber: 1, appointmentDate: 1 });

// Pre-save middleware
AppointmentSchema.pre('save', async function() {
    // Generate appointment ID
    if (!this.appointmentId) {
        const prefix = this.visitType === 'OPD' ? 'APT' : this.visitType === 'Emergency' ? 'EMG' : 'ADM';
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Appointment').countDocuments({
            createdAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        });
        this.appointmentId = `${prefix}${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Generate token number if checked-in
    if (this.status === 'Checked-in' && !this.tokenNumber) {
        const todayCount = await mongoose.model('Appointment').countDocuments({
            department: this.department,
            appointmentDate: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lt: new Date(new Date().setHours(23, 59, 59, 999))
            },
            tokenNumber: { $exists: true, $ne: null }
        });
        const deptPrefix = this.department.substring(0, 3).toUpperCase();
        this.tokenNumber = `${deptPrefix}-${String(todayCount + 1).padStart(3, '0')}`;
    }
    
    // Calculate wait time
    if (this.timestamps.consultStart && this.timestamps.checkedIn) {
        this.waitTime.totalWait = Math.round((this.timestamps.consultStart - this.timestamps.checkedIn) / 60000);
    }
    
    this.updatedAt = new Date();
});

// Static method to get doctor's schedule
AppointmentSchema.statics.getDoctorSchedule = async function(doctorId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.find({
        $or: [{ doctorId: doctorId }, { doctor: doctorId }],
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['Cancelled', 'No-show'] }
    }).sort({ appointmentTime: 1 });
};

// Static method to get available slots
AppointmentSchema.statics.getAvailableSlots = async function(doctorId, department, date, slotDuration = 15) {
    const existingAppointments = await this.getDoctorSchedule(doctorId, date);
    const bookedSlots = existingAppointments.map(apt => apt.appointmentTime);
    
    // Generate all possible slots (9 AM to 5 PM)
    const allSlots = [];
    for (let hour = 9; hour < 17; hour++) {
        for (let min = 0; min < 60; min += slotDuration) {
            const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            if (!bookedSlots.includes(time)) {
                allSlots.push(time);
            }
        }
    }
    
    return allSlots;
};

// Static method to get queue status
AppointmentSchema.statics.getQueueStatus = async function(department, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.find({
        department: department,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['Checked-in', 'In-queue', 'Waiting', 'Triaged'] }
    }).sort({ 'timestamps.checkedIn': 1, tokenNumber: 1 });
};

module.exports = mongoose.model('Appointment', AppointmentSchema);
