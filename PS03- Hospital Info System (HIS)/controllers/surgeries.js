const Surgery = require('../models/Surgery');

// @desc    Get all surgeries
// @route   GET /api/surgeries
// @access  Private
exports.getSurgeries = async (req, res) => {
    try {
        const surgeries = await Surgery.find().sort('-createdAt');
        res.status(200).json({ success: true, count: surgeries.length, data: surgeries });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new surgery schedule
// @route   POST /api/surgeries
// @access  Private
exports.createSurgery = async (req, res) => {
    try {
        const surgery = await Surgery.create(req.body);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newSurgery', surgery);
        
        res.status(201).json({ success: true, data: surgery });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update surgery
// @route   PUT /api/surgeries/:id
// @access  Private
exports.updateSurgery = async (req, res) => {
    try {
        const surgery = await Surgery.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!surgery) {
            return res.status(404).json({ success: false, error: 'Surgery not found' });
        }

        res.status(200).json({ success: true, data: surgery });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
