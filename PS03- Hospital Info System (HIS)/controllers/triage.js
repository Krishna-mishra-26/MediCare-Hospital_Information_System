const Triage = require('../models/Triage');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

// @desc    Get all triage records
// @route   GET /api/triage
// @access  Private
exports.getTriageRecords = async (req, res) => {
    try {
        const { category, status, date, isMLC, limit = 100 } = req.query;
        const query = {};
        
        if (category) query.triageCategory = category;
        if (status) query.status = status;
        if (isMLC) query.isMLC = isMLC === 'true';
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.arrivalTime = { $gte: startOfDay, $lte: endOfDay };
        }
        
        const records = await Triage.find(query)
            .populate('patient', 'name uhid contact age gender')
            .sort({ triageCategory: 1, arrivalTime: 1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single triage record
// @route   GET /api/triage/:id
// @access  Private
exports.getTriageRecord = async (req, res) => {
    try {
        const record = await Triage.findById(req.params.id)
            .populate('patient')
            .populate('appointment');
            
        if (!record) {
            return res.status(404).json({ success: false, error: 'Triage record not found' });
        }
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new triage record
// @route   POST /api/triage
// @access  Private
exports.createTriageRecord = async (req, res) => {
    try {
        // Get patient details
        const patient = await Patient.findById(req.body.patient);
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        // Copy patient allergies for display
        const patientAllergies = (patient.allergies || []).map(a => ({
            allergen: a.allergen || a,
            severity: a.severity || 'Unknown'
        }));
        
        const triageData = {
            ...req.body,
            uhid: patient.uhid,
            patientName: patient.name,
            patientAge: patient.age,
            patientGender: patient.gender,
            allergies: patientAllergies,
            'timestamps.arrival': req.body.arrivalTime || new Date(),
            'timestamps.triageStart': new Date(),
            createdBy: req.body.createdBy || { username: 'system' }
        };
        
        const record = await Triage.create(triageData);
        
        // Update patient with triage info
        patient.triageCategory = record.triageCategory;
        patient.triageTime = new Date();
        patient.triageNurse = req.body.triageNurse?.name;
        if (req.body.isMLC) {
            patient.isMLC = true;
            patient.mlcDetails = req.body.mlcDetails;
        }
        await patient.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newTriage', record);
        io.emit('triageAlert', {
            category: record.triageCategory,
            patientName: record.patientName,
            chiefComplaint: record.chiefComplaint
        });
        
        res.status(201).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update triage record
// @route   PUT /api/triage/:id
// @access  Private
exports.updateTriageRecord = async (req, res) => {
    try {
        const record = await Triage.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!record) {
            return res.status(404).json({ success: false, error: 'Triage record not found' });
        }
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Complete triage
// @route   POST /api/triage/:id/complete
// @access  Private
exports.completeTriage = async (req, res) => {
    try {
        const record = await Triage.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Triage record not found' });
        }
        
        record.status = 'Completed';
        record.timestamps.triageEnd = new Date();
        record.disposition = req.body.disposition;
        record.dispositionArea = req.body.dispositionArea;
        record.assignedDoctor = req.body.assignedDoctor;
        record.assignedBed = req.body.assignedBed;
        
        await record.save();
        
        const io = req.app.get('io');
        io.emit('triageCompleted', record);
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Re-triage patient
// @route   POST /api/triage/:id/re-triage
// @access  Private
exports.retriagePatient = async (req, res) => {
    try {
        const record = await Triage.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Triage record not found' });
        }
        
        // Store reassessment
        record.reassessments.push({
            reassessedAt: new Date(),
            reassessedBy: req.body.reassessedBy,
            previousCategory: record.triageCategory,
            newCategory: req.body.newCategory,
            reason: req.body.reason,
            vitals: req.body.vitals,
            notes: req.body.notes
        });
        
        record.triageCategory = req.body.newCategory;
        record.status = 'Re-triaged';
        
        if (req.body.vitals) {
            record.vitals = { ...record.vitals, ...req.body.vitals };
        }
        
        await record.save();
        
        // Update patient
        const patient = await Patient.findById(record.patient);
        if (patient) {
            patient.triageCategory = req.body.newCategory;
            await patient.save();
        }
        
        const io = req.app.get('io');
        io.emit('triageUpdated', record);
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get emergency queue by category
// @route   GET /api/triage/queue
// @access  Private
exports.getEmergencyQueue = async (req, res) => {
    try {
        const queue = await Triage.getEmergencyQueue();
        
        // Sort by priority (Red > Orange > Yellow > Green > Blue)
        const priorityOrder = { 'Red': 1, 'Orange': 2, 'Yellow': 3, 'Green': 4, 'Blue': 5 };
        queue.sort((a, b) => (priorityOrder[a._id] || 99) - (priorityOrder[b._id] || 99));
        
        res.status(200).json({ success: true, data: queue });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get MLC cases
// @route   GET /api/triage/mlc
// @access  Private
exports.getMLCCases = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        const query = { isMLC: true };
        
        if (startDate || endDate) {
            query.arrivalTime = {};
            if (startDate) query.arrivalTime.$gte = new Date(startDate);
            if (endDate) query.arrivalTime.$lte = new Date(endDate);
        }
        if (status) query.status = status;
        
        const cases = await Triage.find(query)
            .populate('patient', 'name uhid contact')
            .sort({ arrivalTime: -1 });
            
        res.status(200).json({ success: true, count: cases.length, data: cases });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get triage statistics
// @route   GET /api/triage/stats
// @access  Private
exports.getTriageStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Category distribution
        const categoryStats = await Triage.aggregate([
            { $match: { arrivalTime: { $gte: today, $lt: tomorrow } } },
            { $group: { _id: '$triageCategory', count: { $sum: 1 } } }
        ]);
        
        // Average wait times by category
        const waitTimeStats = await Triage.aggregate([
            { $match: { arrivalTime: { $gte: today, $lt: tomorrow }, 'waitTime.toTriage': { $exists: true } } },
            { 
                $group: { 
                    _id: '$triageCategory', 
                    avgWaitToTriage: { $avg: '$waitTime.toTriage' },
                    avgWaitToDoctor: { $avg: '$waitTime.toDoctor' }
                } 
            }
        ]);
        
        // MLC count
        const mlcCount = await Triage.countDocuments({ 
            isMLC: true, 
            arrivalTime: { $gte: today, $lt: tomorrow } 
        });
        
        // Total today
        const totalToday = await Triage.countDocuments({ 
            arrivalTime: { $gte: today, $lt: tomorrow } 
        });
        
        res.status(200).json({ 
            success: true, 
            data: {
                totalToday,
                mlcCount,
                categoryStats,
                waitTimeStats
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
