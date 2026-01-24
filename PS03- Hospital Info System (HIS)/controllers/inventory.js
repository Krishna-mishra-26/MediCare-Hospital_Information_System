const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const GRN = require('../models/GRN');
const Drug = require('../models/Drug');
const DrugBatch = require('../models/DrugBatch');

// ==================== VENDORS ====================

// @desc    Get all vendors
// @route   GET /api/inventory/vendors
// @access  Private
exports.getVendors = async (req, res) => {
    try {
        const { isActive, type, search, limit = 100 } = req.query;
        const query = {};
        
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (type) query.vendorType = type;
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { vendorCode: new RegExp(search, 'i') }
            ];
        }
        
        const vendors = await Vendor.find(query)
            .sort({ name: 1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: vendors.length, data: vendors });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single vendor
// @route   GET /api/inventory/vendors/:id
// @access  Private
exports.getVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }
        
        // Get recent purchase orders
        const recentPOs = await PurchaseOrder.find({ vendor: req.params.id })
            .sort({ createdAt: -1 })
            .limit(10);
            
        res.status(200).json({ 
            success: true, 
            data: { vendor, recentPurchaseOrders: recentPOs } 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create vendor
// @route   POST /api/inventory/vendors
// @access  Private
exports.createVendor = async (req, res) => {
    try {
        const vendor = await Vendor.create(req.body);
        res.status(201).json({ success: true, data: vendor });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update vendor
// @route   PUT /api/inventory/vendors/:id
// @access  Private
exports.updateVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        
        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }
        
        res.status(200).json({ success: true, data: vendor });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Blacklist vendor
// @route   POST /api/inventory/vendors/:id/blacklist
// @access  Private
exports.blacklistVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }
        
        vendor.isActive = false;
        vendor.blacklisted = {
            isBlacklisted: true,
            reason: req.body.reason,
            blacklistedAt: new Date(),
            blacklistedBy: req.body.blacklistedBy
        };
        
        await vendor.save();
        
        res.status(200).json({ success: true, data: vendor });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== PURCHASE ORDERS ====================

// @desc    Get all purchase orders
// @route   GET /api/inventory/purchase-orders
// @access  Private
exports.getPurchaseOrders = async (req, res) => {
    try {
        const { status, vendor, fromDate, toDate, limit = 50 } = req.query;
        const query = {};
        
        if (status) query.status = status;
        if (vendor) query.vendor = vendor;
        
        if (fromDate || toDate) {
            query.orderDate = {};
            if (fromDate) query.orderDate.$gte = new Date(fromDate);
            if (toDate) query.orderDate.$lte = new Date(toDate);
        }
        
        const pos = await PurchaseOrder.find(query)
            .populate('vendor', 'name vendorCode')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: pos.length, data: pos });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single purchase order
// @route   GET /api/inventory/purchase-orders/:id
// @access  Private
exports.getPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('vendor')
            .populate('items.drug', 'brandName genericName form');
            
        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }
        
        // Get related GRNs
        const grns = await GRN.find({ purchaseOrder: req.params.id });
        
        res.status(200).json({ 
            success: true, 
            data: { purchaseOrder: po, grns } 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create purchase order
// @route   POST /api/inventory/purchase-orders
// @access  Private
exports.createPurchaseOrder = async (req, res) => {
    try {
        const poData = {
            ...req.body,
            createdBy: req.body.createdBy || { username: 'system' }
        };
        
        // Get vendor details
        if (req.body.vendor) {
            const vendor = await Vendor.findById(req.body.vendor);
            if (vendor) {
                poData.vendorName = vendor.name;
                poData.paymentTerms = poData.paymentTerms || vendor.creditTerms.paymentTerms;
                poData.creditDays = poData.creditDays || vendor.creditTerms.creditDays;
            }
        }
        
        // Get drug details for items
        if (req.body.items) {
            for (let item of poData.items) {
                if (item.drug) {
                    const drug = await Drug.findById(item.drug);
                    if (drug) {
                        item.drugName = drug.brandName;
                        item.genericName = drug.genericName;
                    }
                }
            }
        }
        
        const po = await PurchaseOrder.create(poData);
        
        const io = req.app.get('io');
        io.emit('newPurchaseOrder', po);
        
        res.status(201).json({ success: true, data: po });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update purchase order
// @route   PUT /api/inventory/purchase-orders/:id
// @access  Private
exports.updatePurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }
        
        if (po.status !== 'Draft' && po.status !== 'Pending Approval') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot update PO in current status' 
            });
        }
        
        Object.assign(po, req.body);
        await po.save();
        
        res.status(200).json({ success: true, data: po });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Submit PO for approval
// @route   POST /api/inventory/purchase-orders/:id/submit
// @access  Private
exports.submitPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }
        
        po.status = 'Pending Approval';
        po.statusHistory.push({
            status: 'Pending Approval',
            changedAt: new Date(),
            changedBy: req.body.submittedBy || 'system',
            remarks: 'Submitted for approval'
        });
        
        await po.save();
        
        res.status(200).json({ success: true, data: po });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Approve purchase order
