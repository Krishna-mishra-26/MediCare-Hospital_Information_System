const Bill = require('../models/Bill');

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
exports.getBills = async (req, res) => {
    try {
        const bills = await Bill.find().sort('-createdAt');
        res.status(200).json({ success: true, count: bills.length, data: bills });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
exports.createBill = async (req, res) => {
    try {
        // Generate bill number
        const count = await Bill.countDocuments();
        const billNumber = `BILL${String(count + 1).padStart(6, '0')}`;
        
        const billData = {
            ...req.body,
            billNumber
        };
        
        const bill = await Bill.create(billData);
        
        // Emit real-time event
        const io = req.app.get('io');
        io.emit('newBill', bill);
        
        res.status(201).json({ success: true, data: bill });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update bill
// @route   PUT /api/bills/:id
// @access  Private
exports.updateBill = async (req, res) => {
    try {
        const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        res.status(200).json({ success: true, data: bill });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
