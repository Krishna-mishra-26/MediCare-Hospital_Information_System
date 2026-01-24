const Drug = require('../models/Drug');
const DrugBatch = require('../models/DrugBatch');
const Prescription = require('../models/Prescription');
const StockIssue = require('../models/StockIssue');
const Patient = require('../models/Patient');

// ==================== DRUG MASTER ====================

// @desc    Get all drugs
// @route   GET /api/pharmacy/drugs
// @access  Private
exports.getDrugs = async (req, res) => {
    try {
        const { search, drugClass, form, isActive, limit = 100 } = req.query;
        const query = {};
        
        if (search) {
            query.$or = [
                { brandName: new RegExp(search, 'i') },
                { genericName: new RegExp(search, 'i') }
            ];
        }
        if (drugClass) query.drugClass = drugClass;
        if (form) query.form = form;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        const drugs = await Drug.find(query)
            .sort({ brandName: 1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: drugs.length, data: drugs });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single drug
// @route   GET /api/pharmacy/drugs/:id
// @access  Private
exports.getDrug = async (req, res) => {
    try {
        const drug = await Drug.findById(req.params.id);
        if (!drug) {
            return res.status(404).json({ success: false, error: 'Drug not found' });
        }
        
        // Get current stock
        const batches = await DrugBatch.find({ 
            drug: req.params.id, 
            status: { $in: ['Active', 'Near-Expiry'] },
            currentQuantity: { $gt: 0 }
        });
        
        const totalStock = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
        
        res.status(200).json({ 
            success: true, 
            data: { ...drug.toObject(), totalStock, batches } 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create drug
// @route   POST /api/pharmacy/drugs
// @access  Private
exports.createDrug = async (req, res) => {
    try {
        const drug = await Drug.create(req.body);
        res.status(201).json({ success: true, data: drug });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update drug
// @route   PUT /api/pharmacy/drugs/:id
// @access  Private
exports.updateDrug = async (req, res) => {
    try {
        const drug = await Drug.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        
        if (!drug) {
            return res.status(404).json({ success: false, error: 'Drug not found' });
        }
        
        res.status(200).json({ success: true, data: drug });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Recall drug batches
// @route   POST /api/pharmacy/drugs/:id/recall
// @access  Private
exports.recallDrug = async (req, res) => {
    try {
        const drug = await Drug.findById(req.params.id);
        if (!drug) {
            return res.status(404).json({ success: false, error: 'Drug not found' });
        }
        
        drug.isRecalled = true;
        drug.recallDetails = {
            recallDate: new Date(),
            recallReason: req.body.reason,
            recallBatches: req.body.batches || [],
            recalledBy: req.body.recalledBy,
            actionTaken: req.body.actionTaken
        };
        
        await drug.save();
        
        // Update affected batches
        await DrugBatch.updateMany(
            { 
                drug: req.params.id,
                batchNumber: { $in: req.body.batches || [] }
            },
            {
                isRecalled: true,
                status: 'Recalled',
                'recallDetails.recalledAt': new Date(),
                'recallDetails.reason': req.body.reason
            }
        );
        
        const io = req.app.get('io');
        io.emit('drugRecall', { drug: drug.brandName, reason: req.body.reason });
        
        res.status(200).json({ success: true, data: drug });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== BATCHES ====================

// @desc    Get drug batches
// @route   GET /api/pharmacy/batches
// @access  Private
exports.getBatches = async (req, res) => {
    try {
        const { drug, status, expiringIn, limit = 100 } = req.query;
        const query = {};
        
        if (drug) query.drug = drug;
        if (status) query.status = status;
        
        // Expiring within days
        if (expiringIn) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + parseInt(expiringIn));
            query.expiryDate = { $lte: futureDate };
            query.status = { $in: ['Active', 'Near-Expiry'] };
        }
        
        const batches = await DrugBatch.find(query)
            .populate('drug', 'brandName genericName form')
            .sort({ expiryDate: 1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: batches.length, data: batches });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get expiring batches
// @route   GET /api/pharmacy/batches/expiring
// @access  Private
exports.getExpiringBatches = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 90;
        const batches = await DrugBatch.getExpiringBatches(days);
        
        res.status(200).json({ success: true, count: batches.length, data: batches });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Adjust batch stock
// @route   POST /api/pharmacy/batches/:id/adjust
// @access  Private
exports.adjustBatchStock = async (req, res) => {
    try {
        const batch = await DrugBatch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ success: false, error: 'Batch not found' });
        }
        
        const { adjustmentType, quantity, reason, adjustedBy } = req.body;
        
        batch.transactions.push({
            transactionType: 'Adjustment',
            quantity: adjustmentType === 'Add' ? quantity : -quantity,
            balanceAfter: adjustmentType === 'Add' 
                ? batch.currentQuantity + quantity 
                : batch.currentQuantity - quantity,
            reference: `ADJ-${Date.now()}`,
            referenceType: 'Adjustment',
            performedBy: adjustedBy,
            notes: reason
        });
        
        batch.currentQuantity = adjustmentType === 'Add' 
            ? batch.currentQuantity + quantity 
            : batch.currentQuantity - quantity;
            
        await batch.save();
        
        res.status(200).json({ success: true, data: batch });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== PRESCRIPTIONS ====================

// @desc    Get prescriptions with pharmacy details
// @route   GET /api/pharmacy/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res) => {
    try {
        const { status, date, limit = 50 } = req.query;
        const query = {};
        
        if (status) query.status = status;
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.prescriptionDate = { $gte: startOfDay, $lte: endOfDay };
        }
        
        const prescriptions = await Prescription.find(query)
            .populate('patient', 'name uhid contact')
            .sort({ prescriptionDate: -1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Dispense prescription
// @route   POST /api/pharmacy/prescriptions/:id/dispense
// @access  Private
exports.dispensePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) {
            return res.status(404).json({ success: false, error: 'Prescription not found' });
        }
        
        const { dispensingData, dispensedBy } = req.body;
        
        // Process each item
        for (const item of dispensingData) {
            const medicine = prescription.medicines.id(item.medicineId);
            if (!medicine) continue;
            
            // Get batches using FEFO
            const batches = await DrugBatch.getAvailableBatchesFEFO(medicine.drug, item.quantity);
            let remainingQty = item.quantity;
            const batchesUsed = [];
            
            for (const batch of batches) {
                if (remainingQty <= 0) break;
                
                const issueQty = Math.min(remainingQty, batch.availableQuantity);
                
                // Issue from batch
                await batch.issueStock(
                    issueQty,
                    prescription.prescriptionId,
                    'Prescription',
                    prescription.patient,
                    prescription.patientName,
                    dispensedBy,
                    `Rx: ${prescription.prescriptionId}`
                );
                
                batchesUsed.push({
                    batchId: batch._id,
                    batchNumber: batch.batchNumber,
                    quantity: issueQty,
                    expiryDate: batch.expiryDate
                });
                
                remainingQty -= issueQty;
            }
            
            // Update medicine item
            medicine.dispensedQuantity = (medicine.dispensedQuantity || 0) + (item.quantity - remainingQty);
            medicine.batchesUsed = [...(medicine.batchesUsed || []), ...batchesUsed];
            medicine.dispensedAt = new Date();
            medicine.dispensedBy = dispensedBy;
            
            if (medicine.dispensedQuantity >= medicine.quantity) {
                medicine.itemStatus = 'Dispensed';
                medicine.dispensed = true;
            } else if (remainingQty > 0) {
                medicine.itemStatus = 'Partial';
                medicine.alerts.push({
                    alertType: 'Dosage',
                    severity: 'Medium',
                    message: `Only ${item.quantity - remainingQty} of ${item.quantity} dispensed due to stock`
                });
            }
        }
        
        // Update prescription status
        const allDispensed = prescription.medicines.every(m => m.itemStatus === 'Dispensed');
        prescription.status = allDispensed ? 'Dispensed' : 'Partial';
        prescription.pharmacy.dispensedAt = new Date();
        prescription.pharmacy.dispensedBy = dispensedBy;
        
        prescription.statusHistory.push({
            status: prescription.status,
            changedAt: new Date(),
            changedBy: dispensedBy,
            reason: 'Medicines dispensed'
        });
        
        await prescription.save();
        
        const io = req.app.get('io');
        io.emit('prescriptionDispensed', prescription);
        
        res.status(200).json({ success: true, data: prescription });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Check drug allergies for patient
// @route   POST /api/pharmacy/check-allergies
// @access  Private
exports.checkAllergies = async (req, res) => {
    try {
        const { patientId, drugIds } = req.body;
        
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        const patientAllergies = (patient.allergies || []).map(a => 
            (a.allergen || a).toLowerCase()
        );
        
        const alerts = [];
        
        for (const drugId of drugIds) {
            const drug = await Drug.findById(drugId);
            if (drug && drug.allergenGroups) {
                for (const allergen of drug.allergenGroups) {
                    if (patientAllergies.includes(allergen.toLowerCase())) {
                        alerts.push({
                            drug: drug.brandName,
                            genericName: drug.genericName,
                            allergen: allergen,
                            severity: 'High',
                            message: `Patient is allergic to ${allergen}`
                        });
                    }
                }
            }
        }
        
        res.status(200).json({ 
            success: true, 
            hasAlerts: alerts.length > 0,
            data: alerts 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Check drug interactions
// @route   POST /api/pharmacy/check-interactions
// @access  Private
exports.checkInteractions = async (req, res) => {
    try {
        const { drugIds } = req.body;
        const interactions = [];
        
        const drugs = await Drug.find({ _id: { $in: drugIds } });
        
        for (let i = 0; i < drugs.length; i++) {
            for (let j = i + 1; j < drugs.length; j++) {
                const drug1 = drugs[i];
                const drug2 = drugs[j];
                
                if (drug1.drugInteractions) {
                    const interaction = drug1.drugInteractions.find(
                        int => int.drug.toLowerCase() === drug2.genericName?.toLowerCase()
                    );
                    if (interaction) {
                        interactions.push({
                            drug1: drug1.brandName,
                            drug2: drug2.brandName,
                            severity: interaction.interactionType,
                            description: interaction.description
                        });
                    }
                }
            }
        }
        
        res.status(200).json({ 
            success: true, 
            hasInteractions: interactions.length > 0,
            data: interactions 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== STOCK ISSUE ====================

// @desc    Get stock issues
// @route   GET /api/pharmacy/stock-issues
// @access  Private
exports.getStockIssues = async (req, res) => {
    try {
        const { issueType, status, patient, date, limit = 50 } = req.query;
        const query = {};
        
        if (issueType) query.issueType = issueType;
        if (status) query.status = status;
        if (patient) query.patient = patient;
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.issueDate = { $gte: startOfDay, $lte: endOfDay };
        }
        
        const issues = await StockIssue.find(query)
            .populate('patient', 'name uhid')
            .sort({ issueDate: -1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: issues.length, data: issues });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create stock issue
// @route   POST /api/pharmacy/stock-issues
// @access  Private
exports.createStockIssue = async (req, res) => {
    try {
        const issueData = {
            ...req.body,
            createdBy: req.body.createdBy || { username: 'system' }
        };
        
        // Get patient details if applicable
        if (req.body.patient) {
            const patient = await Patient.findById(req.body.patient);
            if (patient) {
                issueData.uhid = patient.uhid;
                issueData.patientName = patient.name;
            }
        }
        
        const issue = await StockIssue.create(issueData);
        
        // Issue stock from batches
        await issue.issueStock(req.body.issuedBy || 'system');
        
        res.status(201).json({ success: true, data: issue });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Process stock return
// @route   POST /api/pharmacy/stock-issues/:id/return
// @access  Private
exports.processStockReturn = async (req, res) => {
    try {
        const issue = await StockIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({ success: false, error: 'Stock issue not found' });
        }
        
        await issue.processReturn(req.body, req.body.returnedBy || 'system');
        
        res.status(200).json({ success: true, data: issue });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== INVENTORY STATS ====================

// @desc    Get pharmacy dashboard stats
// @route   GET /api/pharmacy/stats
// @access  Private
exports.getPharmacyStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Pending prescriptions
        const pendingPrescriptions = await Prescription.countDocuments({ status: 'Pending' });
        
        // Today's dispensed
        const todayDispensed = await Prescription.countDocuments({
            status: 'Dispensed',
            'pharmacy.dispensedAt': { $gte: today, $lt: tomorrow }
        });
        
        // Low stock items
        const lowStockDrugs = await Drug.aggregate([
            {
                $lookup: {
                    from: 'drugbatches',
                    localField: '_id',
                    foreignField: 'drug',
                    as: 'batches'
                }
            },
            {
                $addFields: {
                    totalStock: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$batches',
                                        as: 'batch',
                                        cond: { $in: ['$$batch.status', ['Active', 'Near-Expiry']] }
                                    }
                                },
                                as: 'activeBatch',
                                in: '$$activeBatch.currentQuantity'
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: { $lt: ['$totalStock', '$reorderLevel'] },
                    isActive: true
                }
            },
            { $count: 'count' }
        ]);
        
        // Expiring in 30 days
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        const expiringCount = await DrugBatch.countDocuments({
            expiryDate: { $lte: thirtyDaysLater },
            status: { $in: ['Active', 'Near-Expiry'] },
            currentQuantity: { $gt: 0 }
        });
        
        // Recalled drugs
        const recalledCount = await Drug.countDocuments({ isRecalled: true });
        
        res.status(200).json({
            success: true,
            data: {
                pendingPrescriptions,
                todayDispensed,
                lowStockItems: lowStockDrugs[0]?.count || 0,
                expiringIn30Days: expiringCount,
                recalledDrugs: recalledCount
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
