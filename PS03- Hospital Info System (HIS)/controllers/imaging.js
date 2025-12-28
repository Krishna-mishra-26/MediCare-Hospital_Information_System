const Imaging = require('../models/Imaging');

// @desc    Get all imaging orders
// @route   GET /api/imaging
// @access  Private
exports.getImagingOrders = async (req, res) => {
    try {
        const orders = await Imaging.find().sort('-createdAt');
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new imaging order
// @route   POST /api/imaging
// @access  Private
exports.createImagingOrder = async (req, res) => {
    try {
        const order = await Imaging.create(req.body);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newImaging', order);
        
        res.status(201).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update imaging order
// @route   PUT /api/imaging/:id
// @access  Private
exports.updateImagingOrder = async (req, res) => {
    try {
        const order = await Imaging.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Imaging order not found' });
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
