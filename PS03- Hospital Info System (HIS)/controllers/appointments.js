const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res) => {
    try {
        const { date, department, doctor, status, visitType, limit = 100 } = req.query;
        const query = {};
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
        }
        if (department) query.department = department;
        if (doctor) query.doctor = doctor;
        if (status) query.status = status;
        if (visitType) query.visitType = visitType;
        
        const appointments = await Appointment.find(query)
            .populate('patient', 'name uhid contact age gender')
            .sort({ appointmentDate: 1, appointmentTime: 1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient');
            
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res) => {
    try {
        // Get patient details
        const patient = await Patient.findById(req.body.patient);
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        const appointmentData = {
            ...req.body,
            uhid: patient.uhid,
            patientName: patient.name,
            patientContact: patient.contact,
            patientAge: patient.age,
            patientGender: patient.gender,
            'timestamps.booked': new Date(),
            createdBy: req.body.createdBy || { username: 'system' }
        };
        
        const appointment = await Appointment.create(appointmentData);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newAppointment', appointment);
        
        res.status(201).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        const io = req.app.get('io');
        io.emit('appointmentUpdated', appointment);
        
        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Check-in patient
// @route   POST /api/appointments/:id/check-in
// @access  Private
exports.checkInPatient = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        appointment.status = 'Checked-in';
        appointment.timestamps.checkedIn = new Date();
        appointment.timestamps.arrived = appointment.timestamps.arrived || new Date();
        
        await appointment.save();
        
        const io = req.app.get('io');
        io.emit('patientCheckedIn', appointment);
        
        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Start consultation
// @route   POST /api/appointments/:id/start-consult
// @access  Private
exports.startConsultation = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        appointment.status = 'In-consultation';
        appointment.timestamps.consultStart = new Date();
        
        // Calculate wait time
        if (appointment.timestamps.checkedIn) {
            appointment.waitTime.totalWait = Math.round(
                (new Date() - appointment.timestamps.checkedIn) / 60000
            );
        }
        
        await appointment.save();
        
        const io = req.app.get('io');
        io.emit('consultationStarted', appointment);
        
        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Complete consultation
// @route   POST /api/appointments/:id/complete
// @access  Private
exports.completeConsultation = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        appointment.status = 'Completed';
        appointment.timestamps.consultEnd = new Date();
        appointment.timestamps.completed = new Date();
        appointment.outcome = req.body.outcome || {};
        
        await appointment.save();
        
        const io = req.app.get('io');
        io.emit('consultationCompleted', appointment);
        
        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Cancel appointment
// @route   POST /api/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        appointment.status = 'Cancelled';
        appointment.timestamps.cancelled = new Date();
        appointment.cancellationDetails = {
            cancelledAt: new Date(),
            cancelledBy: req.body.cancelledBy || 'Unknown',
            reason: req.body.reason,
            remarks: req.body.remarks
        };
        
        await appointment.save();
        
        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Reschedule appointment
// @route   POST /api/appointments/:id/reschedule
// @access  Private
exports.rescheduleAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        // Store reschedule history
        appointment.rescheduleHistory.push({
            fromDate: appointment.appointmentDate,
            fromTime: appointment.appointmentTime,
            toDate: new Date(req.body.newDate),
            toTime: req.body.newTime,
            reason: req.body.reason,
            rescheduledBy: req.body.rescheduledBy || 'Unknown',
            rescheduledAt: new Date()
        });
        
        // Update appointment
        appointment.appointmentDate = new Date(req.body.newDate);
        appointment.appointmentTime = req.body.newTime;
        appointment.status = 'Rescheduled';
        
        await appointment.save();
        
        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get doctor's schedule
// @route   GET /api/appointments/doctor/:doctorId/schedule
// @access  Private
exports.getDoctorSchedule = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const appointments = await Appointment.getDoctorSchedule(req.params.doctorId, date);
        
        res.status(200).json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get available slots
// @route   GET /api/appointments/available-slots
// @access  Private
exports.getAvailableSlots = async (req, res) => {
    try {
        const { doctor, department, date, slotDuration } = req.query;
        
        if (!doctor || !date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Doctor and date are required' 
            });
        }
        
        const slots = await Appointment.getAvailableSlots(
            doctor, 
            department, 
            date, 
            parseInt(slotDuration) || 15
        );
        
        res.status(200).json({ success: true, data: slots });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get queue status
// @route   GET /api/appointments/queue/:department
// @access  Private
exports.getQueueStatus = async (req, res) => {
    try {
        const date = req.query.date || new Date();
        const queue = await Appointment.getQueueStatus(req.params.department, date);
        
        res.status(200).json({ success: true, count: queue.length, data: queue });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get today's appointments summary
// @route   GET /api/appointments/today-summary
// @access  Private
exports.getTodaySummary = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const summary = await Appointment.aggregate([
            {
                $match: {
                    appointmentDate: { $gte: today, $lt: tomorrow }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const departmentSummary = await Appointment.aggregate([
            {
                $match: {
                    appointmentDate: { $gte: today, $lt: tomorrow }
                }
            },
            {
                $group: {
                    _id: '$department',
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
                    },
                    waiting: {
                        $sum: { $cond: [{ $in: ['$status', ['Waiting', 'Checked-in', 'In-queue']] }, 1, 0] }
                    }
                }
            }
        ]);
        
        res.status(200).json({ 
            success: true, 
            data: {
                statusSummary: summary,
                departmentSummary: departmentSummary
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
