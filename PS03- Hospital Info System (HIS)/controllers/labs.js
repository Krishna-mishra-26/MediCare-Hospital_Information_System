const LabTest = require('../models/LabTest');
const Patient = require('../models/Patient');

// @desc    Get all lab tests
// @route   GET /api/labs
// @access  Private
exports.getLabTests = async (req, res) => {
    try {
        const { status, patientId, testName, startDate, endDate, urgent } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (patientId) filter.patient = patientId;
        if (testName) filter.testName = new RegExp(testName, 'i');
        if (urgent) filter.urgent = urgent === 'true';
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const tests = await LabTest.find(filter)
            .populate('patient', 'uhid firstName lastName')
            .populate('orderedBy', 'fullName username')
            .populate('collectedBy', 'fullName username')
            .populate('processedBy', 'fullName username')
            .populate('verifiedBy', 'fullName username')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: tests.length, data: tests });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single lab test
// @route   GET /api/labs/:id
// @access  Private
exports.getLabTest = async (req, res) => {
    try {
        const test = await LabTest.findById(req.params.id)
            .populate('patient')
            .populate('orderedBy', 'fullName username')
            .populate('collectedBy', 'fullName username')
            .populate('processedBy', 'fullName username')
            .populate('verifiedBy', 'fullName username');

        if (!test) {
            return res.status(404).json({ success: false, error: 'Lab test not found' });
        }

        res.status(200).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new lab test order
// @route   POST /api/labs
// @access  Private (doctor)
exports.createLabTest = async (req, res) => {
    try {
        req.body.orderedBy = req.user._id;
        req.body.status = 'Ordered';

        const test = await LabTest.create(req.body);
        
        await test.populate('patient', 'uhid firstName lastName');
        
        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitLabOrderCreated(test);
        }
        
        res.status(201).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update lab test (general)
// @route   PUT /api/labs/:id
// @access  Private
exports.updateLabTest = async (req, res) => {
    try {
        const test = await LabTest.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('patient', 'uhid firstName lastName');

        if (!test) {
            return res.status(404).json({ success: false, error: 'Lab test not found' });
        }

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitLabStatusChanged(test, req.body.status);
        }

        res.status(200).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Collect sample (Lab Technician)
// @route   PUT /api/labs/:id/collect
// @access  Private (lab_technician)
exports.collectSample = async (req, res) => {
    try {
        const test = await LabTest.findById(req.params.id);

        if (!test) {
            return res.status(404).json({ success: false, error: 'Lab test not found' });
        }

        if (test.status !== 'Ordered') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot collect sample for status: ${test.status}` 
            });
        }

        test.status = 'Sample Collected';
        test.collectedBy = req.user._id;
        test.collectedAt = new Date();
        test.sampleId = req.body.sampleId || `SAM-${Date.now()}`;
        test.sampleType = req.body.sampleType;
        test.collectionNotes = req.body.collectionNotes;
        await test.save();

        await test.populate('patient', 'uhid firstName lastName');

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitLabSampleCollected(test);
        }

        res.status(200).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Process sample and enter results (Lab Technician)
// @route   PUT /api/labs/:id/process
// @access  Private (lab_technician)
exports.processSample = async (req, res) => {
    try {
        const test = await LabTest.findById(req.params.id);

        if (!test) {
            return res.status(404).json({ success: false, error: 'Lab test not found' });
        }

        if (test.status !== 'Sample Collected') {
            return res.status(400).json({ 
                success: false, 
                error: 'Sample must be collected before processing' 
            });
        }

        test.status = 'Processing';
        test.processedBy = req.user._id;
        test.processedAt = new Date();
        await test.save();

        res.status(200).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Enter lab results (Lab Technician)
// @route   PUT /api/labs/:id/results
// @access  Private (lab_technician)
exports.enterResults = async (req, res) => {
    try {
        const test = await LabTest.findById(req.params.id);

        if (!test) {
            return res.status(404).json({ success: false, error: 'Lab test not found' });
        }

        test.status = 'Pending Verification';
        test.result = req.body.result;
        test.resultUnit = req.body.resultUnit;
        test.referenceRange = req.body.referenceRange;
        test.abnormalFlag = req.body.abnormalFlag;
        test.criticalValue = req.body.criticalValue || false;
        test.technicianNotes = req.body.technicianNotes;
        test.resultsEnteredAt = new Date();
        await test.save();

        await test.populate([
            { path: 'patient', select: 'uhid firstName lastName' },
            { path: 'orderedBy', select: 'fullName username' }
        ]);

        // Emit real-time event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            // If critical value, alert doctor immediately
            if (test.criticalValue) {
                socketHandler.emitRoleNotification('doctor', {
                    type: 'critical',
                    title: 'Critical Lab Value',
                    message: `Critical ${test.testName} result for patient ${test.patient.firstName} ${test.patient.lastName}: ${test.result} ${test.resultUnit}`,
                    testId: test._id
                });
            }
        }

        res.status(200).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Verify lab results (Senior Lab Tech or Pathologist)
// @route   PUT /api/labs/:id/verify
// @access  Private (lab_technician with verification privilege)
exports.verifyResults = async (req, res) => {
    try {
        const test = await LabTest.findById(req.params.id);

        if (!test) {
            return res.status(404).json({ success: false, error: 'Lab test not found' });
        }

        if (test.status !== 'Pending Verification') {
            return res.status(400).json({ 
                success: false, 
                error: 'Results must be entered before verification' 
            });
        }

        // Cannot verify own results
        if (test.processedBy && test.processedBy.toString() === req.user._id.toString()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot verify your own results' 
            });
        }

        test.status = 'Verified';
        test.verifiedBy = req.user._id;
        test.verifiedAt = new Date();
        test.verificationNotes = req.body.verificationNotes;
        await test.save();

        await test.populate([
            { path: 'patient', select: 'uhid firstName lastName' },
            { path: 'orderedBy', select: 'fullName username' },
            { path: 'verifiedBy', select: 'fullName username' }
        ]);

        // Emit real-time event - notify ordering doctor
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitLabResultUpdated(test);
        }

        res.status(200).json({ success: true, data: test });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get pending collections
// @route   GET /api/labs/pending-collections
// @access  Private (lab_technician)
exports.getPendingCollections = async (req, res) => {
    try {
        const tests = await LabTest.find({ status: 'Ordered' })
            .populate('patient', 'uhid firstName lastName age gender wardBed')
            .populate('orderedBy', 'fullName username')
            .sort({ urgent: -1, createdAt: 1 });

        res.status(200).json({ success: true, count: tests.length, data: tests });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get pending verifications
// @route   GET /api/labs/pending-verifications
// @access  Private (lab_technician)
exports.getPendingVerifications = async (req, res) => {
    try {
        const tests = await LabTest.find({ status: 'Pending Verification' })
            .populate('patient', 'uhid firstName lastName')
            .populate('orderedBy', 'fullName username')
            .populate('processedBy', 'fullName username')
            .sort('resultsEnteredAt');

        res.status(200).json({ success: true, count: tests.length, data: tests });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get lab statistics
// @route   GET /api/labs/stats
// @access  Private
exports.getLabStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await LabTest.aggregate([
            {
                $facet: {
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    byTestName: [
                        { $group: { _id: '$testName', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    todayOrders: [
                        { $match: { createdAt: { $gte: today } } },
                        { $count: 'count' }
                    ],
                    pendingCollections: [
                        { $match: { status: 'Ordered' } },
                        { $count: 'count' }
                    ],
                    pendingVerifications: [
                        { $match: { status: 'Pending Verification' } },
                        { $count: 'count' }
                    ],
                    criticalValues: [
                        { $match: { criticalValue: true, status: 'Verified', createdAt: { $gte: today } } },
                        { $count: 'count' }
                    ],
                    avgTurnaroundTime: [
                        { $match: { verifiedAt: { $exists: true } } },
                        { 
                            $project: {
                                turnaround: { 
                                    $subtract: ['$verifiedAt', '$createdAt'] 
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
