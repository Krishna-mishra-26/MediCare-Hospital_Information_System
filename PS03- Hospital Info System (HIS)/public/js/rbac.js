// Role-Based Access Control (RBAC) UI Handler
// Controls UI elements visibility and actions based on user role

class RBACHandler {
    constructor() {
        this.user = null;
        this.permissions = null;
        this.roleConfig = {
            admin: {
                level: 10,
                modules: ['all'],
                actions: ['all'],
                label: 'Administrator',
                color: '#7c3aed'
            },
            doctor: {
                level: 8,
                modules: ['patients', 'emr', 'opd', 'ipd', 'emergency', 'ot', 'lab', 'radiology', 'pharmacy', 'prescriptions', 'appointments', 'triage'],
                actions: ['read', 'create', 'update'],
                label: 'Doctor',
                color: '#2563eb'
            },
            nurse: {
                level: 6,
                modules: ['patients', 'opd', 'ipd', 'emergency', 'triage', 'beds', 'lab', 'pharmacy', 'emr'],
                actions: ['read', 'create', 'update'],
                label: 'Nurse',
                color: '#059669'
            },
            receptionist: {
                level: 4,
                modules: ['patients', 'opd', 'appointments', 'billing', 'insurance', 'beds'],
                actions: ['read', 'create', 'update'],
                label: 'Receptionist',
                color: '#0891b2'
            },
            pharmacist: {
                level: 6,
                modules: ['pharmacy', 'prescriptions', 'inventory', 'patients'],
                actions: ['read', 'create', 'update'],
                label: 'Pharmacist',
                color: '#ca8a04'
            },
            lab_technician: {
                level: 5,
                modules: ['lab', 'patients'],
                actions: ['read', 'create', 'update'],
                label: 'Lab Technician',
                color: '#9333ea'
            },
            radiologist: {
                level: 7,
                modules: ['radiology', 'patients', 'emr'],
                actions: ['read', 'create', 'update'],
                label: 'Radiologist',
                color: '#dc2626'
            },
            radiology_technician: {
                level: 5,
                modules: ['radiology', 'patients'],
                actions: ['read', 'update'],
                label: 'Radiology Tech',
                color: '#ea580c'
            },
            billing_clerk: {
                level: 4,
                modules: ['billing', 'patients', 'insurance'],
                actions: ['read', 'create', 'update'],
                label: 'Billing Clerk',
                color: '#65a30d'
            },
            inventory_manager: {
                level: 5,
                modules: ['inventory', 'pharmacy'],
                actions: ['read', 'create', 'update', 'delete'],
                label: 'Inventory Manager',
                color: '#0d9488'
            },
            insurance_coordinator: {
                level: 5,
                modules: ['insurance', 'patients', 'billing'],
                actions: ['read', 'create', 'update'],
                label: 'Insurance Coord.',
                color: '#6366f1'
            }
        };
    }

