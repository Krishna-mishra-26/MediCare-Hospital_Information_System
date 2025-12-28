const Patient = require('../models/Patient');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res) => {
    try {
        const patients = await Patient.find();
        res.status(200).json({ success: true, count: patients.length, data: patients });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private
exports.createPatient = async (req, res) => {
    try {
        // Generate patientId in MCP-XXX-NNN format (matching seeder.js)
        if (!req.body.patientId) {
            let prefix;
            switch(req.body.type) {
                case 'OPD':
                    prefix = 'MCP-OPD';
                    break;
                case 'IPD':
                    prefix = 'MCP-IPD';
                    break;
                case 'Emergency':
                    prefix = 'MCP-EMR';
                    break;
                default:
                    prefix = 'MCP-PAT';
            }
            
            // Get count of patients with this type for sequential numbering
            const count = await Patient.countDocuments({ type: req.body.type });
            req.body.patientId = `${prefix}-${String(count + 1).padStart(3, '0')}`;
        }
        
        // Set admission date for IPD/Emergency patients
        if ((req.body.type === 'IPD' || req.body.type === 'Emergency') && !req.body.admissionDate) {
            req.body.admissionDate = new Date();
        }
        
        // Map bedNumber to bed field for consistency with seeder
        if (req.body.bedNumber && !req.body.bed) {
            req.body.bed = req.body.bedNumber;
        }
        
        // Map roomType to ward for IPD patients
        if (req.body.type === 'IPD' && req.body.roomType && !req.body.ward) {
            req.body.ward = req.body.roomType;
        }
        
        // Set appropriate status
        if (!req.body.status) {
            switch(req.body.type) {
                case 'OPD':
                    req.body.status = 'Waiting';
                    break;
                case 'IPD':
                case 'Emergency':
                    req.body.status = 'Active';
                    break;
            }
        }
        
        // Map chiefComplaint/symptoms to diagnosis if not set
        if (!req.body.diagnosis && req.body.symptoms) {
            req.body.diagnosis = req.body.symptoms;
        }
        if (!req.body.diagnosis && req.body.chiefComplaint) {
            req.body.diagnosis = req.body.chiefComplaint;
        }
        
        const patient = await Patient.create(req.body);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newPatient', patient);
        
        res.status(201).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        res.status(200).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private
exports.deletePatient = async (req, res) => {
    try {
        const patient = await Patient.findByIdAndDelete(req.params.id);

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};