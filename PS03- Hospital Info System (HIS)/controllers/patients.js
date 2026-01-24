const Patient = require('../models/Patient');

// Helper function to generate UHID
const generateUHID = async () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await Patient.countDocuments();
    return `UHID${year}${String(count + 1).padStart(6, '0')}`;
};

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res) => {
    try {
        const { type, status, search, uhid, startDate, endDate, limit, page } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (status) filter.status = status;
        if (uhid) filter.uhid = uhid;
        
        if (search) {
            filter.$or = [
                { firstName: new RegExp(search, 'i') },
                { lastName: new RegExp(search, 'i') },
                { uhid: new RegExp(search, 'i') },
                { patientId: new RegExp(search, 'i') },
                { phone: new RegExp(search, 'i') }
            ];
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        const [patients, total] = await Promise.all([
            Patient.find(filter)
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum),
            Patient.countDocuments(filter)
        ]);

        res.status(200).json({ 
            success: true, 
            count: patients.length, 
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            data: patients 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id)
            .populate('registeredBy', 'fullName username')
            .populate('assignedDoctor', 'fullName username specialization');

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        res.status(200).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Search patient by UHID
// @route   GET /api/patients/uhid/:uhid
// @access  Private
exports.getPatientByUHID = async (req, res) => {
    try {
        const patient = await Patient.findOne({ uhid: req.params.uhid });

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        res.status(200).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private (receptionist, nurse, doctor, admin)
exports.createPatient = async (req, res) => {
    try {
        // Generate UHID if not provided
        if (!req.body.uhid) {
            req.body.uhid = await generateUHID();
        }

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

        // Add registered by
        if (req.user) {
            req.body.registeredBy = req.user._id;
        }
        
        const patient = await Patient.create(req.body);
        
        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitPatientCreated(patient);
        }
        
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

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitPatientUpdated(patient);
        }

        res.status(200).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update patient vitals
// @route   PUT /api/patients/:id/vitals
// @access  Private (nurse, doctor)
exports.updateVitals = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        patient.vitals = {
            ...patient.vitals,
            ...req.body,
            recordedAt: new Date(),
            recordedBy: req.user._id
        };

        await patient.save();

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitPatientVitalsUpdated(patient._id, patient.vitals, req.user);
        }

        res.status(200).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add allergy to patient
// @route   POST /api/patients/:id/allergies
// @access  Private (nurse, doctor)
exports.addAllergy = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        if (!patient.allergies) {
            patient.allergies = [];
        }

        patient.allergies.push({
            ...req.body,
            recordedAt: new Date(),
            recordedBy: req.user._id
        });

        await patient.save();

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitAllergyAdded(patient._id, req.body);
        }

        res.status(200).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Discharge patient
// @route   PUT /api/patients/:id/discharge
// @access  Private (doctor, admin)
exports.dischargePatient = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        patient.status = 'Discharged';
        patient.dischargeDate = new Date();
        patient.dischargeSummary = req.body.summary;
        patient.dischargedBy = req.user._id;
        patient.followUpDate = req.body.followUpDate;
        patient.followUpInstructions = req.body.followUpInstructions;

        await patient.save();

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitPatientUpdated(patient);
            socketHandler.emitBedStatusChanged(patient.bed, 'Available', null);
        }

        res.status(200).json({ success: true, data: patient });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private (admin only)
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

// @desc    Find potential duplicate patients
// @route   POST /api/patients/find-duplicates
// @access  Private
exports.findDuplicates = async (req, res) => {
    try {
        const { name, phone, dateOfBirth, idProof } = req.body;
        const query = { $or: [] };
        
        // Check by phone
        if (phone) {
            query.$or.push({ 'contact.phone': phone });
            query.$or.push({ 'contact.alternatePhone': phone });
        }
        
        // Check by name + DOB combination
        if (name && dateOfBirth) {
            const dob = new Date(dateOfBirth);
            query.$or.push({
                $and: [
                    { 'name.full': new RegExp(name, 'i') },
                    { dateOfBirth: dob }
                ]
            });
        }
        
        // Check by ID proof
        if (idProof && idProof.number) {
            query.$or.push({
                'idProofs.number': idProof.number
            });
        }
        
        if (query.$or.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Provide at least one search criteria (phone, name+DOB, or ID proof)' 
            });
        }
        
        const duplicates = await Patient.find(query)
            .select('uhid name contact dateOfBirth gender status type createdAt')
            .limit(10);
            
        res.status(200).json({ 
            success: true, 
            hasDuplicates: duplicates.length > 0,
            count: duplicates.length,
            data: duplicates 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Merge two patient records
// @route   POST /api/patients/merge
// @access  Private (admin only)
exports.mergePatients = async (req, res) => {
    try {
        const { primaryPatientId, secondaryPatientId, mergedBy, reason } = req.body;
        
        if (!primaryPatientId || !secondaryPatientId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both primary and secondary patient IDs required' 
            });
        }
        
        const primary = await Patient.findById(primaryPatientId);
        const secondary = await Patient.findById(secondaryPatientId);
        
        if (!primary || !secondary) {
            return res.status(404).json({ success: false, error: 'One or both patients not found' });
        }
        
        if (secondary.mergedWith) {
            return res.status(400).json({ 
                success: false, 
                error: 'Secondary patient has already been merged' 
            });
        }
        
        // Merge secondary's data into primary
        // Merge insurance records
        if (secondary.insurance && secondary.insurance.length > 0) {
            primary.insurance = [...(primary.insurance || []), ...secondary.insurance];
        }
        
        // Merge allergies
        if (secondary.allergies && secondary.allergies.length > 0) {
            const existingAllergens = new Set((primary.allergies || []).map(a => a.allergen.toLowerCase()));
            for (const allergy of secondary.allergies) {
                if (!existingAllergens.has(allergy.allergen.toLowerCase())) {
                    primary.allergies.push(allergy);
                }
            }
        }
        
        // Keep track of merged UHID for reference
        primary.mergedFrom = primary.mergedFrom || [];
        primary.mergedFrom.push({
            uhid: secondary.uhid,
            patientId: secondary._id,
            mergedAt: new Date(),
            mergedBy: mergedBy || 'system'
        });
        
        // Add audit entry to primary
        primary.auditTrail.push({
            action: 'Merged',
            timestamp: new Date(),
            user: mergedBy || 'system',
            details: `Merged with patient ${secondary.uhid}. Reason: ${reason || 'Duplicate record'}`
        });
        
        await primary.save();
        
        // Mark secondary as merged
        secondary.status = 'Merged';
        secondary.mergedWith = {
            primaryPatient: primary._id,
            primaryUHID: primary.uhid,
            mergedAt: new Date(),
            mergedBy: mergedBy || 'system',
            reason: reason
        };
        secondary.auditTrail.push({
            action: 'Merged',
            timestamp: new Date(),
            user: mergedBy || 'system',
            details: `Merged into patient ${primary.uhid}. Reason: ${reason || 'Duplicate record'}`
        });
        
        await secondary.save();
        
        res.status(200).json({ 
            success: true, 
            message: `Patient ${secondary.uhid} merged into ${primary.uhid}`,
            data: { primary, secondary }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get patient statistics
// @route   GET /api/patients/stats
// @access  Private
exports.getPatientStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await Patient.aggregate([
            {
                $facet: {
                    byType: [
                        { $group: { _id: '$type', count: { $sum: 1 } } }
                    ],
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    todayRegistrations: [
                        { $match: { createdAt: { $gte: today } } },
                        { $count: 'count' }
                    ],
                    todayDischarges: [
                        { $match: { dischargeDate: { $gte: today } } },
                        { $count: 'count' }
                    ],
                    activeIPD: [
                        { $match: { type: 'IPD', status: 'Active' } },
                        { $count: 'count' }
                    ],
                    activeEmergency: [
                        { $match: { type: 'Emergency', status: { $ne: 'Discharged' } } },
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        res.status(200).json({ success: true, data: stats[0] });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};