// Real-time Socket.io Event Handler for Hospital IS
// Manages real-time synchronization across all modules and roles

class SocketEventHandler {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map(); // Map of socket.id -> user info
        this.userSockets = new Map(); // Map of userId -> socket.id[]
        this.roomSubscriptions = new Map(); // Track room subscriptions
    }

    initialize() {
        this.io.on('connection', (socket) => {
            console.log(`Socket connected: ${socket.id}`);

            // Handle user authentication
            socket.on('authenticate', (userData) => {
                this.handleAuthentication(socket, userData);
            });

            // Handle joining module-specific rooms
            socket.on('joinModule', (module) => {
                this.joinModuleRoom(socket, module);
            });

            // Handle leaving module rooms
            socket.on('leaveModule', (module) => {
                socket.leave(`module:${module}`);
            });

            // Handle subscribing to patient updates
            socket.on('subscribePatient', (patientId) => {
                socket.join(`patient:${patientId}`);
            });

            // Handle department-specific rooms
            socket.on('joinDepartment', (department) => {
                socket.join(`dept:${department}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });
        });
    }

    handleAuthentication(socket, userData) {
        if (!userData || !userData.userId) return;

        // Store user info
        this.connectedUsers.set(socket.id, {
            ...userData,
            connectedAt: new Date()
        });

        // Map user to socket(s) for targeted messaging
        if (!this.userSockets.has(userData.userId)) {
            this.userSockets.set(userData.userId, []);
        }
        this.userSockets.get(userData.userId).push(socket.id);

        // Auto-join role-based room
        socket.join(`role:${userData.role}`);
        
        // Auto-join department room if applicable
        if (userData.department) {
            socket.join(`dept:${userData.department}`);
        }

        // Notify user of successful connection
        socket.emit('authenticated', { 
            success: true, 
            message: 'Real-time sync enabled',
            rooms: [`role:${userData.role}`, userData.department ? `dept:${userData.department}` : null].filter(Boolean)
        });

        console.log(`User authenticated: ${userData.username} (${userData.role})`);
    }

    handleDisconnection(socket) {
        const userData = this.connectedUsers.get(socket.id);
        if (userData) {
            // Remove from user sockets map
            const sockets = this.userSockets.get(userData.userId) || [];
            const index = sockets.indexOf(socket.id);
            if (index > -1) {
                sockets.splice(index, 1);
            }
            if (sockets.length === 0) {
                this.userSockets.delete(userData.userId);
            }
        }
        this.connectedUsers.delete(socket.id);
        console.log(`Socket disconnected: ${socket.id}`);
    }

    joinModuleRoom(socket, module) {
        const userData = this.connectedUsers.get(socket.id);
        if (!userData) {
            socket.emit('error', { message: 'Please authenticate first' });
            return;
        }

        // Module access validation based on role
        const moduleAccess = this.checkModuleAccess(userData.role, module);
        if (moduleAccess) {
            socket.join(`module:${module}`);
            socket.emit('joinedModule', { module, success: true });
        } else {
            socket.emit('error', { message: `Access denied to ${module} module` });
        }
    }

    checkModuleAccess(role, module) {
        const roleModules = {
            admin: ['all'],
            doctor: ['patients', 'emr', 'opd', 'ipd', 'emergency', 'ot', 'lab', 'radiology', 'pharmacy', 'prescriptions', 'appointments', 'triage'],
            nurse: ['patients', 'opd', 'ipd', 'emergency', 'triage', 'beds', 'lab', 'pharmacy', 'emr'],
            receptionist: ['patients', 'opd', 'appointments', 'billing', 'insurance', 'beds'],
            pharmacist: ['pharmacy', 'prescriptions', 'inventory', 'patients'],
            lab_technician: ['lab', 'patients'],
            radiologist: ['radiology', 'patients', 'emr'],
            radiology_technician: ['radiology', 'patients'],
            billing_clerk: ['billing', 'patients', 'insurance'],
            inventory_manager: ['inventory', 'pharmacy'],
            insurance_coordinator: ['insurance', 'patients', 'billing']
        };

        const modules = roleModules[role] || [];
        return modules.includes('all') || modules.includes(module);
    }

    // ==================== EMIT METHODS FOR CONTROLLERS ====================

    // Patient Events
    emitPatientCreated(patient) {
        this.io.to('module:patients').emit('patientCreated', patient);
        this.io.to('role:receptionist').emit('newPatientRegistered', patient);
    }

    emitPatientUpdated(patient) {
        this.io.to('module:patients').emit('patientUpdated', patient);
        this.io.to(`patient:${patient._id}`).emit('patientDataChanged', patient);
    }

    emitPatientVitalsUpdated(patientId, vitals, updatedBy) {
        this.io.to(`patient:${patientId}`).emit('vitalsUpdated', { patientId, vitals, updatedBy });
        this.io.to('role:doctor').emit('patientVitalsAlert', { patientId, vitals });
        this.io.to('role:nurse').emit('patientVitalsAlert', { patientId, vitals });
    }

    // Appointment Events
    emitAppointmentCreated(appointment) {
        this.io.to('module:appointments').emit('appointmentCreated', appointment);
        this.io.to('role:doctor').emit('newAppointment', appointment);
        this.io.to('role:receptionist').emit('appointmentBooked', appointment);
    }

    emitAppointmentUpdated(appointment) {
        this.io.to('module:appointments').emit('appointmentUpdated', appointment);
        if (appointment.doctor) {
            this.emitToUser(appointment.doctor, 'appointmentChanged', appointment);
        }
    }

    emitAppointmentStatusChanged(appointment, oldStatus, newStatus) {
        this.io.to('module:appointments').emit('appointmentStatusChanged', { 
            appointment, oldStatus, newStatus 
        });
        // Notify doctor when patient checks in
        if (newStatus === 'Checked-In') {
            this.io.to('role:doctor').emit('patientArrived', appointment);
        }
    }

    emitQueueUpdated(departmentOrDoctor, queue) {
        this.io.to(`dept:${departmentOrDoctor}`).emit('queueUpdated', queue);
        this.io.to('module:opd').emit('opdQueueUpdated', queue);
    }

    // Triage Events
    emitTriageCreated(triage) {
        this.io.to('module:triage').emit('triageCreated', triage);
        this.io.to('module:emergency').emit('newTriageCase', triage);
        
        // Alert based on triage color
        if (['Red', 'Orange'].includes(triage.triageCategory)) {
            this.io.to('role:doctor').emit('criticalTriageAlert', triage);
            this.io.to('role:nurse').emit('criticalTriageAlert', triage);
        }
    }

    emitTriageUpdated(triage) {
        this.io.to('module:triage').emit('triageUpdated', triage);
        this.io.to('module:emergency').emit('triageCaseUpdated', triage);
    }

    emitEmergencyQueueUpdated(queue) {
        this.io.to('module:emergency').emit('emergencyQueueUpdated', queue);
        this.io.to('role:doctor').emit('emergencyQueueChanged', queue);
    }

    // Lab Events
    emitLabOrderCreated(labOrder) {
        this.io.to('module:lab').emit('labOrderCreated', labOrder);
        this.io.to('role:lab_technician').emit('newLabOrder', labOrder);
    }

    emitLabSampleCollected(labOrder) {
        this.io.to('module:lab').emit('labSampleCollected', labOrder);
        this.io.to(`patient:${labOrder.patient}`).emit('labSampleCollected', labOrder);
    }

    emitLabResultUpdated(labOrder) {
        this.io.to('module:lab').emit('labResultUpdated', labOrder);
        this.io.to(`patient:${labOrder.patient}`).emit('labResultReady', labOrder);
        this.io.to('role:doctor').emit('labResultAvailable', labOrder);
        
        // If critical value, alert immediately
        if (labOrder.criticalValue) {
            this.io.to('role:doctor').emit('criticalLabValue', labOrder);
            this.io.to('role:nurse').emit('criticalLabValue', labOrder);
        }
    }

    emitLabStatusChanged(labOrder, status) {
        this.io.to('module:lab').emit('labStatusChanged', { labOrder, status });
    }

    // Radiology Events
    emitImagingOrderCreated(imaging) {
        this.io.to('module:radiology').emit('imagingOrderCreated', imaging);
        this.io.to('role:radiology_technician').emit('newImagingOrder', imaging);
    }

    emitImagingStarted(imaging) {
        this.io.to('module:radiology').emit('imagingStarted', imaging);
        this.io.to(`patient:${imaging.patient}`).emit('imagingInProgress', imaging);
    }

    emitImagingCompleted(imaging) {
        this.io.to('module:radiology').emit('imagingCompleted', imaging);
        this.io.to('role:radiologist').emit('imagingReadyForReport', imaging);
    }

    emitImagingReportAdded(imaging) {
        this.io.to('module:radiology').emit('imagingReportAdded', imaging);
        this.io.to(`patient:${imaging.patient}`).emit('imagingReportReady', imaging);
        this.io.to('role:doctor').emit('imagingReportAvailable', imaging);
    }

    emitImagingStatusChanged(imaging, status, updatedBy) {
        this.io.to('module:radiology').emit('imagingStatusChanged', { imaging, status, updatedBy });
    }

    // Pharmacy Events
    emitPrescriptionCreated(prescription) {
        this.io.to('module:pharmacy').emit('prescriptionCreated', prescription);
        this.io.to('role:pharmacist').emit('newPrescription', prescription);
    }

    emitPrescriptionDispensed(prescription) {
        this.io.to('module:pharmacy').emit('prescriptionDispensed', prescription);
        this.io.to(`patient:${prescription.patient}`).emit('medicinesReady', prescription);
        this.io.to('role:doctor').emit('prescriptionDispensed', prescription);
    }

    emitDrugAllergyAlert(patientId, drug, allergy) {
        this.io.to('role:doctor').emit('drugAllergyAlert', { patientId, drug, allergy });
        this.io.to('role:pharmacist').emit('drugAllergyAlert', { patientId, drug, allergy });
    }

    emitDrugInteractionAlert(patientId, drugs, interaction) {
        this.io.to('role:doctor').emit('drugInteractionAlert', { patientId, drugs, interaction });
        this.io.to('role:pharmacist').emit('drugInteractionAlert', { patientId, drugs, interaction });
    }

    emitLowStockAlert(drug, currentStock, reorderLevel) {
        this.io.to('role:pharmacist').emit('lowStockAlert', { drug, currentStock, reorderLevel });
        this.io.to('role:inventory_manager').emit('lowStockAlert', { drug, currentStock, reorderLevel });
    }

    emitDrugExpiryAlert(drug, batch, daysToExpiry) {
        this.io.to('role:pharmacist').emit('drugExpiryAlert', { drug, batch, daysToExpiry });
        this.io.to('role:inventory_manager').emit('drugExpiryAlert', { drug, batch, daysToExpiry });
    }

    // Inventory Events
    emitPurchaseOrderCreated(po) {
        this.io.to('module:inventory').emit('purchaseOrderCreated', po);
        this.io.to('role:inventory_manager').emit('newPurchaseOrder', po);
    }

    emitPurchaseOrderApproved(po) {
        this.io.to('module:inventory').emit('purchaseOrderApproved', po);
    }

    emitGRNCreated(grn) {
        this.io.to('module:inventory').emit('grnCreated', grn);
        this.io.to('role:inventory_manager').emit('goodsReceived', grn);
    }

    emitInventoryUpdated(item, changeType, quantity) {
        this.io.to('module:inventory').emit('inventoryUpdated', { item, changeType, quantity });
        this.io.to('module:pharmacy').emit('stockUpdated', { item, changeType, quantity });
    }

    // Insurance Events
    emitInsurancePolicyCreated(policy) {
        this.io.to('module:insurance').emit('policyCreated', policy);
    }

    emitPreAuthRequested(preAuth) {
        this.io.to('module:insurance').emit('preAuthRequested', preAuth);
        this.io.to('role:insurance_coordinator').emit('newPreAuthRequest', preAuth);
    }

    emitPreAuthUpdated(preAuth, status) {
        this.io.to('module:insurance').emit('preAuthUpdated', { preAuth, status });
        this.io.to('role:billing_clerk').emit('preAuthStatusChanged', { preAuth, status });
    }

    emitClaimSubmitted(claim) {
        this.io.to('module:insurance').emit('claimSubmitted', claim);
        this.io.to('role:insurance_coordinator').emit('newClaim', claim);
    }

    emitClaimStatusChanged(claim, status) {
        this.io.to('module:insurance').emit('claimStatusChanged', { claim, status });
        this.io.to('role:billing_clerk').emit('claimStatusChanged', { claim, status });
    }

    // EMR Events
    emitEMRCreated(emr) {
        this.io.to('module:emr').emit('emrCreated', emr);
        this.io.to(`patient:${emr.patient}`).emit('emrRecordCreated', emr);
    }

    emitEMRUpdated(emr) {
        this.io.to('module:emr').emit('emrUpdated', emr);
        this.io.to(`patient:${emr.patient}`).emit('emrRecordUpdated', emr);
    }

    emitProgressNoteAdded(emrId, progressNote, patientId) {
        this.io.to(`patient:${patientId}`).emit('progressNoteAdded', { emrId, progressNote });
        this.io.to('role:doctor').emit('progressNoteAdded', { emrId, progressNote });
        this.io.to('role:nurse').emit('progressNoteAdded', { emrId, progressNote });
    }

    emitDiagnosisAdded(emrId, diagnosis, patientId) {
        this.io.to(`patient:${patientId}`).emit('diagnosisAdded', { emrId, diagnosis });
        this.io.to('role:doctor').emit('diagnosisAdded', { emrId, diagnosis });
    }

    emitAllergyAdded(patientId, allergy) {
        this.io.to(`patient:${patientId}`).emit('allergyAdded', allergy);
        this.io.to('role:doctor').emit('patientAllergyAdded', { patientId, allergy });
        this.io.to('role:pharmacist').emit('patientAllergyAdded', { patientId, allergy });
    }

    emitDischargeSummaryGenerated(emr, summary) {
        this.io.to('module:emr').emit('dischargeSummaryGenerated', { emr, summary });
        this.io.to(`patient:${emr.patient}`).emit('dischargeSummaryReady', summary);
        this.io.to('role:billing_clerk').emit('patientDischarging', { emr, summary });
    }

    // Billing Events
    emitBillCreated(bill) {
        this.io.to('module:billing').emit('billCreated', bill);
        this.io.to('role:billing_clerk').emit('newBill', bill);
    }

    emitBillUpdated(bill) {
        this.io.to('module:billing').emit('billUpdated', bill);
        this.io.to(`patient:${bill.patient}`).emit('billUpdated', bill);
    }

    emitPaymentReceived(bill, payment) {
        this.io.to('module:billing').emit('paymentReceived', { bill, payment });
        this.io.to('role:receptionist').emit('paymentReceived', { bill, payment });
    }

    // Bed Events
    emitBedStatusChanged(bed, newStatus, patient) {
        this.io.to('module:beds').emit('bedStatusChanged', { bed, newStatus, patient });
        this.io.to('role:nurse').emit('bedStatusChanged', { bed, newStatus, patient });
        this.io.to('role:receptionist').emit('bedAvailabilityChanged', { bed, newStatus });
    }

    emitBedTransfer(transfer) {
        this.io.to('module:beds').emit('bedTransfer', transfer);
        this.io.to('role:nurse').emit('patientTransferred', transfer);
    }

    // Surgery/OT Events
    emitSurgeryScheduled(surgery) {
        this.io.to('module:ot').emit('surgeryScheduled', surgery);
        this.io.to('role:doctor').emit('surgeryScheduled', surgery);
    }

    emitSurgeryStatusChanged(surgery, status) {
        this.io.to('module:ot').emit('surgeryStatusChanged', { surgery, status });
        if (status === 'In Progress') {
            this.io.to('role:nurse').emit('surgeryStarted', surgery);
        } else if (status === 'Completed') {
            this.io.to('role:nurse').emit('surgeryCompleted', surgery);
            this.io.to(`patient:${surgery.patient}`).emit('surgeryCompleted', surgery);
        }
    }

    // Dashboard/Stats Events
    emitDashboardUpdate(stats) {
        this.io.emit('dashboardUpdate', stats);
    }

    emitModuleStatsUpdate(module, stats) {
        this.io.to(`module:${module}`).emit('moduleStatsUpdate', { module, stats });
    }

    // Utility: Send to specific user
    emitToUser(userId, event, data) {
        const sockets = this.userSockets.get(userId.toString());
        if (sockets) {
            sockets.forEach(socketId => {
                this.io.to(socketId).emit(event, data);
            });
        }
    }

    // Utility: Broadcast to all except sender
    broadcastExceptSender(socket, event, data) {
        socket.broadcast.emit(event, data);
    }

    // Global notification
    emitGlobalNotification(notification) {
        this.io.emit('globalNotification', notification);
    }

    // Role-specific notification
    emitRoleNotification(role, notification) {
        this.io.to(`role:${role}`).emit('notification', notification);
    }
}

module.exports = SocketEventHandler;
