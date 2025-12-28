const Patient = require('../models/Patient');
const Bill = require('../models/Bill');
const Surgery = require('../models/Surgery');
const LabTest = require('../models/LabTest');
const Imaging = require('../models/Imaging');
const Prescription = require('../models/Prescription');
const Bed = require('../models/Bed');
const Ward = require('../models/Ward');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
    try {
        // Patient counts
        const totalPatients = await Patient.countDocuments();
        const opdCount = await Patient.countDocuments({ type: 'OPD' });
        const ipdCount = await Patient.countDocuments({ type: 'IPD' });
        const emergencyCount = await Patient.countDocuments({ type: 'Emergency' });
        
        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayPatients = await Patient.countDocuments({
            createdAt: { $gte: today, $lt: tomorrow }
        });

        // Today's OPD count specifically
        const todayOPD = await Patient.countDocuments({
            type: 'OPD',
            createdAt: { $gte: today, $lt: tomorrow }
        });
        
        // Revenue calculation from bills
        const allBills = await Bill.find();
        const totalRevenue = allBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
        
        const todayBills = await Bill.find({
            createdAt: { $gte: today, $lt: tomorrow }
        });
        const todayRevenue = todayBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
        
        // Yesterday's revenue for comparison
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayBills = await Bill.find({
            createdAt: { $gte: yesterday, $lt: today }
        });
        const yesterdayRevenue = yesterdayBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
        
        // Pending counts
        const pendingLabTests = await LabTest.countDocuments({ status: 'Pending' });
        const pendingImaging = await Imaging.countDocuments({ status: 'Scheduled' });
        const scheduledSurgeries = await Surgery.countDocuments({ status: 'Scheduled' });
        
        // Today's surgeries
        const todaySurgeries = await Surgery.countDocuments({
            date: { $gte: today, $lt: tomorrow }
        });
        
        // Active IPD patients (bed occupancy)
        const activeIPD = await Patient.countDocuments({ type: 'IPD', status: 'Active' });
        
        // Get bed stats from Bed model
        const totalBeds = await Bed.countDocuments();
        const occupiedBeds = await Bed.countDocuments({ status: 'occupied' });
        const availableBeds = await Bed.countDocuments({ status: 'available' });
        const criticalBeds = await Bed.countDocuments({ status: 'critical' });
        const maintenanceBeds = await Bed.countDocuments({ status: 'maintenance' });
        const bedOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
        
        // Critical patients
        const criticalPatients = await Patient.countDocuments({ severity: 'Critical' });
        
        // Department stats
        const departmentStats = await Patient.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);
        
        // Pending bills (unpaid)
        const pendingBills = await Bill.countDocuments({ paymentStatus: 'Unpaid' });
        
        // Pending prescriptions
        const pendingPrescriptions = await Prescription.countDocuments({ status: 'Pending' });
        
        // Insurance claims (from localStorage will be handled in frontend)
        // Low stock items (from localStorage will be handled in frontend)
        
        // Recent admissions (last 5 IPD patients)
        const recentAdmissions = await Patient.find({ type: 'IPD' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name diagnosis department createdAt ward bed status');
        
        // Today's schedule (surgeries and appointments)
        const todaySchedule = await Surgery.find({
            date: { $gte: today, $lt: tomorrow }
        }).sort({ time: 1 }).limit(10);
        
        // Get OT room status from HospitalConfig (will be handled in frontend)
        
        res.status(200).json({
            success: true,
            data: {
                // Primary metrics
                totalPatients,
                opdCount,
                ipdCount,
                emergencyCount,
                todayPatients,
                todayOPD,
                
                // Revenue
                totalRevenue: totalRevenue / 100000, // In Lakhs
                todayRevenue: todayRevenue / 100000,
                yesterdayRevenue: yesterdayRevenue / 100000,
                
                // Pending items
                pendingLabTests,
                pendingImaging,
                scheduledSurgeries,
                todaySurgeries,
                pendingBills,
                pendingPrescriptions,
                
                // Bed stats
                totalBeds: totalBeds || 100, // Default if no beds configured
                occupiedBeds,
                availableBeds,
                criticalBeds,
                maintenanceBeds,
                activeIPD,
                bedOccupancy,
                
                // Critical
                criticalPatients,
                
                // Department breakdown
                departmentStats,
                
                // Recent data
                recentAdmissions,
                todaySchedule
            }
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(400).json({ success: false, error: err.message });
    }
};