// @route   POST /api/inventory/purchase-orders/:id/approve
// @access  Private
exports.approvePurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }
        
        if (po.status !== 'Pending Approval') {
            return res.status(400).json({ 
                success: false, 
                error: 'PO is not pending approval' 
            });
        }
        
        po.status = 'Approved';
        po.approvals.push({
            level: req.body.level || 1,
            approvedBy: req.body.approvedBy,
            approvedAt: new Date(),
            remarks: req.body.remarks
        });
        
        po.statusHistory.push({
            status: 'Approved',
            changedAt: new Date(),
            changedBy: req.body.approvedBy || 'system',
            remarks: req.body.remarks || 'Approved'
        });
        
        await po.save();
        
        const io = req.app.get('io');
        io.emit('poApproved', po);
        
        res.status(200).json({ success: true, data: po });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Reject purchase order
// @route   POST /api/inventory/purchase-orders/:id/reject
// @access  Private
exports.rejectPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }
        
        po.status = 'Rejected';
        po.statusHistory.push({
            status: 'Rejected',
            changedAt: new Date(),
            changedBy: req.body.rejectedBy || 'system',
            remarks: req.body.reason
        });
        
        await po.save();
        
        res.status(200).json({ success: true, data: po });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Cancel purchase order
// @route   POST /api/inventory/purchase-orders/:id/cancel
// @access  Private
exports.cancelPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }
        
        if (po.status === 'Received' || po.status === 'Cancelled') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot cancel PO in current status' 
            });
        }
        
        po.status = 'Cancelled';
        po.cancelledAt = new Date();
        po.cancelledBy = req.body.cancelledBy;
        po.cancellationReason = req.body.reason;
        
        po.statusHistory.push({
            status: 'Cancelled',
            changedAt: new Date(),
            changedBy: req.body.cancelledBy || 'system',
            remarks: req.body.reason
        });
        
        await po.save();
        
        res.status(200).json({ success: true, data: po });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== GOODS RECEIPT NOTE ====================

