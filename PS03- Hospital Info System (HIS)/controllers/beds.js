const Bed = require('../models/Bed');
const Ward = require('../models/Ward');

// @desc    Get all wards with beds
// @route   GET /api/beds/wards
// @access  Private
exports.getWards = async (req, res) => {
    try {
        const wards = await Ward.find().sort('name');
        
        // Get beds for each ward
        const wardsWithBeds = await Promise.all(wards.map(async (ward) => {
            const beds = await Bed.find({ ward: ward._id }).sort('number');
            return {
                id: ward.wardId,
                _id: ward._id,
                name: ward.name,
                prefix: ward.prefix,
                type: ward.type,
                ratePerDay: ward.ratePerDay,
                totalBeds: ward.totalBeds,
                beds: beds.map(bed => ({
                    id: bed.bedId,
                    _id: bed._id,
                    number: bed.number,
                    status: bed.status,
                    patient: bed.patient,
                    lastUpdated: bed.lastUpdated
                }))
            };
        }));
        
        res.status(200).json({ success: true, data: wardsWithBeds });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new ward
// @route   POST /api/beds/wards
// @access  Private
exports.createWard = async (req, res) => {
    try {
        const { name, prefix, type, ratePerDay, numBeds } = req.body;
        
        // Generate ward ID
        const wardId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        // Check if ward already exists
        const existingWard = await Ward.findOne({ wardId });
        if (existingWard) {
            return res.status(400).json({ success: false, error: 'Ward already exists' });
        }
        
        // Create ward
        const ward = await Ward.create({
            wardId,
            name,
            prefix: prefix.toUpperCase(),
            type: type || 'general',
            ratePerDay: ratePerDay || 0,
            totalBeds: numBeds || 0
        });
        
        // Create beds for the ward
        const beds = [];
        for (let i = 1; i <= (numBeds || 0); i++) {
            const bedNum = i.toString().padStart(2, '0');
            const bed = await Bed.create({
                bedId: `${prefix.toUpperCase()}-${bedNum}`,
                number: bedNum,
                ward: ward._id,
                status: 'available'
            });
            beds.push({
                id: bed.bedId,
                _id: bed._id,
                number: bed.number,
                status: bed.status,
                patient: null,
                lastUpdated: bed.lastUpdated
            });
        }
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('wardCreated', { ward, beds });
        
        res.status(201).json({ 
            success: true, 
            data: {
                id: ward.wardId,
                _id: ward._id,
                name: ward.name,
                prefix: ward.prefix,
                type: ward.type,
                ratePerDay: ward.ratePerDay,
                totalBeds: ward.totalBeds,
                beds
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update ward
// @route   PUT /api/beds/wards/:id
// @access  Private
exports.updateWard = async (req, res) => {
    try {
        const { name, prefix, ratePerDay, addBeds } = req.body;
        
        const ward = await Ward.findOne({ wardId: req.params.id });
        if (!ward) {
            return res.status(404).json({ success: false, error: 'Ward not found' });
        }
        
        const oldPrefix = ward.prefix;
        
        // Update ward details
        ward.name = name || ward.name;
        ward.prefix = prefix ? prefix.toUpperCase() : ward.prefix;
        ward.ratePerDay = ratePerDay !== undefined ? ratePerDay : ward.ratePerDay;
        
        // If prefix changed, update all bed IDs
        if (oldPrefix !== ward.prefix) {
            const beds = await Bed.find({ ward: ward._id });
            for (const bed of beds) {
                bed.bedId = `${ward.prefix}-${bed.number}`;
                await bed.save();
            }
        }
        
        // Add new beds if requested
        if (addBeds && addBeds > 0) {
            const existingBeds = await Bed.countDocuments({ ward: ward._id });
            for (let i = 1; i <= addBeds; i++) {
                const bedNum = (existingBeds + i).toString().padStart(2, '0');
                await Bed.create({
                    bedId: `${ward.prefix}-${bedNum}`,
                    number: bedNum,
                    ward: ward._id,
                    status: 'available'
                });
            }
            ward.totalBeds = existingBeds + addBeds;
        }
        
        await ward.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('wardUpdated', ward);
        
        res.status(200).json({ success: true, data: ward });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete ward
// @route   DELETE /api/beds/wards/:id
// @access  Private
exports.deleteWard = async (req, res) => {
    try {
        const ward = await Ward.findOne({ wardId: req.params.id });
        if (!ward) {
            return res.status(404).json({ success: false, error: 'Ward not found' });
        }
        
        // Delete all beds in the ward
        await Bed.deleteMany({ ward: ward._id });
        
        // Delete ward
        await Ward.deleteOne({ _id: ward._id });
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('wardDeleted', req.params.id);
        
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get bed statistics
// @route   GET /api/beds/stats
// @access  Private
exports.getBedStats = async (req, res) => {
    try {
        const total = await Bed.countDocuments();
        const occupied = await Bed.countDocuments({ status: 'occupied' });
        const available = await Bed.countDocuments({ status: 'available' });
        const critical = await Bed.countDocuments({ status: 'critical' });
        const maintenance = await Bed.countDocuments({ status: 'maintenance' });
        const reserved = await Bed.countDocuments({ status: 'reserved' });
        
        res.status(200).json({
            success: true,
            data: { total, occupied, available, critical, maintenance, reserved }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update bed status
// @route   PUT /api/beds/:wardId/:bedId
// @access  Private
exports.updateBed = async (req, res) => {
    try {
        const { status, patient } = req.body;
        
        const bed = await Bed.findOne({ bedId: req.params.bedId });
        if (!bed) {
            return res.status(404).json({ success: false, error: 'Bed not found' });
        }
        
        bed.status = status || bed.status;
        bed.patient = patient !== undefined ? patient : bed.patient;
        bed.lastUpdated = new Date();
        
        await bed.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('bedUpdated', bed);
        
        res.status(200).json({ success: true, data: bed });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Assign patient to bed
// @route   POST /api/beds/:wardId/:bedId/assign
// @access  Private
exports.assignPatient = async (req, res) => {
    try {
        const { patientName, diagnosis, doctor, patientId } = req.body;
        
        const bed = await Bed.findOne({ bedId: req.params.bedId });
        if (!bed) {
            return res.status(404).json({ success: false, error: 'Bed not found' });
        }
        
        if (bed.status === 'occupied' || bed.status === 'critical') {
            return res.status(400).json({ success: false, error: 'Bed is already occupied' });
        }
        
        bed.status = 'occupied';
        bed.patient = {
            name: patientName,
            diagnosis,
            admitDate: new Date(),
            doctor,
            patientId
        };
        bed.lastUpdated = new Date();
        
        await bed.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('patientAssigned', { bed, wardId: req.params.wardId });
        
        res.status(200).json({ success: true, data: bed });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Discharge patient from bed
// @route   POST /api/beds/:wardId/:bedId/discharge
// @access  Private
exports.dischargePatient = async (req, res) => {
    try {
        const bed = await Bed.findOne({ bedId: req.params.bedId });
        if (!bed) {
            return res.status(404).json({ success: false, error: 'Bed not found' });
        }
        
        const patientName = bed.patient?.name || 'Unknown';
        
        bed.status = 'available';
        bed.patient = null;
        bed.lastUpdated = new Date();
        
        await bed.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('patientDischarged', { bed, patientName, wardId: req.params.wardId });
        
        res.status(200).json({ success: true, data: bed, patientName });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Transfer patient between beds
// @route   POST /api/beds/transfer
// @access  Private
exports.transferPatient = async (req, res) => {
    try {
        const { fromBedId, toBedId } = req.body;
        
        const fromBed = await Bed.findOne({ bedId: fromBedId });
        const toBed = await Bed.findOne({ bedId: toBedId });
        
        if (!fromBed || !toBed) {
            return res.status(404).json({ success: false, error: 'Bed not found' });
        }
        
        if (!fromBed.patient) {
            return res.status(400).json({ success: false, error: 'Source bed has no patient' });
        }
        
        if (toBed.status === 'occupied' || toBed.status === 'critical') {
            return res.status(400).json({ success: false, error: 'Destination bed is occupied' });
        }
        
        const patientName = fromBed.patient.name;
        
        // Transfer patient
        toBed.patient = fromBed.patient;
        toBed.status = fromBed.status;
        toBed.lastUpdated = new Date();
        
        // Clear source bed
        fromBed.patient = null;
        fromBed.status = 'available';
        fromBed.lastUpdated = new Date();
        
        await fromBed.save();
        await toBed.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('patientTransferred', { fromBed, toBed, patientName });
        
        res.status(200).json({ success: true, data: { fromBed, toBed }, patientName });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add bed to ward
// @route   POST /api/beds/wards/:id/beds
// @access  Private
exports.addBed = async (req, res) => {
    try {
        const { numBeds, status } = req.body;
        
        const ward = await Ward.findOne({ wardId: req.params.id });
        if (!ward) {
            return res.status(404).json({ success: false, error: 'Ward not found' });
        }
        
        const existingBeds = await Bed.countDocuments({ ward: ward._id });
        const newBeds = [];
        
        for (let i = 1; i <= (numBeds || 1); i++) {
            const bedNum = (existingBeds + i).toString().padStart(2, '0');
            const bed = await Bed.create({
                bedId: `${ward.prefix}-${bedNum}`,
                number: bedNum,
                ward: ward._id,
                status: status || 'available'
            });
            newBeds.push(bed);
        }
        
        ward.totalBeds = existingBeds + (numBeds || 1);
        await ward.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('bedsAdded', { wardId: ward.wardId, beds: newBeds });
        
        res.status(201).json({ success: true, data: newBeds });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete bed
// @route   DELETE /api/beds/:wardId/:bedId
// @access  Private
exports.deleteBed = async (req, res) => {
    try {
        const bed = await Bed.findOne({ bedId: req.params.bedId });
        if (!bed) {
            return res.status(404).json({ success: false, error: 'Bed not found' });
        }
        
        if (bed.status === 'occupied' || bed.status === 'critical') {
            return res.status(400).json({ success: false, error: 'Cannot delete occupied bed' });
        }
        
        const ward = await Ward.findById(bed.ward);
        if (ward) {
            ward.totalBeds = Math.max(0, ward.totalBeds - 1);
            await ward.save();
        }
        
        await Bed.deleteOne({ _id: bed._id });
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('bedDeleted', { wardId: req.params.wardId, bedId: req.params.bedId });
        
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
