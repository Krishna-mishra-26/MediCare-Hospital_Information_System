const Prescription = require('../models/Prescription');

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.find().sort('-createdAt');
        res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private
exports.createPrescription = async (req, res) => {
    try {
        const prescription = await Prescription.create(req.body);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newPrescription', prescription);
        
        res.status(201).json({ success: true, data: prescription });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private
exports.updatePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!prescription) {
            return res.status(404).json({ success: false, error: 'Prescription not found' });
        }

        res.status(200).json({ success: true, data: prescription });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