// @desc    Get all GRNs
// @route   GET /api/inventory/grns
// @access  Private
exports.getGRNs = async (req, res) => {
    try {
        const { status, purchaseOrder, fromDate, toDate, limit = 50 } = req.query;
        const query = {};
        
        if (status) query.status = status;
        if (purchaseOrder) query.purchaseOrder = purchaseOrder;
        
        if (fromDate || toDate) {
            query.receiptDate = {};
            if (fromDate) query.receiptDate.$gte = new Date(fromDate);
            if (toDate) query.receiptDate.$lte = new Date(toDate);
        }
        
        const grns = await GRN.find(query)
            .populate('purchaseOrder', 'poNumber')
            .populate('vendor', 'name vendorCode')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
            
        res.status(200).json({ success: true, count: grns.length, data: grns });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single GRN
// @route   GET /api/inventory/grns/:id
// @access  Private
exports.getGRN = async (req, res) => {
    try {
        const grn = await GRN.findById(req.params.id)
            .populate('purchaseOrder')
            .populate('vendor')
            .populate('items.drug', 'brandName genericName form');
            
        if (!grn) {
            return res.status(404).json({ success: false, error: 'GRN not found' });
        }
        
        res.status(200).json({ success: true, data: grn });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create GRN
// @route   POST /api/inventory/grns
// @access  Private
exports.createGRN = async (req, res) => {
    try {
        const grnData = {
            ...req.body,
            createdBy: req.body.createdBy || { username: 'system' }
        };
        
        // Get PO details
        if (req.body.purchaseOrder) {
            const po = await PurchaseOrder.findById(req.body.purchaseOrder)
                .populate('vendor');
            
            if (po) {
                grnData.poNumber = po.poNumber;
                grnData.vendor = po.vendor._id;
                grnData.vendorName = po.vendor.name;
            }
        }
        
        // Get drug details for items
        if (req.body.items) {
            for (let item of grnData.items) {
                if (item.drug) {
                    const drug = await Drug.findById(item.drug);
                    if (drug) {
                        item.drugName = drug.brandName;
                        item.genericName = drug.genericName;
                    }
                }
            }
        }
        
        const grn = await GRN.create(grnData);
        
        // Update PO if linked
        if (grn.purchaseOrder) {
            await PurchaseOrder.findByIdAndUpdate(grn.purchaseOrder, {
                $push: { grns: grn._id }
            });
        }
        
        const io = req.app.get('io');
        io.emit('newGRN', grn);
        
        res.status(201).json({ success: true, data: grn });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Complete quality check for GRN
// @route   POST /api/inventory/grns/:id/quality-check
// @access  Private
exports.completeQualityCheck = async (req, res) => {
    try {
        const grn = await GRN.findById(req.params.id);
        if (!grn) {
            return res.status(404).json({ success: false, error: 'GRN not found' });
        }
        
        // Update items with quality check results
        for (const itemCheck of req.body.items) {
            const item = grn.items.id(itemCheck.itemId);
            if (item) {
                item.qualityCheck = {
                    ...item.qualityCheck,
                    ...itemCheck.qualityCheck,
                    checkedAt: new Date()
                };
                item.acceptedQuantity = itemCheck.acceptedQuantity;
                item.rejectedQuantity = item.receivedQuantity - itemCheck.acceptedQuantity;
                item.rejectionReason = itemCheck.rejectionReason;
            }
        }
        
        grn.qualityCheckDate = new Date();
        grn.qualityCheckedBy = req.body.checkedBy;
        grn.status = 'Quality Checked';
        
        grn.statusHistory.push({
            status: 'Quality Checked',
            changedAt: new Date(),
            changedBy: req.body.checkedBy || 'system',
            remarks: 'Quality check completed'
        });
        
        await grn.save();
        
        res.status(200).json({ success: true, data: grn });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Post GRN to inventory (create batches)
// @route   POST /api/inventory/grns/:id/post-to-inventory
// @access  Private
exports.postToInventory = async (req, res) => {
    try {
        const grn = await GRN.findById(req.params.id);
        if (!grn) {
            return res.status(404).json({ success: false, error: 'GRN not found' });
        }
        
        if (grn.status === 'Posted') {
            return res.status(400).json({ 
                success: false, 
                error: 'GRN already posted to inventory' 
            });
        }
        
        // Post to inventory using GRN method
        await grn.postToInventory(req.body.postedBy || 'system');
        
        // Update PO status
        if (grn.purchaseOrder) {
            const po = await PurchaseOrder.findById(grn.purchaseOrder);
            if (po) {
                // Check if all items received
                const totalOrdered = po.items.reduce((sum, i) => sum + i.quantity, 0);
                const totalReceived = po.items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0);
                
                if (totalReceived >= totalOrdered) {
                    po.status = 'Received';
                } else {
                    po.status = 'Partial';
                }
                
                await po.save();
            }
        }
        
        const io = req.app.get('io');
        io.emit('inventoryUpdated', { grnId: grn._id });
        
        res.status(200).json({ success: true, data: grn });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ==================== INVENTORY STATS ====================

// @desc    Get inventory dashboard stats
// @route   GET /api/inventory/stats
// @access  Private
exports.getInventoryStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Pending POs
        const pendingPOs = await PurchaseOrder.countDocuments({ 
            status: { $in: ['Draft', 'Pending Approval'] } 
        });
        
        // Approved POs pending receipt
        const approvedPendingReceipt = await PurchaseOrder.countDocuments({ 
            status: 'Approved' 
        });
        
        // Pending GRNs for QC
        const pendingQC = await GRN.countDocuments({ status: 'Received' });
        
        // Total active vendors
        const activeVendors = await Vendor.countDocuments({ isActive: true });
        
        // Total drug SKUs
        const totalDrugs = await Drug.countDocuments({ isActive: true });
        
        // Total inventory value
        const inventoryValue = await DrugBatch.aggregate([
            {
                $match: { 
                    status: { $in: ['Active', 'Near-Expiry'] },
                    currentQuantity: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ['$currentQuantity', '$costPrice'] } }
                }
            }
        ]);
        
        // Low stock alerts
        const lowStockCount = await Drug.countDocuments({
            currentStock: { $lt: '$reorderLevel' },
            isActive: true
        });
        
        res.status(200).json({
            success: true,
            data: {
                pendingPOs,
                approvedPendingReceipt,
                pendingQC,
                activeVendors,
                totalDrugs,
                inventoryValue: inventoryValue[0]?.totalValue || 0,
                lowStockAlerts: lowStockCount
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get low stock report
// @route   GET /api/inventory/reports/low-stock
// @access  Private
exports.getLowStockReport = async (req, res) => {
    try {
        const drugs = await Drug.aggregate([
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
            {
                $project: {
                    brandName: 1,
                    genericName: 1,
                    form: 1,
                    totalStock: 1,
                    reorderLevel: 1,
                    reorderQuantity: 1,
                    shortfall: { $subtract: ['$reorderLevel', '$totalStock'] }
                }
            },
            { $sort: { shortfall: -1 } }
        ]);
        
        res.status(200).json({ success: true, count: drugs.length, data: drugs });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get expiry report
// @route   GET /api/inventory/reports/expiry
// @access  Private
exports.getExpiryReport = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 90;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        const batches = await DrugBatch.find({
            expiryDate: { $lte: futureDate },
            status: { $in: ['Active', 'Near-Expiry'] },
            currentQuantity: { $gt: 0 }
        })
        .populate('drug', 'brandName genericName form')
        .sort({ expiryDate: 1 });
        
        const report = batches.map(b => ({
            drug: b.drug?.brandName,
            genericName: b.drug?.genericName,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            currentQuantity: b.currentQuantity,
            daysToExpiry: Math.ceil((b.expiryDate - new Date()) / (1000 * 60 * 60 * 24)),
            value: b.currentQuantity * b.costPrice
        }));
        
        res.status(200).json({ success: true, count: report.length, data: report });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get stock movement report
// @route   GET /api/inventory/reports/movement
// @access  Private
exports.getStockMovementReport = async (req, res) => {
    try {
        const { drugId, fromDate, toDate } = req.query;
        
        const startDate = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = toDate ? new Date(toDate) : new Date();
        
        const query = {
            'transactions.transactionDate': { $gte: startDate, $lte: endDate }
        };
        
        if (drugId) query.drug = drugId;
        
        const batches = await DrugBatch.find(query)
            .populate('drug', 'brandName genericName')
            .select('batchNumber drug transactions');
            
        const movements = [];
        
        for (const batch of batches) {
            const filteredTxns = batch.transactions.filter(
                t => t.transactionDate >= startDate && t.transactionDate <= endDate
            );
            
            for (const txn of filteredTxns) {
                movements.push({
                    drug: batch.drug?.brandName,
                    genericName: batch.drug?.genericName,
                    batchNumber: batch.batchNumber,
                    transactionType: txn.transactionType,
                    quantity: txn.quantity,
                    balanceAfter: txn.balanceAfter,
                    reference: txn.reference,
                    transactionDate: txn.transactionDate,
                    performedBy: txn.performedBy
                });
            }
        }
        
        movements.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
        
        res.status(200).json({ success: true, count: movements.length, data: movements });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
