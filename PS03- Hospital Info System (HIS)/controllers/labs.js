const LabTest = require('../models/LabTest');

// @desc    Get all lab tests
// @route   GET /api/labs
// @access  Private
exports.getLabTests = async (req, res) => {
    try {
        const tests = await LabTest.find().sort('-createdAt');
        res.status(200).json({ success: true, count: tests.length, data: tests });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new lab test
// @route   POST /api/labs
// @access  Private
exports.createLabTest = async (req, res) => {
    try {
        const test = await LabTest.create(req.body);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newLabTest', test);
        
        res.status(201).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update lab test
// @route   PUT /api/labs/:id
// @access  Private
exports.updateLabTest = async (req, res) => {
    try {
        const test = await LabTest.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!test) {
            return res.status(404).json({ success: false, error: 'Lab test not found' });
        }

        res.status(200).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
