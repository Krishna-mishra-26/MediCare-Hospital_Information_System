// Real-time Socket.io Client Handler for Hospital IS
// Manages real-time synchronization and notifications

class RealtimeHandler {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.notificationQueue = [];
    }

    // Initialize Socket.io connection
    initialize() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token || !user.id) {
            console.log('No auth token, skipping socket connection');
            return;
        }

        // Connect to Socket.io
        this.socket = io({
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.setupConnectionHandlers();
        this.setupEventListeners();

        // Authenticate after connection
        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);

            // Authenticate with user info
            this.socket.emit('authenticate', {
                userId: user.id,
                username: user.username,
                role: user.role,
                department: user.department
            });

            // Join relevant module rooms based on current page
            this.joinRelevantRooms();
        });
    }

    setupConnectionHandlers() {
        this.socket.on('authenticated', (data) => {
            console.log('Socket authenticated:', data);
            this.showNotification('success', 'Real-time sync enabled');
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            this.updateConnectionStatus(false);
            console.log('Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            this.reconnectAttempts++;
            console.error('Socket connection error:', error);
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.showNotification('error', 'Real-time connection failed');
            }
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showNotification('error', error.message || 'Connection error');
        });
    }

    setupEventListeners() {
        // ==================== PATIENT EVENTS ====================
        this.socket.on('patientCreated', (patient) => {
            this.handleEvent('patientCreated', patient);
            this.showNotification('info', `New patient registered: ${patient.firstName} ${patient.lastName}`);
            this.refreshIfModule('patients');
        });

        this.socket.on('patientUpdated', (patient) => {
            this.handleEvent('patientUpdated', patient);
            this.refreshIfModule('patients');
        });

        this.socket.on('vitalsUpdated', (data) => {
            this.handleEvent('vitalsUpdated', data);
            this.showNotification('info', `Vitals updated for patient`);
        });

        // ==================== APPOINTMENT EVENTS ====================
        this.socket.on('appointmentCreated', (appointment) => {
            this.handleEvent('appointmentCreated', appointment);
            this.refreshIfModule('appointments');
        });

        this.socket.on('appointmentStatusChanged', (data) => {
            this.handleEvent('appointmentStatusChanged', data);
            this.refreshIfModule('opd');
        });

        this.socket.on('patientArrived', (appointment) => {
            this.handleEvent('patientArrived', appointment);
            this.showNotification('info', `Patient checked in for appointment`);
        });

        this.socket.on('opdQueueUpdated', (queue) => {
            this.handleEvent('opdQueueUpdated', queue);
            this.refreshIfModule('opd');
        });

        // ==================== TRIAGE/EMERGENCY EVENTS ====================
        this.socket.on('triageCreated', (triage) => {
            this.handleEvent('triageCreated', triage);
            this.refreshIfModule('emergency');
        });

        this.socket.on('criticalTriageAlert', (triage) => {
            this.handleEvent('criticalTriageAlert', triage);
            const color = triage.triageCategory;
            this.showNotification('critical', `🚨 Critical Triage: ${color} category patient`, true);
            this.playAlertSound();
        });

        this.socket.on('emergencyQueueUpdated', (queue) => {
            this.handleEvent('emergencyQueueUpdated', queue);
            this.refreshIfModule('emergency');
        });

        // ==================== LAB EVENTS ====================
        this.socket.on('labOrderCreated', (labOrder) => {
            this.handleEvent('labOrderCreated', labOrder);
            this.showNotification('info', 'New lab order received');
            this.refreshIfModule('lab');
        });

        this.socket.on('labSampleCollected', (labOrder) => {
            this.handleEvent('labSampleCollected', labOrder);
            this.refreshIfModule('lab');
        });

        this.socket.on('labResultUpdated', (labOrder) => {
            this.handleEvent('labResultUpdated', labOrder);
            this.refreshIfModule('lab');
        });

        this.socket.on('criticalLabValue', (labOrder) => {
            this.handleEvent('criticalLabValue', labOrder);
            this.showNotification('critical', `🚨 Critical Lab Value: ${labOrder.testName}`, true);
            this.playAlertSound();
        });

        this.socket.on('labStatusChanged', (data) => {
            this.handleEvent('labStatusChanged', data);
            this.refreshIfModule('lab');
        });

        // ==================== RADIOLOGY EVENTS ====================
        this.socket.on('imagingOrderCreated', (imaging) => {
            this.handleEvent('imagingOrderCreated', imaging);
            this.showNotification('info', 'New imaging order received');
            this.refreshIfModule('radiology');
        });

        this.socket.on('imagingStarted', (imaging) => {
            this.handleEvent('imagingStarted', imaging);
            this.refreshIfModule('radiology');
        });

        this.socket.on('imagingCompleted', (imaging) => {
            this.handleEvent('imagingCompleted', imaging);
            this.showNotification('info', 'Imaging ready for reporting');
            this.refreshIfModule('radiology');
        });

        this.socket.on('imagingReportAdded', (imaging) => {
            this.handleEvent('imagingReportAdded', imaging);
            this.showNotification('success', 'Imaging report available');
            this.refreshIfModule('radiology');
        });

        this.socket.on('imagingStatusChanged', (data) => {
            this.handleEvent('imagingStatusChanged', data);
            this.refreshIfModule('radiology');
        });

        // ==================== PHARMACY EVENTS ====================
        this.socket.on('prescriptionCreated', (prescription) => {
            this.handleEvent('prescriptionCreated', prescription);
            this.showNotification('info', 'New prescription received');
            this.refreshIfModule('pharmacy');
        });

        this.socket.on('prescriptionDispensed', (prescription) => {
            this.handleEvent('prescriptionDispensed', prescription);
            this.refreshIfModule('pharmacy');
        });

        this.socket.on('drugAllergyAlert', (data) => {
            this.handleEvent('drugAllergyAlert', data);
            this.showNotification('critical', `⚠️ Drug Allergy Alert: ${data.drug}`, true);
            this.playAlertSound();
        });

        this.socket.on('drugInteractionAlert', (data) => {
            this.handleEvent('drugInteractionAlert', data);
            this.showNotification('warning', `⚠️ Drug Interaction Alert`, true);
        });

        this.socket.on('lowStockAlert', (data) => {
            this.handleEvent('lowStockAlert', data);
            this.showNotification('warning', `Low stock: ${data.drug}`);
        });

        this.socket.on('drugExpiryAlert', (data) => {
            this.handleEvent('drugExpiryAlert', data);
            this.showNotification('warning', `Drug expiring soon: ${data.drug}`);
        });

        // ==================== INVENTORY EVENTS ====================
        this.socket.on('purchaseOrderCreated', (po) => {
            this.handleEvent('purchaseOrderCreated', po);
            this.refreshIfModule('inventory');
        });

        this.socket.on('purchaseOrderApproved', (po) => {
            this.handleEvent('purchaseOrderApproved', po);
            this.showNotification('success', 'Purchase order approved');
            this.refreshIfModule('inventory');
        });

        this.socket.on('grnCreated', (grn) => {
            this.handleEvent('grnCreated', grn);
            this.showNotification('info', 'Goods received');
            this.refreshIfModule('inventory');
        });

        this.socket.on('inventoryUpdated', (data) => {
            this.handleEvent('inventoryUpdated', data);
            this.refreshIfModule('inventory');
        });

        // ==================== INSURANCE EVENTS ====================
        this.socket.on('preAuthRequested', (preAuth) => {
            this.handleEvent('preAuthRequested', preAuth);
            this.refreshIfModule('insurance');
        });

        this.socket.on('preAuthUpdated', (data) => {
            this.handleEvent('preAuthUpdated', data);
            this.showNotification('info', `Pre-auth status: ${data.status}`);
            this.refreshIfModule('insurance');
        });

        this.socket.on('claimSubmitted', (claim) => {
            this.handleEvent('claimSubmitted', claim);
            this.refreshIfModule('insurance');
        });

        this.socket.on('claimStatusChanged', (data) => {
            this.handleEvent('claimStatusChanged', data);
            this.showNotification('info', `Claim status: ${data.status}`);
            this.refreshIfModule('insurance');
        });

        // ==================== EMR EVENTS ====================
        this.socket.on('emrUpdated', (emr) => {
            this.handleEvent('emrUpdated', emr);
            this.refreshIfModule('emr');
        });

        this.socket.on('progressNoteAdded', (data) => {
            this.handleEvent('progressNoteAdded', data);
        });

        this.socket.on('diagnosisAdded', (data) => {
            this.handleEvent('diagnosisAdded', data);
        });

        this.socket.on('dischargeSummaryGenerated', (data) => {
            this.handleEvent('dischargeSummaryGenerated', data);
            this.showNotification('info', 'Discharge summary ready');
        });

        // ==================== BILLING EVENTS ====================
        this.socket.on('billCreated', (bill) => {
            this.handleEvent('billCreated', bill);
            this.refreshIfModule('billing');
        });

        this.socket.on('paymentReceived', (data) => {
            this.handleEvent('paymentReceived', data);
            this.showNotification('success', `Payment received: ₹${data.payment.amount}`);
            this.refreshIfModule('billing');
        });

        // ==================== BED EVENTS ====================
        this.socket.on('bedStatusChanged', (data) => {
            this.handleEvent('bedStatusChanged', data);
            this.refreshIfModule('beds');
        });

        this.socket.on('bedAvailabilityChanged', (data) => {
            this.handleEvent('bedAvailabilityChanged', data);
            this.refreshIfModule('ipd');
        });

        // ==================== SURGERY EVENTS ====================
        this.socket.on('surgeryScheduled', (surgery) => {
            this.handleEvent('surgeryScheduled', surgery);
            this.refreshIfModule('surgery');
        });

        this.socket.on('surgeryStatusChanged', (data) => {
            this.handleEvent('surgeryStatusChanged', data);
            if (data.status === 'In Progress') {
                this.showNotification('info', 'Surgery in progress');
            } else if (data.status === 'Completed') {
                this.showNotification('success', 'Surgery completed');
            }
            this.refreshIfModule('surgery');
        });

        // ==================== DASHBOARD EVENTS ====================
        this.socket.on('dashboardUpdate', (stats) => {
            this.handleEvent('dashboardUpdate', stats);
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats(stats);
            }
        });

        // ==================== NOTIFICATIONS ====================
        this.socket.on('notification', (notification) => {
            this.handleEvent('notification', notification);
            this.showNotification(notification.type || 'info', notification.message);
        });

        this.socket.on('globalNotification', (notification) => {
            this.handleEvent('globalNotification', notification);
            this.showNotification(notification.type || 'info', notification.message, true);
        });

        // ==================== PERMISSIONS ====================
        this.socket.on('permissionsUpdated', (data) => {
            // Update local permissions
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.role = data.role;
            user.permissions = data.permissions;
            localStorage.setItem('user', JSON.stringify(user));
            
            this.showNotification('info', 'Your permissions have been updated');
            // Refresh UI to reflect new permissions
            setTimeout(() => location.reload(), 2000);
        });
    }

    // Join module rooms based on current page
    joinRelevantRooms() {
        const currentModule = this.getCurrentModule();
        if (currentModule) {
            this.socket.emit('joinModule', currentModule);
        }

        // Also join general modules based on role
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const modulesByRole = {
            admin: ['patients', 'opd', 'ipd', 'emergency', 'lab', 'radiology', 'pharmacy', 'inventory', 'insurance', 'billing'],
            doctor: ['patients', 'opd', 'ipd', 'emergency', 'lab', 'radiology', 'pharmacy', 'emr'],
            nurse: ['patients', 'opd', 'ipd', 'emergency', 'triage', 'beds', 'emr'],
            receptionist: ['patients', 'opd', 'appointments', 'billing'],
            pharmacist: ['pharmacy', 'prescriptions', 'inventory'],
            lab_technician: ['lab'],
            radiologist: ['radiology'],
            radiology_technician: ['radiology'],
            billing_clerk: ['billing', 'insurance'],
            inventory_manager: ['inventory'],
            insurance_coordinator: ['insurance', 'billing']
        };

        const modules = modulesByRole[user.role] || [];
        modules.forEach(module => {
            this.socket.emit('joinModule', module);
        });
    }

    getCurrentModule() {
        // Determine current module from URL or active tab
        const hash = window.location.hash;
        const moduleMap = {
            '#opd': 'opd',
            '#ipd': 'ipd',
            '#emergency': 'emergency',
            '#lab': 'lab',
            '#radiology': 'radiology',
            '#pharmacy': 'pharmacy',
            '#inventory': 'inventory',
            '#insurance': 'insurance',
            '#billing': 'billing',
            '#patients': 'patients',
            '#emr': 'emr',
            '#surgery': 'ot',
            '#beds': 'beds'
        };
        return moduleMap[hash] || null;
    }

    // Subscribe to patient-specific updates
    subscribeToPatient(patientId) {
        if (this.socket && this.connected) {
            this.socket.emit('subscribePatient', patientId);
        }
    }

    // Register custom event handlers
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    // Remove event handler
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // Call registered handlers
    handleEvent(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (err) {
                    console.error(`Error in handler for ${event}:`, err);
                }
            });
        }
    }

    // Refresh data if on specific module
    refreshIfModule(module) {
        const currentModule = this.getCurrentModule();
        if (currentModule === module || currentModule === null) {
            // Trigger refresh - call global refresh function if exists
            if (typeof refreshCurrentModule === 'function') {
                refreshCurrentModule();
            }
            // Also dispatch custom event
            window.dispatchEvent(new CustomEvent('moduleDataUpdated', { detail: { module } }));
        }
    }

    // Update connection status indicator
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.className = connected ? 'status-online' : 'status-offline';
            indicator.title = connected ? 'Real-time sync active' : 'Disconnected';
        }
    }

    // Show notification
    showNotification(type, message, persistent = false) {
        // Check if notification container exists
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = 'position:fixed;top:70px;right:20px;z-index:10000;max-width:350px;';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            critical: '#dc2626'
        };

        notification.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        container.appendChild(notification);

        // Auto remove after delay (unless persistent)
        if (!persistent) {
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, type === 'critical' ? 10000 : 5000);
        }
    }

    // Play alert sound for critical notifications
    playAlertSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1iYWBlYnFsfpKhkYqGhY2OkJCMhH51bmxrcXqDi5OXl5KNiYaEhYeJi4yLiYaDgH57eXl6fICEiIyOjo2LiYeGhYaHiYqLi4mHhYKAfXt6eXp8f4KGiYuMjIuJh4WEhIWGiImKiomHhYOBf318e3t8foGEh4mKi4qJh4aEhISFhoeIiYmIhoSCgH9+fXx8fX6Ag4aIiYqKiYeGhYSEhYaHiIiIh4aEgoB/fn18fH1+gIOGiImJiYiHhYSEhIWGh4iIiIeGhIKAf359fHx9foGDhoiJiYmIh4WEhISFhoeIiIiHhoSCgH9+fXx8fX6Bg4aIiYmJiIeFhISEhYaHiIiIh4aEgoB/fn18fH1+gYOGiImJiYiHhYQ=');
            audio.volume = 0.5;
            audio.play();
        } catch (err) {
            console.log('Could not play alert sound');
        }
    }

    // Disconnect socket
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

// Global instance
const realtimeHandler = new RealtimeHandler();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        realtimeHandler.initialize();
    }
});

// Export for use in other scripts
window.realtimeHandler = realtimeHandler;
