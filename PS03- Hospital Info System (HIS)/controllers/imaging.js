const Imaging = require('../models/Imaging');
const Patient = require('../models/Patient');

// @desc    Get all imaging orders
// @route   GET /api/imaging
// @access  Private (doctor, radiologist, radiology_technician, nurse)
exports.getImagingOrders = async (req, res) => {
    try {
        const { status, type, patientId, startDate, endDate, urgency } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (type) filter.imagingType = type;
        if (patientId) filter.patient = patientId;
        if (urgency) filter.urgency = urgency;
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const orders = await Imaging.find(filter)
            .populate('patient', 'uhid firstName lastName')
            .populate('orderedBy', 'fullName username')
            .populate('performedBy', 'fullName username')
            .populate('reportedBy', 'fullName username')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single imaging order
// @route   GET /api/imaging/:id
// @access  Private
exports.getImagingOrder = async (req, res) => {
    try {
        const order = await Imaging.findById(req.params.id)
            .populate('patient')
            .populate('orderedBy', 'fullName username')
            .populate('performedBy', 'fullName username')
            .populate('reportedBy', 'fullName username');

        if (!order) {
            return res.status(404).json({ success: false, error: 'Imaging order not found' });
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new imaging order
// @route   POST /api/imaging
// @access  Private (doctor only)
exports.createImagingOrder = async (req, res) => {
    try {
        // Add ordering doctor
        req.body.orderedBy = req.user._id;
        req.body.status = 'Ordered';

        const order = await Imaging.create(req.body);
        
        // Populate for response
        await order.populate('patient', 'uhid firstName lastName');
        
        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitImagingOrderCreated(order);
        }
        
        res.status(201).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update imaging order (general)
// @route   PUT /api/imaging/:id
// @access  Private
exports.updateImagingOrder = async (req, res) => {
    try {
        const order = await Imaging.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('patient', 'uhid firstName lastName');

        if (!order) {
            return res.status(404).json({ success: false, error: 'Imaging order not found' });
        }

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitImagingStatusChanged(order, req.body.status, req.user);
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Start imaging procedure (Radiology Technician)
// @route   PUT /api/imaging/:id/start
// @access  Private (radiology_technician)
exports.startImaging = async (req, res) => {
    try {
        const order = await Imaging.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, error: 'Imaging order not found' });
        }

        if (order.status !== 'Ordered' && order.status !== 'Scheduled') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot start imaging with status: ${order.status}` 
            });
        }

        order.status = 'In Progress';
        order.performedBy = req.user._id;
        order.performedAt = new Date();
        await order.save();

        await order.populate('patient', 'uhid firstName lastName');

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitImagingStarted(order);
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Complete imaging and upload images (Radiology Technician)
// @route   PUT /api/imaging/:id/complete
// @access  Private (radiology_technician)
exports.completeImaging = async (req, res) => {
    try {
        const order = await Imaging.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, error: 'Imaging order not found' });
        }

        if (order.status !== 'In Progress') {
            return res.status(400).json({ 
                success: false, 
                error: 'Imaging must be In Progress to complete' 
            });
        }

        order.status = 'Completed';
        order.images = req.body.images || []; // Array of image URLs/paths
        order.technicianNotes = req.body.technicianNotes;
        order.completedAt = new Date();
        await order.save();

        await order.populate('patient', 'uhid firstName lastName');

        // Emit real-time event - alert radiologist that images are ready
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitImagingCompleted(order);
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Add radiology report (Radiologist only)
// @route   PUT /api/imaging/:id/report
// @access  Private (radiologist)
exports.addReport = async (req, res) => {
    try {
        const order = await Imaging.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, error: 'Imaging order not found' });
        }

        if (order.status !== 'Completed') {
            return res.status(400).json({ 
                success: false, 
                error: 'Imaging must be completed before adding report' 
            });
        }

        order.status = 'Reported';
        order.reportedBy = req.user._id;
        order.reportedAt = new Date();
        order.findings = req.body.findings;
        order.impression = req.body.impression;
        order.recommendations = req.body.recommendations;
        order.criticalFindings = req.body.criticalFindings || false;
        await order.save();

        await order.populate([
            { path: 'patient', select: 'uhid firstName lastName' },
            { path: 'orderedBy', select: 'fullName username' },
            { path: 'reportedBy', select: 'fullName username' }
        ]);

        // Emit real-time event - notify ordering doctor
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitImagingReportAdded(order);
            
            // If critical findings, send urgent alert
            if (order.criticalFindings) {
                socketHandler.emitRoleNotification('doctor', {
                    type: 'critical',
                    title: 'Critical Imaging Finding',
                    message: `Critical finding for patient ${order.patient.firstName} ${order.patient.lastName}`,
                    orderId: order._id
                });
            }
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get pending imaging for reporting (Radiologist view)
// @route   GET /api/imaging/pending-reports
// @access  Private (radiologist)
exports.getPendingReports = async (req, res) => {
    try {
        const orders = await Imaging.find({ status: 'Completed' })
            .populate('patient', 'uhid firstName lastName')
            .populate('orderedBy', 'fullName username')
            .populate('performedBy', 'fullName username')
            .sort('completedAt'); // Oldest first

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get imaging worklist for technician
// @route   GET /api/imaging/worklist
// @access  Private (radiology_technician)
exports.getWorklist = async (req, res) => {
    try {
        const orders = await Imaging.find({ 
            status: { $in: ['Ordered', 'Scheduled'] } 
        })
            .populate('patient', 'uhid firstName lastName age gender')
            .populate('orderedBy', 'fullName username')
            .sort({ urgency: -1, createdAt: 1 }); // Urgent first, then oldest

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get imaging statistics
// @route   GET /api/imaging/stats
// @access  Private
exports.getImagingStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await Imaging.aggregate([
            {
                $facet: {
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    byType: [
                        { $group: { _id: '$imagingType', count: { $sum: 1 } } }
                    ],
                    todayOrders: [
                        { $match: { createdAt: { $gte: today } } },
                        { $count: 'count' }
                    ],
                    pendingReports: [
                        { $match: { status: 'Completed' } },
                        { $count: 'count' }
                    ],
                    avgTurnaroundTime: [
                        { $match: { reportedAt: { $exists: true } } },
                        { 
                            $project: {
                                turnaround: { 
                                    $subtract: ['$reportedAt', '$createdAt'] 
                                }
                            }
                        },
                        { $group: { _id: null, avgTime: { $avg: '$turnaround' } } }
                    ]
                }
            }
        ]);

        res.status(200).json({ success: true, data: stats[0] });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
