const express = require('express');
const router = express.Router();
const {
    getAppointments,
    getAppointment,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    rescheduleAppointment,
    checkInPatient,
    startConsultation,
    completeConsultation,
    getAvailableSlots,
    getQueueStatus,
    getDoctorSchedule,
    getTodaySummary
} = require('../controllers/appointments');
const { protect, authorizeModule, authorizeAction, restrictTo } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);
router.use(authorizeModule('appointments'));

// Scheduling Utilities - place before /:id routes
router.get('/slots/available', getAvailableSlots);
router.get('/queue/status', getQueueStatus);
router.get('/today-summary', getTodaySummary);
router.get('/doctor/:doctorId/schedule', getDoctorSchedule);

// Appointments CRUD
router.route('/')
    .get(getAppointments)
    .post(authorizeAction('create'), restrictTo('receptionist', 'nurse', 'admin'), createAppointment);

router.route('/:id')
    .get(getAppointment)
    .put(authorizeAction('update'), updateAppointment);

// Appointment Actions
router.post('/:id/cancel', restrictTo('receptionist', 'admin'), cancelAppointment);
router.post('/:id/reschedule', restrictTo('receptionist', 'admin'), rescheduleAppointment);
router.post('/:id/check-in', restrictTo('receptionist', 'nurse', 'admin'), checkInPatient);
router.post('/:id/start-consultation', restrictTo('doctor', 'admin'), startConsultation);
router.post('/:id/complete-consultation', restrictTo('doctor', 'admin'), completeConsultation);

module.exports = router;