    // Initialize RBAC with current user
    initialize() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
            this.permissions = this.user.permissions || this.roleConfig[this.user.role];
        }
        this.applyRBAC();
        this.updateUserDisplay();
    }

    // Check if user can access a module
    canAccessModule(module) {
        if (!this.permissions) return false;
        if (this.permissions.modules.includes('all')) return true;
        return this.permissions.modules.includes(module);
    }

    // Check if user can perform an action
    canPerformAction(action) {
        if (!this.permissions) return false;
        if (this.permissions.actions.includes('all')) return true;
        return this.permissions.actions.includes(action);
    }

    // Check if user has specific role
    hasRole(...roles) {
        if (!this.user) return false;
        return roles.includes(this.user.role);
    }

    // Check if user is admin
    isAdmin() {
        return this.user && this.user.role === 'admin';
    }

    // Get current role config
    getRoleConfig() {
        return this.roleConfig[this.user?.role] || null;
    }

    // Apply RBAC to UI elements
    applyRBAC() {
        if (!this.user) return;

        // Hide/show navigation items based on module access
        this.applyModuleAccess();

        // Hide/show action buttons based on permissions
        this.applyActionPermissions();

        // Apply role-specific styling
        this.applyRoleStyling();
    }

    // Control module navigation visibility
    applyModuleAccess() {
        const moduleElements = document.querySelectorAll('[data-module]');
        moduleElements.forEach(el => {
            const module = el.dataset.module;
            if (this.canAccessModule(module)) {
                el.style.display = '';
                el.classList.remove('disabled');
            } else {
                el.style.display = 'none';
                el.classList.add('disabled');
            }
        });

        // Also control tab content
        const tabContents = document.querySelectorAll('[data-module-content]');
        tabContents.forEach(el => {
            const module = el.dataset.moduleContent;
            if (!this.canAccessModule(module)) {
                el.innerHTML = `
                    <div class="access-denied">
                        <i class="fas fa-lock"></i>
                        <h3>Access Restricted</h3>
                        <p>You don't have permission to access this module.</p>
                    </div>
                `;
            }
        });
    }

    // Control action buttons visibility
    applyActionPermissions() {
        // Create buttons
        const createBtns = document.querySelectorAll('[data-action="create"]');
        createBtns.forEach(btn => {
            btn.style.display = this.canPerformAction('create') ? '' : 'none';
        });

        // Edit buttons
        const editBtns = document.querySelectorAll('[data-action="update"], [data-action="edit"]');
        editBtns.forEach(btn => {
            btn.style.display = this.canPerformAction('update') ? '' : 'none';
        });

        // Delete buttons
        const deleteBtns = document.querySelectorAll('[data-action="delete"]');
        deleteBtns.forEach(btn => {
            btn.style.display = this.canPerformAction('delete') || this.isAdmin() ? '' : 'none';
        });

        // Approve buttons (admin only usually)
        const approveBtns = document.querySelectorAll('[data-action="approve"]');
        approveBtns.forEach(btn => {
            btn.style.display = this.hasRole('admin') ? '' : 'none';
        });

        // Role-specific buttons
        this.applyRoleSpecificButtons();
    }

    // Apply role-specific button visibility
    applyRoleSpecificButtons() {
        // Lab workflow buttons
        document.querySelectorAll('[data-role-action="collect-sample"]').forEach(btn => {
            btn.style.display = this.hasRole('lab_technician', 'nurse', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="enter-results"]').forEach(btn => {
            btn.style.display = this.hasRole('lab_technician', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="verify-results"]').forEach(btn => {
            btn.style.display = this.hasRole('lab_technician', 'admin') ? '' : 'none';
        });

        // Radiology workflow buttons
        document.querySelectorAll('[data-role-action="start-imaging"]').forEach(btn => {
            btn.style.display = this.hasRole('radiology_technician', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="complete-imaging"]').forEach(btn => {
            btn.style.display = this.hasRole('radiology_technician', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="add-report"]').forEach(btn => {
            btn.style.display = this.hasRole('radiologist', 'admin') ? '' : 'none';
        });

        // Pharmacy workflow
        document.querySelectorAll('[data-role-action="dispense"]').forEach(btn => {
            btn.style.display = this.hasRole('pharmacist', 'admin') ? '' : 'none';
        });

        // Doctor-only actions
        document.querySelectorAll('[data-role-action="prescribe"]').forEach(btn => {
            btn.style.display = this.hasRole('doctor', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="diagnosis"]').forEach(btn => {
            btn.style.display = this.hasRole('doctor', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="discharge"]').forEach(btn => {
            btn.style.display = this.hasRole('doctor', 'admin') ? '' : 'none';
        });

        // Nurse actions
        document.querySelectorAll('[data-role-action="vitals"]').forEach(btn => {
            btn.style.display = this.hasRole('nurse', 'doctor', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="triage"]').forEach(btn => {
            btn.style.display = this.hasRole('nurse', 'doctor', 'admin') ? '' : 'none';
        });

        // Receptionist actions
        document.querySelectorAll('[data-role-action="register"]').forEach(btn => {
            btn.style.display = this.hasRole('receptionist', 'nurse', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="book-appointment"]').forEach(btn => {
            btn.style.display = this.hasRole('receptionist', 'admin') ? '' : 'none';
        });

        // Insurance actions
        document.querySelectorAll('[data-role-action="pre-auth"]').forEach(btn => {
            btn.style.display = this.hasRole('insurance_coordinator', 'admin') ? '' : 'none';
        });

        document.querySelectorAll('[data-role-action="submit-claim"]').forEach(btn => {
            btn.style.display = this.hasRole('insurance_coordinator', 'billing_clerk', 'admin') ? '' : 'none';
        });
    }

    // Apply role-based styling
    applyRoleStyling() {
        const config = this.getRoleConfig();
        if (config) {
            // Update role badge
            const roleBadge = document.getElementById('user-role-badge');
            if (roleBadge) {
                roleBadge.textContent = config.label;
                roleBadge.style.backgroundColor = config.color;
            }

            // Add role class to body for CSS targeting
            document.body.className = document.body.className.replace(/role-\w+/g, '');
            document.body.classList.add(`role-${this.user.role}`);
        }
    }

    // Update user display in header
    updateUserDisplay() {
        if (!this.user) return;

        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        const userAvatarEl = document.getElementById('user-avatar');

        if (userNameEl) {
            userNameEl.textContent = this.user.fullName || this.user.username;
        }

        if (userRoleEl) {
            const config = this.getRoleConfig();
            userRoleEl.textContent = config ? config.label : this.user.role;
        }

        if (userAvatarEl) {
            const name = this.user.fullName || this.user.username;
            userAvatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        }
    }

    // Show role-specific dashboard widgets
    showRoleWidgets() {
        const role = this.user?.role;
        if (!role) return;

        // Hide all role-specific widgets first
        document.querySelectorAll('[data-role-widget]').forEach(w => w.style.display = 'none');

        // Show widgets for current role
        document.querySelectorAll(`[data-role-widget="${role}"], [data-role-widget="all"]`).forEach(w => {
            w.style.display = '';
        });

        // Show widgets for roles that can see them
        const widgetRoles = {
            'pending-labs': ['lab_technician', 'admin'],
            'pending-reports': ['radiologist', 'admin'],
            'pending-dispense': ['pharmacist', 'admin'],
            'pending-appointments': ['doctor', 'receptionist', 'admin'],
            'pending-approvals': ['admin'],
            'critical-alerts': ['doctor', 'nurse', 'admin'],
            'low-stock': ['pharmacist', 'inventory_manager', 'admin'],
            'pending-claims': ['insurance_coordinator', 'admin']
        };

        Object.entries(widgetRoles).forEach(([widget, roles]) => {
            const el = document.querySelector(`[data-role-widget="${widget}"]`);
            if (el && roles.includes(role)) {
                el.style.display = '';
            }
        });
    }

    // Get role-specific quick actions
    getQuickActions() {
        const actions = {
            admin: [
                { icon: 'fa-users', label: 'Manage Users', action: 'manageUsers' },
                { icon: 'fa-chart-bar', label: 'Reports', action: 'viewReports' },
                { icon: 'fa-cog', label: 'Settings', action: 'openSettings' }
            ],
            doctor: [
                { icon: 'fa-user-plus', label: 'New Patient', action: 'newPatient' },
                { icon: 'fa-prescription', label: 'Prescribe', action: 'newPrescription' },
                { icon: 'fa-flask', label: 'Order Lab', action: 'orderLab' },
                { icon: 'fa-x-ray', label: 'Order Imaging', action: 'orderImaging' }
            ],
            nurse: [
                { icon: 'fa-heartbeat', label: 'Record Vitals', action: 'recordVitals' },
                { icon: 'fa-ambulance', label: 'Triage', action: 'newTriage' },
                { icon: 'fa-bed', label: 'Bed Status', action: 'viewBeds' }
            ],
            receptionist: [
                { icon: 'fa-user-plus', label: 'Register Patient', action: 'registerPatient' },
                { icon: 'fa-calendar-plus', label: 'Book Appointment', action: 'bookAppointment' },
                { icon: 'fa-receipt', label: 'Generate Bill', action: 'generateBill' }
            ],
            pharmacist: [
                { icon: 'fa-pills', label: 'Dispense', action: 'dispenseMedicine' },
                { icon: 'fa-boxes', label: 'Stock', action: 'viewStock' },
                { icon: 'fa-clock', label: 'Expiring', action: 'viewExpiring' }
            ],
            lab_technician: [
                { icon: 'fa-vial', label: 'Collect Sample', action: 'collectSample' },
                { icon: 'fa-microscope', label: 'Enter Results', action: 'enterResults' },
                { icon: 'fa-list', label: 'Worklist', action: 'viewWorklist' }
            ],
            radiologist: [
                { icon: 'fa-file-medical', label: 'Pending Reports', action: 'pendingReports' },
                { icon: 'fa-x-ray', label: 'View Images', action: 'viewImages' }
            ],
            radiology_technician: [
                { icon: 'fa-list', label: 'Worklist', action: 'viewWorklist' },
                { icon: 'fa-camera', label: 'Start Imaging', action: 'startImaging' }
            ],
            billing_clerk: [
                { icon: 'fa-file-invoice-dollar', label: 'New Bill', action: 'createBill' },
                { icon: 'fa-money-check', label: 'Payments', action: 'viewPayments' }
            ],
            inventory_manager: [
                { icon: 'fa-shopping-cart', label: 'New PO', action: 'createPO' },
                { icon: 'fa-truck', label: 'Receive Goods', action: 'receiveGoods' },
                { icon: 'fa-exclamation-triangle', label: 'Low Stock', action: 'lowStock' }
            ],
            insurance_coordinator: [
                { icon: 'fa-clipboard-check', label: 'Pre-Auth', action: 'newPreAuth' },
                { icon: 'fa-file-alt', label: 'Submit Claim', action: 'submitClaim' },
                { icon: 'fa-tasks', label: 'Pending', action: 'pendingClaims' }
            ]
        };

        return actions[this.user?.role] || [];
    }

    // Check permission before API call
    async checkPermission(module, action) {
        if (!this.canAccessModule(module)) {
            throw new Error(`Access denied: You cannot access the ${module} module`);
        }
        if (!this.canPerformAction(action)) {
            throw new Error(`Access denied: You cannot perform ${action} action`);
        }
        return true;
    }

    // Wrap API call with permission check
    async authorizedFetch(url, options = {}, module, action) {
        await this.checkPermission(module, action);
        
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 403) {
            throw new Error('Access denied by server');
        }
        
        return response;
    }
}

// Global instance
const rbacHandler = new RBACHandler();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    rbacHandler.initialize();
});

// Re-apply RBAC when content changes (for dynamic content)
const observer = new MutationObserver(() => {
    rbacHandler.applyActionPermissions();
    rbacHandler.applyRoleSpecificButtons();
});

document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
});

// Export for use in other scripts
window.rbacHandler = rbacHandler;
