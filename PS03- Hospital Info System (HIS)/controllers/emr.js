const EMR = require('../models/EMR');
const Patient = require('../models/Patient');

// @desc    Get all EMR records
// @route   GET /api/emr
// @access  Private
exports.getEMRRecords = async (req, res) => {
    try {
        const { patient, visitType, status, startDate, endDate, limit = 50 } = req.query;
        const query = {};
        
        if (patient) query.patient = patient;
        if (visitType) query.visitType = visitType;
        if (status) query.status = status;
        if (startDate || endDate) {
            query.encounterDate = {};
            if (startDate) query.encounterDate.$gte = new Date(startDate);
            if (endDate) query.encounterDate.$lte = new Date(endDate);
        }
        
        const records = await EMR.find(query)
            .populate('patient', 'name uhid contact')
            .sort({ encounterDate: -1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single EMR record
// @route   GET /api/emr/:id
// @access  Private
exports.getEMRRecord = async (req, res) => {
    try {
        const record = await EMR.findById(req.params.id)
            .populate('patient')
            .populate('prescriptions')
            .populate('labResults')
            .populate('imagingResults');
            
        if (!record) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get patient's EMR history
// @route   GET /api/emr/patient/:patientId
// @access  Private
exports.getPatientEMRHistory = async (req, res) => {
    try {
        const records = await EMR.getPatientHistory(req.params.patientId);
        res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new EMR record
// @route   POST /api/emr
// @access  Private
exports.createEMRRecord = async (req, res) => {
    try {
        // Get patient details
        const patient = await Patient.findById(req.body.patient);
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        const emrData = {
            ...req.body,
            uhid: patient.uhid,
            patientName: patient.name,
            createdBy: req.body.createdBy || { username: 'system' }
        };
        
        const record = await EMR.create(emrData);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newEMR', record);
        
        res.status(201).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update EMR record
// @route   PUT /api/emr/:id
// @access  Private
exports.updateEMRRecord = async (req, res) => {
    try {
        const existingRecord = await EMR.findById(req.params.id);
        if (!existingRecord) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        // Store previous data for version history
        const previousData = existingRecord.toObject();
        
        // Add version history
        existingRecord.addVersionHistory(
            req.body,
            previousData,
            req.body.modifiedBy || { username: 'system' },
            req.body.changeReason || 'Updated'
        );
        
        // Update the record
        Object.assign(existingRecord, req.body);
        existingRecord.lastModifiedBy = req.body.modifiedBy || { username: 'system' };
        
        await existingRecord.save();
        
        res.status(200).json({ success: true, data: existingRecord });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add progress note to EMR
// @route   POST /api/emr/:id/progress-notes
// @access  Private
exports.addProgressNote = async (req, res) => {
    try {
        const record = await EMR.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        const author = {
            name: req.body.authorName || 'Unknown',
            designation: req.body.authorDesignation || 'Unknown',
            department: req.body.authorDepartment || ''
        };
        
        await record.addProgressNote(req.body, author);
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add diagnosis to EMR
// @route   POST /api/emr/:id/diagnoses
// @access  Private
exports.addDiagnosis = async (req, res) => {
    try {
        const record = await EMR.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        record.diagnoses.push({
            ...req.body,
            diagnosedAt: new Date()
        });
        
        // Update primary/final diagnosis if specified
        if (req.body.diagnosisType === 'Primary') {
            record.primaryDiagnosis = {
                code: req.body.diagnosisCode,
                description: req.body.diagnosisDescription,
                codingSystem: req.body.codingSystem
            };
        }
        
        await record.save();
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add allergy alert
// @route   POST /api/emr/:id/allergies
// @access  Private
exports.addAllergy = async (req, res) => {
    try {
        const record = await EMR.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        record.allergies.push({
            ...req.body,
            verifiedAt: new Date()
        });
        
        // Add clinical alert for severe allergies
        if (req.body.severity === 'Severe' || req.body.severity === 'Life-threatening') {
            record.clinicalAlerts.push({
                alertType: 'Allergy',
                alertMessage: `ALLERGY ALERT: ${req.body.allergen} - ${req.body.severity}`,
                severity: 'Critical',
                createdBy: req.body.verifiedBy || 'System'
            });
        }
        
        await record.save();
        
        // Also update patient record
        const patient = await Patient.findById(record.patient);
        if (patient) {
            patient.allergies.push({
                allergen: req.body.allergen,
                reaction: req.body.reaction,
                severity: req.body.severity
            });
            patient.allergyAlerts = patient.allergyAlerts || [];
            if (req.body.severity === 'Severe' || req.body.severity === 'Life-threatening') {
                patient.allergyAlerts.push(req.body.allergen);
            }
            await patient.save();
        }
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add consent record
// @route   POST /api/emr/:id/consents
// @access  Private
exports.addConsent = async (req, res) => {
    try {
        const record = await EMR.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        record.consents.push({
            ...req.body,
            signedAt: new Date()
        });
        
        await record.save();
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Generate discharge summary
// @route   POST /api/emr/:id/discharge-summary
// @access  Private
exports.generateDischargeSummary = async (req, res) => {
    try {
        const record = await EMR.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        record.dischargeSummary = {
            ...req.body,
            dischargeDate: new Date()
        };
        record.status = 'Completed';
        
        await record.save();
        
        // Update patient status
        const patient = await Patient.findById(record.patient);
        if (patient) {
            patient.status = 'Discharged';
            patient.dischargeDate = new Date();
            patient.dischargeSummary = req.body.courseInHospital;
            patient.followUpDate = req.body.followUpDate;
            await patient.save();
        }
        
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get EMR version history
// @route   GET /api/emr/:id/history
// @access  Private
exports.getEMRHistory = async (req, res) => {
    try {
        const record = await EMR.findById(req.params.id).select('versionHistory currentVersion');
        if (!record) {
            return res.status(404).json({ success: false, error: 'EMR record not found' });
        }
        
        res.status(200).json({ 
            success: true, 
            data: {
                currentVersion: record.currentVersion,
                history: record.versionHistory
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
