// Dashboard JavaScript
const socket = io();

// Chart.js Global Defaults - Prevent charts from resizing infinitely
if (typeof Chart !== 'undefined') {
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation = {
        duration: 400
    };
}

// Get current user from storage (supports both 'user' and 'currentUser' keys)
function getCurrentUser() {
    const userData = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (!userData) return null;
    try {
        return JSON.parse(userData);
    } catch (e) {
        return null;
    }
}

// RBAC Configuration - Enhanced with all roles
const RBAC = {
    permissions: {
        admin: ['all'],
        doctor: ['view_patients', 'edit_patients', 'view_opd', 'view_ipd', 'view_emergency', 'view_ot', 'schedule_surgery', 'view_lab', 'order_lab', 'view_radiology', 'order_radiology', 'view_pharmacy', 'create_prescription', 'view_emr', 'edit_emr', 'view_billing'],
        nurse: ['view_patients', 'view_opd', 'view_ipd', 'view_emergency', 'view_vitals', 'edit_vitals', 'view_lab', 'view_pharmacy', 'view_beds'],
        receptionist: ['view_patients', 'add_patients', 'view_opd', 'add_opd', 'view_ipd', 'add_ipd', 'view_emergency', 'add_emergency', 'view_billing', 'create_bill', 'view_beds'],
        pharmacist: ['view_pharmacy', 'dispense_medicine', 'view_prescriptions', 'view_inventory'],
        lab_technician: ['view_lab', 'process_lab', 'view_patients'],
        radiologist: ['view_radiology', 'report_radiology', 'view_patients'],
        radiology_technician: ['view_radiology', 'perform_radiology', 'view_patients'],
        billing_clerk: ['view_billing', 'create_bill', 'edit_bill', 'view_patients', 'view_insurance'],
        inventory_manager: ['view_inventory', 'manage_inventory', 'view_pharmacy'],
        insurance_coordinator: ['view_insurance', 'manage_insurance', 'view_billing', 'view_patients']
    },
    
    hasPermission: function(role, permission) {
        if (!role) return false;
        const rolePerms = this.permissions[role.toLowerCase()];
        if (!rolePerms) return false;
        return rolePerms.includes('all') || rolePerms.includes(permission);
    },
    
    canAccess: function(section) {
        const currentUser = getCurrentUser();
        if (!currentUser) return false;
        const role = currentUser.role || 'admin';
        
        const sectionPermissions = {
            'overview': ['all', 'view_patients', 'view_opd', 'view_ipd', 'view_lab', 'view_radiology', 'view_pharmacy', 'view_billing', 'view_inventory', 'view_insurance'],
            'opd': ['all', 'view_opd'],
            'ipd': ['all', 'view_ipd'],
            'emergency': ['all', 'view_emergency'],
            'ot': ['all', 'view_ot', 'schedule_surgery'],
            'lab': ['all', 'view_lab', 'process_lab'],
            'radiology': ['all', 'view_radiology', 'report_radiology', 'perform_radiology'],
            'pharmacy': ['all', 'view_pharmacy', 'dispense_medicine'],
            'billing': ['all', 'view_billing', 'create_bill'],
            'insurance': ['all', 'view_insurance', 'manage_insurance'],
            'hr': ['all'],
            'inventory': ['all', 'view_inventory', 'manage_inventory'],
            'emr': ['all', 'view_emr', 'edit_emr'],
            'beds': ['all', 'view_beds'],
            'settings': ['all']
        };
        
        const requiredPerms = sectionPermissions[section] || ['all'];
        const rolePerms = this.permissions[role.toLowerCase()] || [];
        
        return rolePerms.includes('all') || requiredPerms.some(p => rolePerms.includes(p));
    }
};

// Hospital Configuration
const HospitalConfig = {
    otRooms: JSON.parse(localStorage.getItem('hospitalOTRooms')) || [
        { id: 'OT-1', name: 'OT-1', status: 'available', type: 'General' },
        { id: 'OT-2', name: 'OT-2', status: 'available', type: 'Cardiac' },
        { id: 'OT-3', name: 'OT-3', status: 'available', type: 'Ortho' },
        { id: 'OT-4', name: 'OT-4', status: 'available', type: 'Neuro' }
    ],
    
    saveOTRooms: function() {
        localStorage.setItem('hospitalOTRooms', JSON.stringify(this.otRooms));
    },
    
    addOTRoom: function(room) {
        this.otRooms.push(room);
        this.saveOTRooms();
    },
    
    updateOTRoom: function(id, updates) {
        const index = this.otRooms.findIndex(r => r.id === id);
        if (index !== -1) {
            this.otRooms[index] = { ...this.otRooms[index], ...updates };
            this.saveOTRooms();
        }
    },
    
    removeOTRoom: function(id) {
        this.otRooms = this.otRooms.filter(r => r.id !== id);
        this.saveOTRooms();
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const currentUser = getCurrentUser();
    
    if (!token || !currentUser) {
        // No token or user data - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
        return;
    }
    
    // Verify token is still valid with server
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Token is invalid/expired - clear and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return;
        }
        
        // Update user data with fresh data from server
        const data = await response.json();
        if (data.success && data.data) {
            localStorage.setItem('user', JSON.stringify(data.data));
            localStorage.setItem('currentUser', JSON.stringify(data.data));
        }
    } catch (err) {
        console.error('Auth verification failed:', err);
        // On network error, allow offline access if user data exists
        // But still check if we have valid user data
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
    }
    
    // Display user name and role
    const username = currentUser.fullName || currentUser.username || 'User';
    const role = (currentUser.role || 'admin').toLowerCase();
    const department = currentUser.department || '';
    const roleTitles = {
        admin: 'Administrator',
        doctor: 'Doctor',
        nurse: 'Nurse',
        receptionist: 'Receptionist',
        pharmacist: 'Pharmacist',
        lab_technician: 'Lab Technician',
        radiologist: 'Radiologist',
        radiology_technician: 'Radiology Technician',
        billing_clerk: 'Billing Clerk',
        inventory_manager: 'Inventory Manager',
        insurance_coordinator: 'Insurance Coordinator'
    };
    
    document.getElementById('userName').textContent = username;
    
    // Set body class for role-specific styling
    document.body.classList.add(`role-${role}`);
    
    // Update user avatar with actual name
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=4f46e5&color=fff`;
    const userAvatar = document.getElementById('userAvatar');
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    if (userAvatar) userAvatar.src = avatarUrl;
    if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
    
    // Update dropdown user info
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownRole = document.getElementById('dropdownRole');
    if (dropdownUserName) dropdownUserName.textContent = username;
    if (dropdownRole) {
        dropdownRole.textContent = roleTitles[role] || role;
        if (department) {
            dropdownRole.textContent += ` • ${department}`;
        }
    }
    
    // Display user role badge with role-specific styling
    const userRoleBadge = document.getElementById('userRoleBadge');
    if (userRoleBadge) {
        const roleClass = role.replace('_', '-');
        userRoleBadge.className = `user-role-badge role-${roleClass}`;
        userRoleBadge.innerHTML = `<i class="fas fa-user-shield"></i> ${(roleTitles[role] || role).toUpperCase()}`;
    }
    
    // Apply RBAC to sidebar menu
    applyRBACToMenu();
    
    // Initialize data
    initializeSampleData();
    
    // Sidebar navigation
    setupNavigation();
    
    // Mobile menu toggle
    setupMobileMenu();
    
    // Initialize charts
    initializeCharts();
    
    // Load table data
    loadTableData();
    
    // Update Dashboard Stats
    updateDashboardStats();
    
    // Setup button handlers
    setupButtonHandlers();
    
    // Load EMR data
    loadEMRData();
    
    // Populate recent activities
    populateRecentActivities();
    
    // Load OT Rooms
    loadOTRooms();
    
    // Load Bed Management
    loadBedManagement();

    // Socket listeners
    socket.on('newPatient', (patient) => {
        if (typeof toast !== 'undefined') {
            toast.show(`New patient registered: ${patient.name}`, 'info');
        }
        loadTableData();
        updateDashboardStats();
    });

    socket.on('newSurgery', (surgery) => {
        if (typeof toast !== 'undefined') {
            toast.show(`New surgery scheduled: ${surgery.procedure}`, 'info');
        }
        loadTableData();
        loadOTRooms();
    });

    socket.on('newLabTest', (test) => {
        if (typeof toast !== 'undefined') {
            toast.show(`New lab test ordered: ${test.testType}`, 'info');
        }
        loadTableData();
    });

    socket.on('newImaging', (order) => {
        if (typeof toast !== 'undefined') {
            toast.show(`New imaging ordered: ${order.imagingType}`, 'info');
        }
        loadTableData();
    });

    socket.on('newPrescription', (prescription) => {
        if (typeof toast !== 'undefined') {
            toast.show(`New prescription created`, 'info');
        }
        loadTableData();
    });

    socket.on('newBill', (bill) => {
        if (typeof toast !== 'undefined') {
            toast.show(`Bill generated: ${bill.billNumber}`, 'info');
        }
        loadTableData();
    });
    
    // Close search dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            hideSearchResults();
        }
    });
    
    // Initialize analytics KPIs with dynamic data
    updateAnalyticsKPIs();
    
    // Initialize notifications
    initializeNotifications();
});

// Apply RBAC to sidebar menu
function applyRBACToMenu() {
    const menuItems = document.querySelectorAll('.menu-item[data-section]');
    const currentUser = getCurrentUser();
    const userRole = currentUser?.role?.toLowerCase() || '';
    
    menuItems.forEach(item => {
        const section = item.getAttribute('data-section');
        const hasAccess = RBAC.canAccess(section);
        
        if (!hasAccess) {
            // Hide menu items the user cannot access
            item.style.display = 'none';
            item.classList.add('rbac-hidden');
        } else {
            item.style.display = '';
            item.classList.remove('rbac-hidden');
        }
    });
    
    // Also hide sections the user cannot access
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        const sectionId = section.id;
        if (sectionId && !RBAC.canAccess(sectionId)) {
            section.classList.add('rbac-hidden');
        }
    });
    
    // Show role-based welcome message
    console.log(`User logged in as: ${userRole}, accessible sections: ${getAccessibleSections(userRole).join(', ')}`);
}

// Get list of accessible sections for a role
function getAccessibleSections(role) {
    const allSections = ['overview', 'opd', 'ipd', 'emergency', 'ot', 'lab', 'radiology', 'pharmacy', 'billing', 'insurance', 'hr', 'inventory', 'emr', 'beds', 'settings', 'command-center', 'analytics'];
    return allSections.filter(section => {
        const tempUser = getCurrentUser();
        if (!tempUser) return false;
        return RBAC.canAccess(section);
    });
}

// Show OT Configuration Modal
function showOTConfigModal() {
    const modalHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-cog"></i> Configure Operation Theater</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Total OT Rooms</label>
                    <input type="number" id="totalOTRooms" value="${HospitalConfig.otRooms.length}" min="1" max="20" class="form-control">
                </div>
                <div class="form-group">
                    <label>Operating Hours</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <input type="time" id="otStartTime" value="08:00" class="form-control">
                        <input type="time" id="otEndTime" value="20:00" class="form-control">
                    </div>
                </div>
                <div class="form-group">
                    <label>Default Surgery Duration (minutes)</label>
                    <input type="number" id="defaultDuration" value="120" min="30" max="480" class="form-control">
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    These settings will apply to all OT rooms globally.
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn-primary" onclick="saveOTConfig()"><i class="fas fa-save"></i> Save Configuration</button>
            </div>
        </div>
    `;
    showModal('OT Configuration', modalHTML);
}

// Save OT Configuration
function saveOTConfig() {
    const totalRooms = parseInt(document.getElementById('totalOTRooms').value);
    const startTime = document.getElementById('otStartTime').value;
    const endTime = document.getElementById('otEndTime').value;
    const duration = parseInt(document.getElementById('defaultDuration').value);
    
    // Update configuration
    HospitalConfig.otHours = { start: startTime, end: endTime };
    HospitalConfig.defaultSurgeryDuration = duration;
    
    toast.show('OT configuration updated successfully', 'success');
    closeModal();
    loadOTRooms();
}

// Load OT Rooms dynamically
async function loadOTRooms() {
    const otRoomsContainer = document.querySelector('.ot-rooms');
    if (!otRoomsContainer) return;
    
    // Get surgeries to determine room status
    let surgeries = [];
    try {
        const response = await api.getSurgeries();
        if (response.success) {
            surgeries = response.data;
        }
    } catch (e) {
        console.error('Error fetching surgeries:', e);
    }
    
    // Update OT room statuses based on surgeries
    const today = new Date().toDateString();
    const now = new Date();
    
    HospitalConfig.otRooms.forEach(room => {
        // Use correct field name from Surgery model (otRoom instead of room)
        const roomSurgeries = surgeries.filter(s => 
            (s.otRoom || s.room) === room.id || (s.otRoom || s.room) === room.name
        );
        const activeSurgery = roomSurgeries.find(s => {
            // Use correct field name (surgeryDate instead of date)
            const surgeryDateField = s.surgeryDate || s.date;
            const surgeryDate = new Date(surgeryDateField);
            return surgeryDate.toDateString() === today && 
                   (s.status === 'In Progress' || s.status === 'Scheduled');
        });
        
        if (activeSurgery) {
            // Normalize surgery data for display
            const normalizedSurgery = {
                ...activeSurgery,
                time: activeSurgery.surgeryTime || activeSurgery.time || 'N/A',
                room: activeSurgery.otRoom || activeSurgery.room || 'N/A',
                duration: activeSurgery.estimatedDuration || activeSurgery.duration || 'N/A'
            };
            if (activeSurgery.status === 'In Progress') {
                room.status = 'occupied';
                room.currentSurgery = normalizedSurgery;
            } else {
                room.status = 'scheduled';
                room.nextSurgery = normalizedSurgery;
            }
        } else {
            room.status = room.status === 'maintenance' ? 'maintenance' : 'available';
        }
    });
    
    // Render OT rooms - Simple IPD-stat style cards
    otRoomsContainer.innerHTML = HospitalConfig.otRooms.map(room => {
        const defaultTypes = {
            'OT-1': 'General',
            'OT-2': 'Cardiac',
            'OT-3': 'Ortho',
            'OT-4': 'Neuro'
        };
        const type = room.type || defaultTypes[room.id] || 'General';
        const iconMap = {
            'general': 'fa-procedures',
            'cardiac': 'fa-heart-pulse',
            'cardio': 'fa-heart-pulse',
            'ortho': 'fa-bone',
            'orthopedic': 'fa-bone',
            'neuro': 'fa-brain'
        };
        const iconKey = type.toLowerCase();
        const iconClass = iconMap[iconKey] || 'fa-procedures';

        return `
        <div class="ot-room ${room.status}" data-room-id="${room.id}" onclick="viewOTRoom('${room.id}')">
            <i class="fas ${iconClass}"></i>
            <div class="ot-room-info">
                <strong>${room.name}</strong>
                <span class="room-type">${type}</span>
                <span class="room-status-text">${getStatusText(room.status)}</span>
            </div>
        </div>
        `;
    }).join('') + `
        <div class="ot-room add-ot-room" onclick="showAddOTRoomModal()">
            <i class="fas fa-plus-circle"></i>
            <p>Add OT Room</p>
        </div>
    `;
}

function getStatusText(status) {
    const statusTexts = {
        'occupied': 'In Progress',
        'scheduled': 'Scheduled',
        'available': 'Available',
        'maintenance': 'Maintenance'
    };
    return statusTexts[status] || status;
}

// View OT Room Details
function viewOTRoom(roomId) {
    const room = HospitalConfig.otRooms.find(r => r.id === roomId);
    if (!room) return;
    
    showModal('OT Room Details', `
        <div class="ot-room-details">
            <div class="detail-header">
                <h3>${room.name}</h3>
                <span class="status-badge ${room.status}">${getStatusText(room.status)}</span>
            </div>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Room Type</label>
                    <span>${room.type || 'General'}</span>
                </div>
                <div class="detail-item">
                    <label>Equipment</label>
                    <span>${room.equipment || 'Standard surgical equipment'}</span>
                </div>
                <div class="detail-item">
                    <label>Capacity</label>
                    <span>${room.capacity || '1 patient'}</span>
                </div>
                <div class="detail-item">
                    <label>Last Sanitized</label>
                    <span>${room.lastSanitized || 'Today'}</span>
                </div>
            </div>
            ${room.currentSurgery ? `
                <div class="current-surgery-info">
                    <h4>Current Surgery</h4>
                    <p><strong>Procedure:</strong> ${room.currentSurgery.procedure}</p>
                    <p><strong>Surgeon:</strong> ${room.currentSurgery.surgeon}</p>
                    <p><strong>Patient:</strong> ${room.currentSurgery.patientName}</p>
                    <p><strong>Started:</strong> ${room.currentSurgery.time}</p>
                </div>
            ` : ''}
        </div>
    `);
}

// Edit OT Room
function editOTRoom(roomId) {
    const room = HospitalConfig.otRooms.find(r => r.id === roomId);
    if (!room) return;
    
    showModal('Edit OT Room', `
        <form id="editOTRoomForm" onsubmit="saveOTRoom(event, '${roomId}')">
            <div class="form-group">
                <label><i class="fas fa-door-open"></i> Room Name</label>
                <input type="text" id="otRoomName" value="${room.name}" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-tags"></i> Room Type</label>
                <select id="otRoomType">
                    <option value="General" ${room.type === 'General' ? 'selected' : ''}>General</option>
                    <option value="Cardiac" ${room.type === 'Cardiac' ? 'selected' : ''}>Cardiac</option>
                    <option value="Ortho" ${room.type === 'Ortho' ? 'selected' : ''}>Orthopedic</option>
                    <option value="Neuro" ${room.type === 'Neuro' ? 'selected' : ''}>Neurosurgery</option>
                    <option value="Pediatric" ${room.type === 'Pediatric' ? 'selected' : ''}>Pediatric</option>
                    <option value="Eye" ${room.type === 'Eye' ? 'selected' : ''}>Ophthalmology</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-toggle-on"></i> Status</label>
                <select id="otRoomStatus">
                    <option value="available" ${room.status === 'available' ? 'selected' : ''}>Available</option>
                    <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Under Maintenance</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-tools"></i> Equipment</label>
                <textarea id="otRoomEquipment" rows="3">${room.equipment || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="button" class="btn-danger" onclick="deleteOTRoom('${roomId}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        </form>
    `);
}

// Save OT Room
function saveOTRoom(e, roomId) {
    e.preventDefault();
    
    const updates = {
        name: document.getElementById('otRoomName').value,
        type: document.getElementById('otRoomType').value,
        status: document.getElementById('otRoomStatus').value,
        equipment: document.getElementById('otRoomEquipment').value
    };
    
    HospitalConfig.updateOTRoom(roomId, updates);
    closeModal();
    loadOTRooms();
    
    if (typeof toast !== 'undefined') {
        toast.show('OT Room updated successfully', 'success');
    }
}

// Delete OT Room
function deleteOTRoom(roomId) {
    if (confirm('Are you sure you want to delete this OT Room?')) {
        HospitalConfig.removeOTRoom(roomId);
        closeModal();
        loadOTRooms();
        
        if (typeof toast !== 'undefined') {
            toast.show('OT Room deleted', 'info');
        }
    }
}

// Add OT Room Modal
function showAddOTRoomModal() {
    showModal('Add New OT Room', `
        <form id="addOTRoomForm" onsubmit="addNewOTRoom(event)">
            <div class="form-group">
                <label><i class="fas fa-door-open"></i> Room ID <span class="required">*</span></label>
                <input type="text" id="newOtRoomId" placeholder="e.g., OT-5" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-tag"></i> Room Name <span class="required">*</span></label>
                <input type="text" id="newOtRoomName" placeholder="e.g., OT-5" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-tags"></i> Room Type</label>
                <select id="newOtRoomType">
                    <option value="General">General</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Ortho">Orthopedic</option>
                    <option value="Neuro">Neurosurgery</option>
                    <option value="Pediatric">Pediatric</option>
                    <option value="Eye">Ophthalmology</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-tools"></i> Equipment</label>
                <textarea id="newOtRoomEquipment" rows="3" placeholder="List available equipment..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-plus"></i> Add Room
                </button>
            </div>
        </form>
    `);
}

// Add New OT Room
function addNewOTRoom(e) {
    e.preventDefault();
    
    const newRoom = {
        id: document.getElementById('newOtRoomId').value,
        name: document.getElementById('newOtRoomName').value,
        type: document.getElementById('newOtRoomType').value,
        status: 'available',
        equipment: document.getElementById('newOtRoomEquipment').value
    };
    
    HospitalConfig.addOTRoom(newRoom);
    closeModal();
    loadOTRooms();
    
    if (typeof toast !== 'undefined') {
        toast.show('New OT Room added successfully', 'success');
    }
}

// ============================================
// BED MANAGEMENT SYSTEM (Connected to MongoDB)
// ============================================

// Hospital Bed Data (loaded from API)
let hospitalBeds = {
    wards: []
};

// Initialize Bed Data from API
async function initializeBedData() {
    try {
        const response = await api.getWards();
        if (response.success && response.data) {
            hospitalBeds.wards = response.data;
        } else {
            // If no data, seed initial wards
            await seedInitialWards();
        }
    } catch (err) {
        console.error('Error loading bed data:', err);
        // Fallback to localStorage if API fails
        const savedBeds = localStorage.getItem('hospitalBeds');
        if (savedBeds) {
            hospitalBeds = JSON.parse(savedBeds);
        }
    }
}

// Seed initial wards if database is empty
async function seedInitialWards() {
    const defaultWards = [
        { name: 'General Ward', prefix: 'GW', type: 'general', numBeds: 20, ratePerDay: 500 },
        { name: 'ICU', prefix: 'ICU', type: 'icu', numBeds: 10, ratePerDay: 5000 },
        { name: 'Private Rooms', prefix: 'PR', type: 'private', numBeds: 15, ratePerDay: 3000 },
        { name: 'Semi-Private', prefix: 'SP', type: 'semi-private', numBeds: 12, ratePerDay: 1500 },
        { name: 'Pediatric Ward', prefix: 'PED', type: 'pediatric', numBeds: 10, ratePerDay: 800 },
        { name: 'Maternity Ward', prefix: 'MAT', type: 'maternity', numBeds: 8, ratePerDay: 1200 }
    ];

    for (const ward of defaultWards) {
        try {
            await api.createWard(ward);
        } catch (err) {
            console.error('Error seeding ward:', err);
        }
    }
    
    // Reload data
    const response = await api.getWards();
    if (response.success) {
        hospitalBeds.wards = response.data;
    }
}

// Generate random patient for demo
function generateRandomPatient() {
    const names = ['Amit Kumar', 'Priya Sharma', 'Rajesh Singh', 'Neha Patel', 'Vikram Mehta', 'Sunita Devi', 'Anil Verma', 'Kavita Gupta'];
    const diagnoses = ['Pneumonia', 'Cardiac Monitoring', 'Post-Surgery Recovery', 'Fracture', 'Diabetes Management', 'Fever Investigation'];
    return {
        name: names[Math.floor(Math.random() * names.length)],
        diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
        admitDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        doctor: 'Dr. ' + ['Sharma', 'Patel', 'Singh', 'Kumar'][Math.floor(Math.random() * 4)]
    };
}

// Load and render beds
async function loadBedManagement() {
    await initializeBedData();
    renderWardTabs();
    renderBedOverview();
    updateBedStats();
}

// Render dynamic ward tabs
function renderWardTabs() {
    const container = document.getElementById('wardTabsContainer');
    if (!container) return;
    
    let tabsHtml = `<button class="ward-tab active" onclick="filterBedsByWard('all', this)">All Wards</button>`;
    
    hospitalBeds.wards.forEach(ward => {
        tabsHtml += `<button class="ward-tab" onclick="filterBedsByWard('${ward.id}', this)">${ward.name}</button>`;
    });
    
    // Add "Add Ward" button at the end
    tabsHtml += `<button class="ward-tab add-ward-btn" onclick="openAddWardModal()"><i class="fas fa-plus"></i> Add Ward</button>`;
    
    container.innerHTML = tabsHtml;
}

// Render bed overview
function renderBedOverview(wardFilter = 'all', statusFilter = 'all') {
    const container = document.getElementById('bedOverviewContainer');
    if (!container) return;
    
    let wardsToShow = hospitalBeds.wards;
    if (wardFilter !== 'all') {
        wardsToShow = hospitalBeds.wards.filter(w => w.id === wardFilter);
    }
    
    container.innerHTML = wardsToShow.map(ward => {
        let bedsToShow = ward.beds || [];
        if (statusFilter !== 'all') {
            bedsToShow = bedsToShow.filter(b => b.status === statusFilter);
        }
        
        if (bedsToShow.length === 0 && statusFilter !== 'all') return '';

        
        const occupiedCount = ward.beds.filter(b => b.status === 'occupied' || b.status === 'critical').length;
        const availableCount = ward.beds.filter(b => b.status === 'available').length;
        
        return `
            <div class="ward-section" data-ward="${ward.id}">
                <div class="ward-header">
                    <h3><i class="fas fa-hospital-alt"></i> ${ward.name}</h3>
                    <div class="ward-summary">
                        <span class="summary-item occupied">${occupiedCount} Occupied</span>
                        <span class="summary-item available">${availableCount} Available</span>
                        <span class="summary-item total">${ward.beds.length} Total</span>
                        <button class="ward-edit-btn" onclick="editWard('${ward.id}')" title="Edit Ward"><i class="fas fa-edit"></i></button>
                        <button class="ward-delete-btn" onclick="deleteWard('${ward.id}')" title="Delete Ward"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="bed-grid">
                    ${bedsToShow.map(bed => `
                        <div class="bed ${bed.status}" data-bed="${bed.id}" onclick="showBedDetails('${ward.id}', '${bed.id}')">
                            <span class="bed-number">${bed.number}</span>
                            <span class="bed-status">${getBedStatusText(bed.status)}</span>
                            ${bed.patient && bed.patient.name ? `<span class="bed-patient">${bed.patient.name.split(' ')[0]}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Get bed status display text
function getBedStatusText(status) {
    const texts = {
        'available': 'Available',
        'occupied': 'Occupied',
        'critical': 'Critical',
        'maintenance': 'Maintenance',
        'reserved': 'Reserved'
    };
    return texts[status] || status;
}

// Update bed statistics
function updateBedStats() {
    let total = 0, occupied = 0, available = 0, critical = 0, maintenance = 0;
    
    hospitalBeds.wards.forEach(ward => {
        ward.beds.forEach(bed => {
            total++;
            if (bed.status === 'occupied') occupied++;
            else if (bed.status === 'available') available++;
            else if (bed.status === 'critical') critical++;
            else if (bed.status === 'maintenance') maintenance++;
        });
    });
    
    updateElementText('totalBedsCount', total);
    updateElementText('occupiedBedsTotal', occupied);
    updateElementText('availableBedsTotal', available);
    updateElementText('criticalBedsCount', critical);
    updateElementText('maintenanceBedsCount', maintenance);
}

// Show bed details modal
function showBedDetails(wardId, bedId) {
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    const bed = ward?.beds.find(b => b.id === bedId);
    
    if (!bed) return;
    
    const content = `
        <div class="bed-details-modal">
            <div class="bed-info-header">
                <div class="bed-icon ${bed.status}">
                    <i class="fas fa-bed"></i>
                </div>
                <div class="bed-info-title">
                    <h2>Bed ${bed.number}</h2>
                    <span class="status-badge ${bed.status}">${getBedStatusText(bed.status)}</span>
                </div>
            </div>
            
            <div class="bed-details-content">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Bed Information</h4>
                    <div class="detail-row"><span>Ward</span><span>${ward.name}</span></div>
                    <div class="detail-row"><span>Bed Number</span><span>${bed.number}</span></div>
                    <div class="detail-row"><span>Status</span><span class="status-badge ${bed.status}">${getBedStatusText(bed.status)}</span></div>
                    <div class="detail-row"><span>Last Updated</span><span>${new Date(bed.lastUpdated).toLocaleString()}</span></div>
                </div>
                
                ${bed.patient ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-user-injured"></i> Patient Information</h4>
                        <div class="detail-row"><span>Patient Name</span><span>${bed.patient.name}</span></div>
                        <div class="detail-row"><span>Diagnosis</span><span>${bed.patient.diagnosis}</span></div>
                        <div class="detail-row"><span>Admit Date</span><span>${bed.patient.admitDate}</span></div>
                        <div class="detail-row"><span>Attending Doctor</span><span>${bed.patient.doctor}</span></div>
                    </div>
                ` : ''}
            </div>
            
            <div class="bed-actions">
                ${bed.status === 'available' ? `
                    <button class="btn-primary" onclick="assignPatientToBed('${wardId}', '${bedId}')">
                        <i class="fas fa-user-plus"></i> Assign Patient
                    </button>
                ` : ''}
                ${bed.status === 'occupied' || bed.status === 'critical' ? `
                    <button class="btn-secondary" onclick="dischargeBed('${wardId}', '${bedId}')">
                        <i class="fas fa-sign-out-alt"></i> Discharge Patient
                    </button>
                    <button class="btn-primary" onclick="transferPatient('${wardId}', '${bedId}')">
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                ` : ''}
                <button class="btn-secondary" onclick="changeBedStatus('${wardId}', '${bedId}')">
                    <i class="fas fa-edit"></i> Change Status
                </button>
            </div>
        </div>
    `;
    
    showModal('Bed Details', content);
}

// Filter beds by status
function filterBedsByStatus(status, element) {
    // Update active state on stat cards
    document.querySelectorAll('.bed-stat-card').forEach(card => card.classList.remove('active'));
    if (element) element.classList.add('active');
    
    renderBedOverview('all', status);
    toast.show(`Showing ${status === 'all' ? 'all' : status} beds`, 'info');
}

// Filter beds by ward
function filterBedsByWard(wardId, element) {
    // Update active tab
    document.querySelectorAll('.ward-tab').forEach(tab => tab.classList.remove('active'));
    if (element) element.classList.add('active');
    
    renderBedOverview(wardId, 'all');
}

// Assign patient to bed
function assignPatientToBed(wardId, bedId) {
    closeModal();
    showModal('Assign Patient to Bed', `
        <form onsubmit="submitBedAssignment(event, '${wardId}', '${bedId}')" class="settings-form">
            <div class="form-group">
                <label>Patient Name <span class="required">*</span></label>
                <input type="text" name="patientName" placeholder="Enter patient name" required>
            </div>
            <div class="form-group">
                <label>Diagnosis <span class="required">*</span></label>
                <input type="text" name="diagnosis" placeholder="Primary diagnosis" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Admit Date</label>
                    <input type="date" name="admitDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Attending Doctor</label>
                    <select name="doctor">
                        <option value="Dr. Sharma">Dr. Sharma</option>
                        <option value="Dr. Patel">Dr. Patel</option>
                        <option value="Dr. Singh">Dr. Singh</option>
                        <option value="Dr. Kumar">Dr. Kumar</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Patient Condition</label>
                <select name="condition">
                    <option value="occupied">Stable (Occupied)</option>
                    <option value="critical">Critical</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-check"></i> Assign Bed</button>
            </div>
        </form>
    `);
}

// Submit bed assignment
async function submitBedAssignment(e, wardId, bedId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const patientData = {
        patientName: formData.get('patientName'),
        diagnosis: formData.get('diagnosis'),
        doctor: formData.get('doctor')
    };
    
    try {
        const response = await api.assignPatientToBed(wardId, bedId, patientData);
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderBedOverview();
            updateBedStats();
            toast.show(`Patient assigned to bed ${bedId}`, 'success');
        } else {
            toast.show(response.error || 'Failed to assign patient', 'error');
        }
    } catch (err) {
        console.error('Error assigning patient:', err);
        toast.show('Failed to assign patient', 'error');
    }
}

// Discharge patient from bed
function dischargeBed(wardId, bedId) {
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    const beds = ward?.beds || [];
    const bed = beds.find(b => b.id === bedId);
    
    if (!bed || !bed.patient) return;
    
    showModal('Confirm Discharge', `
        <div class="confirm-dialog">
            <div class="confirm-icon warning">
                <i class="fas fa-sign-out-alt"></i>
            </div>
            <h3>Discharge Patient?</h3>
            <p>Are you sure you want to discharge <strong>${bed.patient.name}</strong> from bed <strong>${bedId}</strong>?</p>
            <div class="confirm-actions">
                <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn-primary" onclick="confirmDischarge('${wardId}', '${bedId}')">
                    <i class="fas fa-check"></i> Confirm Discharge
                </button>
            </div>
        </div>
    `);
}

// Confirm discharge
async function confirmDischarge(wardId, bedId) {
    try {
        const response = await api.dischargeBedPatient(wardId, bedId);
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderBedOverview();
            updateBedStats();
            toast.show(`${response.patientName || 'Patient'} discharged successfully`, 'success');
        } else {
            toast.show(response.error || 'Failed to discharge patient', 'error');
        }
    } catch (err) {
        console.error('Error discharging patient:', err);
        toast.show('Failed to discharge patient', 'error');
    }
}

// Transfer patient
function transferPatient(wardId, bedId) {
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    const beds = ward?.beds || [];
    const bed = beds.find(b => b.id === bedId);
    
    if (!bed || !bed.patient) return;
    
    // Get available beds in other wards
    const availableBeds = [];
    hospitalBeds.wards.forEach(w => {
        (w.beds || []).forEach(b => {
            if (b.status === 'available') {
                availableBeds.push({ ward: w, bed: b });
            }
        });
    });
    
    closeModal();
    showModal('Transfer Patient', `
        <form onsubmit="submitTransfer(event, '${wardId}', '${bedId}')" class="settings-form">
            <div class="transfer-info">
                <p><strong>Patient:</strong> ${bed.patient.name}</p>
                <p><strong>Current Bed:</strong> ${bedId} (${ward.name})</p>
            </div>
            <div class="form-group">
                <label>Transfer To <span class="required">*</span></label>
                <select name="targetBed" required>
                    <option value="">Select destination bed</option>
                    ${availableBeds.map(ab => `
                        <option value="${ab.ward.id}|${ab.bed.id}">${ab.bed.id} - ${ab.ward.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Transfer Reason</label>
                <textarea name="reason" placeholder="Reason for transfer"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-exchange-alt"></i> Transfer</button>
            </div>
        </form>
    `);
}

// Submit transfer
async function submitTransfer(e, fromWardId, fromBedId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const targetBed = formData.get('targetBed');
    
    if (!targetBed) {
        toast.show('Please select a destination bed', 'error');
        return;
    }
    
    const [toWardId, toBedId] = targetBed.split('|');
    
    try {
        const response = await api.transferBedPatient(fromBedId, toBedId);
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderBedOverview();
            updateBedStats();
            toast.show(`Patient transferred from ${fromBedId} to ${toBedId}`, 'success');
        } else {
            toast.show(response.error || 'Failed to transfer patient', 'error');
        }
    } catch (err) {
        console.error('Error transferring patient:', err);
        toast.show('Failed to transfer patient', 'error');
    }
}

// Change bed status
function changeBedStatus(wardId, bedId) {
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    const beds = ward?.beds || [];
    const bed = beds.find(b => b.id === bedId);
    
    if (!bed) return;
    
    closeModal();
    showModal('Change Bed Status', `
        <form onsubmit="submitStatusChange(event, '${wardId}', '${bedId}')" class="settings-form">
            <div class="form-group">
                <label>Current Status</label>
                <p class="status-badge ${bed.status}">${getBedStatusText(bed.status)}</p>
            </div>
            <div class="form-group">
                <label>New Status <span class="required">*</span></label>
                <select name="status" required>
                    <option value="available" ${bed.status === 'available' ? 'selected' : ''}>Available</option>
                    <option value="occupied" ${bed.status === 'occupied' ? 'selected' : ''}>Occupied</option>
                    <option value="critical" ${bed.status === 'critical' ? 'selected' : ''}>Critical</option>
                    <option value="maintenance" ${bed.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                    <option value="reserved" ${bed.status === 'reserved' ? 'selected' : ''}>Reserved</option>
                </select>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea name="notes" placeholder="Optional notes"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Update Status</button>
            </div>
        </form>
    `);
}

// Submit status change
async function submitStatusChange(e, wardId, bedId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newStatus = formData.get('status');
    
    try {
        const response = await api.updateBed(wardId, bedId, { status: newStatus });
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderBedOverview();
            updateBedStats();
            toast.show(`Bed ${bedId} status updated to ${newStatus}`, 'success');
        } else {
            toast.show(response.error || 'Failed to update bed status', 'error');
        }
    } catch (err) {
        console.error('Error updating bed status:', err);
        toast.show('Failed to update bed status', 'error');
    }
}

// Refresh bed status
async function refreshBedStatus() {
    toast.show('Refreshing bed status...', 'info');
    await initializeBedData();
    renderWardTabs();
    renderBedOverview();
    updateBedStats();
    toast.show('Bed status refreshed from database', 'success');
}

// Open bed transfer modal
function openBedTransferModal() {
    // Get all occupied beds
    const occupiedBeds = [];
    hospitalBeds.wards.forEach(w => {
        (w.beds || []).forEach(b => {
            if (b.status === 'occupied' || b.status === 'critical') {
                occupiedBeds.push({ ward: w, bed: b });
            }
        });
    });
    
    if (occupiedBeds.length === 0) {
        toast.show('No patients to transfer', 'warning');
        return;
    }
    
    showModal('Transfer Patient', `
        <form onsubmit="handleTransferForm(event)" class="settings-form">
            <div class="form-group">
                <label>Select Patient to Transfer <span class="required">*</span></label>
                <select name="sourceBed" id="transferSourceBed" required onchange="updateTransferTarget()">
                    <option value="">Select patient</option>
                    ${occupiedBeds.map(ob => `
                        <option value="${ob.ward.id}|${ob.bed.id}">${ob.bed.patient?.name || 'Unknown'} - ${ob.bed.id} (${ob.ward.name})</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Transfer To <span class="required">*</span></label>
                <select name="targetBed" id="transferTargetBed" required>
                    <option value="">Select destination bed</option>
                </select>
            </div>
            <div class="form-group">
                <label>Transfer Reason</label>
                <textarea name="reason" placeholder="Reason for transfer"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-exchange-alt"></i> Transfer Patient</button>
            </div>
        </form>
    `);
}

// Update transfer target dropdown
function updateTransferTarget() {
    const sourceSelect = document.getElementById('transferSourceBed');
    const targetSelect = document.getElementById('transferTargetBed');
    
    const availableBeds = [];
    hospitalBeds.wards.forEach(w => {
        (w.beds || []).forEach(b => {
            if (b.status === 'available') {
                availableBeds.push({ ward: w, bed: b });
            }
        });
    });
    
    targetSelect.innerHTML = `
        <option value="">Select destination bed</option>
        ${availableBeds.map(ab => `
            <option value="${ab.ward.id}|${ab.bed.id}">${ab.bed.id} - ${ab.ward.name}</option>
        `).join('')}
    `;
}

// Handle transfer form submission
async function handleTransferForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const sourceBed = formData.get('sourceBed');
    const targetBed = formData.get('targetBed');
    
    if (!sourceBed || !targetBed) {
        toast.show('Please select both source and destination beds', 'error');
        return;
    }
    
    const [fromWardId, fromBedId] = sourceBed.split('|');
    const [toWardId, toBedId] = targetBed.split('|');
    
    try {
        const response = await api.transferBedPatient(fromBedId, toBedId);
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderBedOverview();
            updateBedStats();
            toast.show(`${response.patientName || 'Patient'} transferred to ${toBedId}`, 'success');
        } else {
            toast.show(response.error || 'Failed to transfer patient', 'error');
        }
    } catch (err) {
        console.error('Error transferring patient:', err);
        toast.show('Failed to transfer patient', 'error');
    }
}

// ============================================
// WARD MANAGEMENT FUNCTIONS
// ============================================

// Open Manage Wards Modal
function openManageWardsModal() {
    const wardsListHtml = hospitalBeds.wards.map(ward => {
        const beds = ward.beds || [];
        return `
        <div class="ward-item" data-ward="${ward.id}">
            <div class="ward-item-info">
                <strong>${ward.name}</strong>
                <span class="ward-item-details">Prefix: ${ward.prefix} | Beds: ${beds.length}</span>
            </div>
            <div class="ward-item-actions">
                <button class="btn-sm btn-secondary" onclick="editWard('${ward.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-sm btn-danger" onclick="deleteWard('${ward.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `}).join('');

    const totalBeds = hospitalBeds.wards.reduce((sum, w) => sum + (w.beds || []).length, 0);

    showModal('Manage Wards & Room Types', `
        <div class="manage-wards-modal">
            <div class="ward-list-header">
                <h4><i class="fas fa-list"></i> Current Wards (${hospitalBeds.wards.length})</h4>
                <button class="btn-primary btn-sm" onclick="openAddWardModal()"><i class="fas fa-plus"></i> Add New Ward</button>
            </div>
            <div class="ward-list">
                ${wardsListHtml || '<p class="no-data">No wards configured</p>'}
            </div>
            <div class="ward-summary-info">
                <div class="summary-stat">
                    <i class="fas fa-hospital"></i>
                    <span>${hospitalBeds.wards.length} Wards</span>
                </div>
                <div class="summary-stat">
                    <i class="fas fa-bed"></i>
                    <span>${totalBeds} Total Beds</span>
                </div>
            </div>
        </div>
    `);
}

// Open Add Ward Modal
function openAddWardModal() {
    showModal('Add New Ward / Room Type', `
        <form onsubmit="submitAddWard(event)" class="settings-form">
            <div class="form-group">
                <label><i class="fas fa-hospital-alt"></i> Ward Name *</label>
                <input type="text" name="wardName" required placeholder="e.g., General Ward, ICU, Private Rooms">
            </div>
            <div class="form-group">
                <label><i class="fas fa-tag"></i> Ward Prefix *</label>
                <input type="text" name="wardPrefix" required placeholder="e.g., GW, ICU, PR" maxlength="5" style="text-transform: uppercase;">
                <small>Used for bed numbering (e.g., GW-01, ICU-05)</small>
            </div>
            <div class="form-group">
                <label><i class="fas fa-bed"></i> Number of Beds *</label>
                <input type="number" name="numBeds" required min="1" max="100" placeholder="Enter number of beds">
            </div>
            <div class="form-group">
                <label><i class="fas fa-info-circle"></i> Ward Type</label>
                <select name="wardType">
                    <option value="general">General</option>
                    <option value="icu">Intensive Care</option>
                    <option value="private">Private</option>
                    <option value="semi-private">Semi-Private</option>
                    <option value="pediatric">Pediatric</option>
                    <option value="maternity">Maternity</option>
                    <option value="emergency">Emergency</option>
                    <option value="surgical">Surgical</option>
                    <option value="orthopedic">Orthopedic</option>
                    <option value="cardiac">Cardiac</option>
                    <option value="neuro">Neurology</option>
                    <option value="oncology">Oncology</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-rupee-sign"></i> Rate Per Day (₹)</label>
                <input type="number" name="ratePerDay" min="0" placeholder="e.g., 500, 2000, 5000">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-plus"></i> Add Ward</button>
            </div>
        </form>
    `);
}

// Submit Add Ward
async function submitAddWard(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const wardData = {
        name: formData.get('wardName').trim(),
        prefix: formData.get('wardPrefix').trim().toUpperCase(),
        numBeds: parseInt(formData.get('numBeds')),
        type: formData.get('wardType'),
        ratePerDay: parseFloat(formData.get('ratePerDay')) || 0
    };
    
    try {
        const response = await api.createWard(wardData);
        if (response.success) {
            hospitalBeds.wards.push(response.data);
            closeModal();
            renderWardTabs();
            renderBedOverview();
            updateBedStats();
            toast.show(`Ward "${wardData.name}" added with ${wardData.numBeds} beds`, 'success');
        } else {
            toast.show(response.error || 'Failed to create ward', 'error');
        }
    } catch (err) {
        console.error('Error creating ward:', err);
        toast.show('Failed to create ward', 'error');
    }
}

// Edit Ward
function editWard(wardId) {
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    if (!ward) {
        toast.show('Ward not found', 'error');
        return;
    }
    
    const beds = ward.beds || [];
    showModal(`Edit Ward: ${ward.name}`, `
        <form onsubmit="submitEditWard(event, '${wardId}')" class="settings-form">
            <div class="form-group">
                <label><i class="fas fa-hospital-alt"></i> Ward Name *</label>
                <input type="text" name="wardName" required value="${ward.name}">
            </div>
            <div class="form-group">
                <label><i class="fas fa-tag"></i> Ward Prefix *</label>
                <input type="text" name="wardPrefix" required value="${ward.prefix}" maxlength="5" style="text-transform: uppercase;">
                <small>Changing prefix will update all bed IDs</small>
            </div>
            <div class="form-group">
                <label><i class="fas fa-bed"></i> Add More Beds</label>
                <input type="number" name="addBeds" min="0" max="50" placeholder="Enter number of beds to add" value="0">
                <small>Current beds: ${beds.length}</small>
            </div>
            <div class="form-group">
                <label><i class="fas fa-rupee-sign"></i> Rate Per Day (₹)</label>
                <input type="number" name="ratePerDay" min="0" value="${ward.ratePerDay || 0}">
            </div>
            <div class="form-info">
                <h4>Ward Statistics</h4>
                <p><strong>Total Beds:</strong> ${beds.length}</p>
                <p><strong>Occupied:</strong> ${beds.filter(b => b.status === 'occupied' || b.status === 'critical').length}</p>
                <p><strong>Available:</strong> ${beds.filter(b => b.status === 'available').length}</p>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save Changes</button>
            </div>
        </form>
    `);
}

// Submit Edit Ward
async function submitEditWard(e, wardId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const wardData = {
        name: formData.get('wardName').trim(),
        prefix: formData.get('wardPrefix').trim().toUpperCase(),
        addBeds: parseInt(formData.get('addBeds')) || 0,
        ratePerDay: parseFloat(formData.get('ratePerDay')) || 0
    };
    
    try {
        const response = await api.updateWard(wardId, wardData);
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderWardTabs();
            renderBedOverview();
            updateBedStats();
            toast.show(`Ward "${wardData.name}" updated successfully`, 'success');
        } else {
            toast.show(response.error || 'Failed to update ward', 'error');
        }
    } catch (err) {
        console.error('Error updating ward:', err);
        toast.show('Failed to update ward', 'error');
    }
}

// Delete Ward
function deleteWard(wardId) {
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    if (!ward) return;
    
    const beds = ward.beds || [];
    const occupiedBeds = beds.filter(b => b.status === 'occupied' || b.status === 'critical').length;
    
    showModal('Delete Ward', `
        <div class="confirm-dialog">
            <div class="confirm-icon warning">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Delete "${ward.name}"?</h3>
            <p>This will permanently remove the ward and all ${beds.length} beds.</p>
            ${occupiedBeds > 0 ? `<p class="warning-text"><strong>Warning:</strong> ${occupiedBeds} beds are currently occupied!</p>` : ''}
            <div class="confirm-actions">
                <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn-danger" onclick="confirmDeleteWard('${wardId}')"><i class="fas fa-trash"></i> Delete Ward</button>
            </div>
        </div>
    `);
}

// Confirm Delete Ward
async function confirmDeleteWard(wardId) {
    try {
        const response = await api.deleteWard(wardId);
        if (response.success) {
            const wardIndex = hospitalBeds.wards.findIndex(w => w.id === wardId);
            if (wardIndex !== -1) {
                const wardName = hospitalBeds.wards[wardIndex].name;
                hospitalBeds.wards.splice(wardIndex, 1);
                toast.show(`Ward "${wardName}" deleted`, 'success');
            }
            closeModal();
            renderWardTabs();
            renderBedOverview();
            updateBedStats();
        } else {
            toast.show(response.error || 'Failed to delete ward', 'error');
        }
    } catch (err) {
        console.error('Error deleting ward:', err);
        toast.show('Failed to delete ward', 'error');
    }
}

// ============================================
// BED MANAGEMENT FUNCTIONS
// ============================================

// Open Add Bed Modal
function openAddBedModal() {
    const wardOptions = hospitalBeds.wards.map(w => 
        `<option value="${w.id}">${w.name} (${w.beds.length} beds)</option>`
    ).join('');
    
    showModal('Add New Bed', `
        <form onsubmit="submitAddBed(event)" class="settings-form">
            <div class="form-group">
                <label><i class="fas fa-hospital"></i> Select Ward *</label>
                <select name="wardId" required>
                    <option value="">-- Select Ward --</option>
                    ${wardOptions}
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-bed"></i> Number of Beds to Add *</label>
                <input type="number" name="numBeds" required min="1" max="20" value="1">
            </div>
            <div class="form-group">
                <label><i class="fas fa-flag"></i> Initial Status</label>
                <select name="status">
                    <option value="available">Available</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="reserved">Reserved</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-plus"></i> Add Bed(s)</button>
            </div>
        </form>
    `);
}

// Submit Add Bed
async function submitAddBed(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const wardId = formData.get('wardId');
    const numBeds = parseInt(formData.get('numBeds'));
    const status = formData.get('status');
    
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    if (!ward) {
        toast.show('Please select a ward', 'error');
        return;
    }
    
    try {
        const response = await api.addBedsToWard(wardId, { numBeds, status });
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderBedOverview();
            updateBedStats();
            toast.show(`${numBeds} bed(s) added to ${ward.name}`, 'success');
        } else {
            toast.show(response.error || 'Failed to add beds', 'error');
        }
    } catch (err) {
        console.error('Error adding beds:', err);
        toast.show('Failed to add beds', 'error');
    }
}

// Delete Bed
function deleteBed(wardId, bedId) {
    const ward = hospitalBeds.wards.find(w => w.id === wardId);
    if (!ward) return;
    
    const beds = ward.beds || [];
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;
    
    if (bed.status === 'occupied' || bed.status === 'critical') {
        toast.show('Cannot delete an occupied bed. Please discharge the patient first.', 'error');
        return;
    }
    
    showModal('Delete Bed', `
        <div class="confirm-dialog">
            <div class="confirm-icon warning">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Delete Bed ${bedId}?</h3>
            <p>This will permanently remove this bed from ${ward.name}.</p>
            <div class="confirm-actions">
                <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn-danger" onclick="confirmDeleteBed('${wardId}', '${bedId}')"><i class="fas fa-trash"></i> Delete Bed</button>
            </div>
        </div>
    `);
}

// Confirm Delete Bed
async function confirmDeleteBed(wardId, bedId) {
    try {
        const response = await api.deleteBed(wardId, bedId);
        if (response.success) {
            // Reload data from API
            await initializeBedData();
            closeModal();
            renderBedOverview();
            updateBedStats();
            toast.show(`Bed ${bedId} deleted`, 'success');
        } else {
            toast.show(response.error || 'Failed to delete bed', 'error');
        }
    } catch (err) {
        console.error('Error deleting bed:', err);
        toast.show('Failed to delete bed', 'error');
    }
}

// View IPD Patient Details
function viewIPDPatient(patientId) {
    // Get patient data
    api.getPatients().then(response => {
        if (response.success) {
            const patient = response.data.find(p => (p._id === patientId || p.id === patientId) && p.type === 'IPD');
            if (patient) {
                showModal('IPD Patient Details', createIPDDetailsView(patient));
            } else {
                toast.show('Patient not found', 'error');
            }
        }
    }).catch(err => {
        console.error('Error fetching patient:', err);
        toast.show('Error loading patient details', 'error');
    });
}

// Create IPD Details View
function createIPDDetailsView(patient) {
    // Format date properly
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    return `
        <div class="patient-details-view">
            <div class="patient-header">
                <div class="patient-avatar">
                    <i class="fas fa-user-injured"></i>
                </div>
                <div class="patient-basic-info">
                    <h2>${patient.name}</h2>
                    <p class="patient-id">${patient.patientId || patient._id}</p>
                    <span class="status-badge ${patient.status.toLowerCase()}">${patient.status}</span>
                </div>
            </div>
            
            <div class="patient-details-grid">
                <div class="detail-section">
                    <h3><i class="fas fa-user"></i> Personal Information</h3>
                    <div class="detail-row">
                        <span class="label">Age/Gender</span>
                        <span class="value">${patient.age} years / ${patient.gender}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Blood Group</span>
                        <span class="value">${patient.bloodGroup || 'Not recorded'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Contact</span>
                        <span class="value">${patient.phone || patient.contact || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Address</span>
                        <span class="value">${patient.address || 'Not recorded'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-hospital"></i> Admission Details</h3>
                    <div class="detail-row">
                        <span class="label">Ward / Bed</span>
                        <span class="value">${patient.ward || 'N/A'} / ${patient.bed || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Admission Date</span>
                        <span class="value">${formatDate(patient.admissionDate || patient.createdAt)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Attending Doctor</span>
                        <span class="value">${patient.doctor || 'Not assigned'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Department</span>
                        <span class="value">${patient.department || 'General'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-notes-medical"></i> Medical Information</h3>
                    <div class="detail-row">
                        <span class="label">Diagnosis</span>
                        <span class="value">${patient.diagnosis || 'Under evaluation'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Chief Complaint</span>
                        <span class="value">${patient.complaint || patient.chiefComplaint || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Allergies</span>
                        <span class="value">${Array.isArray(patient.allergies) ? (patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None known') : (patient.allergies || 'None known')}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-heartbeat"></i> Vitals</h3>
                    <div class="vitals-display">
                        <div class="vital-item">
                            <span class="vital-label">BP</span>
                            <span class="vital-value">${patient.vitals?.bloodPressure || patient.vitals?.bp || patient.bp || '120/80'}</span>
                        </div>
                        <div class="vital-item">
                            <span class="vital-label">Pulse</span>
                            <span class="vital-value">${patient.vitals?.heartRate || patient.vitals?.pulse || patient.pulse || '72'} bpm</span>
                        </div>
                        <div class="vital-item">
                            <span class="vital-label">Temp</span>
                            <span class="vital-value">${patient.vitals?.temperature || patient.vitals?.temp || patient.temperature || '98.6'}°F</span>
                        </div>
                        <div class="vital-item">
                            <span class="vital-label">SpO2</span>
                            <span class="vital-value">${patient.vitals?.oxygenSaturation || patient.vitals?.spo2 || patient.spo2 || '98'}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="patient-actions">
                <button class="btn-secondary" onclick="printPatientDetails('${patient._id || patient.id}')">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn-secondary" onclick="viewPatientHistory('${patient._id || patient.id}')">
                    <i class="fas fa-history"></i> History
                </button>
                <button class="btn-primary" onclick="editPatient('${patient._id || patient.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        </div>
    `;
}

// Discharge Patient
function dischargePatient(patientId) {
    showModal('Discharge Patient', `
        <form id="dischargeForm" onsubmit="processDischarge(event, '${patientId}')">
            <div class="form-group">
                <label><i class="fas fa-calendar"></i> Discharge Date <span class="required">*</span></label>
                <input type="date" id="dischargeDate" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-notes-medical"></i> Discharge Summary</label>
                <textarea id="dischargeSummary" rows="4" placeholder="Enter discharge summary..."></textarea>
            </div>
            <div class="form-group">
                <label><i class="fas fa-pills"></i> Medications to Continue</label>
                <textarea id="dischargeMeds" rows="3" placeholder="List medications..."></textarea>
            </div>
            <div class="form-group">
                <label><i class="fas fa-calendar-check"></i> Follow-up Date</label>
                <input type="date" id="followUpDate">
            </div>
            <div class="form-group">
                <label><i class="fas fa-clipboard-list"></i> Instructions</label>
                <textarea id="dischargeInstructions" rows="3" placeholder="Post-discharge instructions..."></textarea>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="printDischargeSummary" checked>
                    <i class="fas fa-print"></i> Print Discharge Summary
                </label>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-sign-out-alt"></i> Process Discharge
                </button>
            </div>
        </form>
    `);
}

// Process Discharge
async function processDischarge(e, patientId) {
    e.preventDefault();
    
    const dischargeData = {
        status: 'Discharged',
        dischargeDate: document.getElementById('dischargeDate').value,
        dischargeSummary: document.getElementById('dischargeSummary').value,
        dischargeMeds: document.getElementById('dischargeMeds').value,
        followUpDate: document.getElementById('followUpDate').value,
        dischargeInstructions: document.getElementById('dischargeInstructions').value
    };
    
    const shouldPrint = document.getElementById('printDischargeSummary')?.checked;
    
    try {
        // First, get the current patient data
        const patientResponse = await api.getPatients();
        const currentPatient = patientResponse.data?.find(p => p._id === patientId || p.id === patientId);
        
        // Update patient status
        const response = await fetch(`${API_URL}/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dischargeData)
        });
        
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Patient discharged successfully', 'success');
            
            // Print discharge summary if checkbox was checked
            if (shouldPrint && currentPatient) {
                const dischargePatientData = {
                    ...currentPatient,
                    ...dischargeData,
                    prescribedMedications: dischargeData.dischargeMeds
                };
                setTimeout(() => {
                    PrintUtils.printDischargeSummary(dischargePatientData);
                }, 500);
            }
        } else {
            toast.show('Error processing discharge', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        toast.show('Error processing discharge', 'error');
    }
}

// Print Discharge Summary - Stand alone function for already discharged patients
function printDischargeSummary(patientId) {
    toast.show('Preparing discharge summary for print...', 'info');
    api.getPatients().then(response => {
        if (response.success) {
            const patient = response.data.find(p => p._id === patientId || p.id === patientId);
            if (patient) {
                PrintUtils.printDischargeSummary(patient);
                toast.show('Opening print preview...', 'success');
            } else {
                toast.show('Patient not found', 'error');
            }
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error preparing print', 'error');
    });
}

// View Emergency Patient Details
function viewEmergencyPatient(patientId) {
    api.getPatients().then(response => {
        if (response.success) {
            const patient = response.data.find(p => (p._id === patientId || p.id === patientId) && p.type === 'Emergency');
            if (patient) {
                showModal('Emergency Patient Details', createEmergencyDetailsView(patient));
            } else {
                toast.show('Patient not found', 'error');
            }
        }
    }).catch(err => {
        console.error('Error fetching patient:', err);
        toast.show('Error loading patient details', 'error');
    });
}

// Create Emergency Details View
function createEmergencyDetailsView(patient) {
    const severityClass = (patient.severity || patient.triage || 'Critical').toLowerCase();
    
    return `
        <div class="emergency-details-view">
            <div class="emergency-header ${severityClass}">
                <div class="severity-indicator">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${patient.severity || patient.triage || 'Critical'}</span>
                </div>
                <div class="patient-basic">
                    <h2>${patient.name}</h2>
                    <p>${patient.patientId || patient._id}</p>
                </div>
                <div class="arrival-time">
                    <i class="fas fa-clock"></i>
                    <span>Arrived: ${patient.time || new Date(patient.createdAt).toLocaleTimeString()}</span>
                </div>
            </div>
            
            <div class="emergency-content">
                <div class="detail-section critical-info">
                    <h3><i class="fas fa-exclamation-circle"></i> Chief Complaint</h3>
                    <p class="complaint-text">${patient.complaint || patient.chiefComplaint || 'Not recorded'}</p>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-heartbeat"></i> Vital Signs</h3>
                    <div class="vitals-grid-display">
                        <div class="vital-card">
                            <i class="fas fa-heart"></i>
                            <span class="vital-name">Blood Pressure</span>
                            <span class="vital-reading">${patient.vitals?.bp || patient.bp || 'N/A'}</span>
                        </div>
                        <div class="vital-card">
                            <i class="fas fa-wave-square"></i>
                            <span class="vital-name">Pulse Rate</span>
                            <span class="vital-reading">${patient.vitals?.pulse || patient.pulse || 'N/A'} bpm</span>
                        </div>
                        <div class="vital-card">
                            <i class="fas fa-thermometer-half"></i>
                            <span class="vital-name">Temperature</span>
                            <span class="vital-reading">${patient.vitals?.temp || patient.temperature || 'N/A'}°F</span>
                        </div>
                        <div class="vital-card">
                            <i class="fas fa-lungs"></i>
                            <span class="vital-name">SpO2</span>
                            <span class="vital-reading">${patient.vitals?.spo2 || patient.spo2 || 'N/A'}%</span>
                        </div>
                        <div class="vital-card">
                            <i class="fas fa-breathing"></i>
                            <span class="vital-name">Resp. Rate</span>
                            <span class="vital-reading">${patient.vitals?.respRate || patient.respRate || 'N/A'}/min</span>
                        </div>
                        <div class="vital-card">
                            <i class="fas fa-tint"></i>
                            <span class="vital-name">Blood Glucose</span>
                            <span class="vital-reading">${patient.vitals?.glucose || patient.glucose || 'N/A'} mg/dL</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-columns">
                    <div class="detail-section">
                        <h3><i class="fas fa-user"></i> Patient Information</h3>
                        <div class="detail-row">
                            <span class="label">Age/Gender</span>
                            <span class="value">${patient.age} / ${patient.gender}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Blood Group</span>
                            <span class="value">${patient.bloodGroup || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Contact</span>
                            <span class="value">${patient.phone || patient.contact || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Emergency Contact</span>
                            <span class="value">${patient.emergencyContact || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="fas fa-user-md"></i> Treatment</h3>
                        <div class="detail-row">
                            <span class="label">Assigned Doctor</span>
                            <span class="value">${patient.doctor || patient.assignedTo || 'Pending'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Status</span>
                            <span class="value"><span class="status-badge ${patient.status.toLowerCase().replace(' ', '-')}">${patient.status}</span></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Bed/Location</span>
                            <span class="value">${patient.bed || 'ER Bay'}</span>
                        </div>
                    </div>
                </div>
                
                ${patient.allergies ? `
                <div class="detail-section allergy-warning">
                    <h3><i class="fas fa-allergies"></i> Allergies</h3>
                    <p class="allergy-text">${patient.allergies}</p>
                </div>
                ` : ''}
            </div>
            
            <div class="emergency-actions">
                <button class="btn-danger" onclick="escalateEmergency('${patient._id || patient.id}')">
                    <i class="fas fa-arrow-up"></i> Escalate
                </button>
                <button class="btn-secondary" onclick="orderLabTests('${patient._id || patient.id}')">
                    <i class="fas fa-flask"></i> Order Labs
                </button>
                <button class="btn-secondary" onclick="orderImaging('${patient._id || patient.id}')">
                    <i class="fas fa-x-ray"></i> Order Imaging
                </button>
                <button class="btn-primary" onclick="admitFromEmergency('${patient._id || patient.id}')">
                    <i class="fas fa-bed"></i> Admit to IPD
                </button>
            </div>
        </div>
    `;
}

// Escalate Emergency
function escalateEmergency(patientId) {
    toast.show('Emergency escalated - Notifying senior staff', 'warning');
    // In real app, would trigger notifications
}

// Admit from Emergency to IPD
function admitFromEmergency(patientId) {
    showModal('Admit to IPD', createIPDAdmissionFromERForm(patientId));
}

function createIPDAdmissionFromERForm(patientId) {
    return `
        <form id="admitFromERForm" onsubmit="processAdmitFromER(event, '${patientId}')">
            <div class="form-row">
                <div class="form-group">
                    <label><i class="fas fa-hospital"></i> Ward <span class="required">*</span></label>
                    <select id="admitWard" required>
                        <option value="">Select Ward</option>
                        <option value="General">General Ward</option>
                        <option value="ICU">ICU</option>
                        <option value="CCU">CCU</option>
                        <option value="Surgical">Surgical Ward</option>
                        <option value="Pediatric">Pediatric Ward</option>
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-bed"></i> Bed Number <span class="required">*</span></label>
                    <input type="text" id="admitBed" placeholder="e.g., A-101" required>
                </div>
            </div>
            <div class="form-group">
                <label><i class="fas fa-user-md"></i> Attending Doctor <span class="required">*</span></label>
                <input type="text" id="admitDoctor" placeholder="Doctor name" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-notes-medical"></i> Diagnosis</label>
                <textarea id="admitDiagnosis" rows="3" placeholder="Initial diagnosis..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-bed"></i> Admit Patient
                </button>
            </div>
        </form>
    `;
}

async function processAdmitFromER(e, patientId) {
    e.preventDefault();
    
    const admitData = {
        type: 'IPD',
        ward: document.getElementById('admitWard').value,
        bed: document.getElementById('admitBed').value,
        doctor: document.getElementById('admitDoctor').value,
        diagnosis: document.getElementById('admitDiagnosis').value,
        status: 'Active',
        admissionDate: new Date().toLocaleDateString()
    };
    
    try {
        const response = await fetch(`${API_URL}/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(admitData)
        });
        
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Patient admitted to IPD successfully', 'success');
        } else {
            toast.show('Error admitting patient', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        toast.show('Error admitting patient', 'error');
    }
}

// Treat Emergency Patient
function treatEmergencyPatient(patientId) {
    showModal('Emergency Treatment', `
        <form id="treatmentForm" onsubmit="saveTreatment(event, '${patientId}')">
            <div class="form-group">
                <label><i class="fas fa-user-md"></i> Treating Physician <span class="required">*</span></label>
                <input type="text" id="treatingDoctor" placeholder="Doctor name" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-notes-medical"></i> Clinical Findings</label>
                <textarea id="clinicalFindings" rows="3" placeholder="Document findings..."></textarea>
            </div>
            <div class="form-group">
                <label><i class="fas fa-syringe"></i> Treatment Given</label>
                <textarea id="treatmentGiven" rows="3" placeholder="Medications, procedures..."></textarea>
            </div>
            <div class="form-group">
                <label><i class="fas fa-clipboard-list"></i> Status Update</label>
                <select id="patientStatusUpdate">
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Stable">Stable - Under Observation</option>
                    <option value="Critical">Critical - Needs ICU</option>
                    <option value="Discharged">Discharged</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Save Treatment
                </button>
            </div>
        </form>
    `);
}

async function saveTreatment(e, patientId) {
    e.preventDefault();
    
    const treatmentData = {
        doctor: document.getElementById('treatingDoctor').value,
        clinicalFindings: document.getElementById('clinicalFindings').value,
        treatmentGiven: document.getElementById('treatmentGiven').value,
        status: document.getElementById('patientStatusUpdate').value
    };
    
    try {
        const response = await fetch(`${API_URL}/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(treatmentData)
        });
        
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Treatment saved successfully', 'success');
        } else {
            toast.show('Error saving treatment', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        toast.show('Error saving treatment', 'error');
    }
}

// Print Patient Details - Using Professional Print Utils (alternate location)
// Main implementation is defined later in the file

// Show KPI Details
function showKPIDetails(kpiType) {
    const kpiInfo = {
        satisfaction: {
            title: 'Patient Satisfaction Score',
            description: 'Based on 1,247 patient feedback forms collected this month',
            breakdown: [
                { label: 'Excellent (5)', value: '68%' },
                { label: 'Good (4)', value: '24%' },
                { label: 'Average (3)', value: '6%' },
                { label: 'Poor (1-2)', value: '2%' }
            ]
        },
        waitTime: {
            title: 'Average Wait Time Analysis',
            description: 'Average time from registration to consultation',
            breakdown: [
                { label: 'OPD', value: '15 min' },
                { label: 'Emergency', value: '5 min' },
                { label: 'Lab', value: '12 min' },
                { label: 'Pharmacy', value: '8 min' }
            ]
        },
        bedTurnover: {
            title: 'Bed Turnover Rate',
            description: 'Average length of stay per admission',
            breakdown: [
                { label: 'General Ward', value: '2.1 days' },
                { label: 'ICU', value: '4.5 days' },
                { label: 'Private Room', value: '2.8 days' },
                { label: 'Semi-Private', value: '2.4 days' }
            ]
        },
        revenuePerPatient: {
            title: 'Revenue Per Patient',
            description: 'Average revenue generated per patient visit',
            breakdown: [
                { label: 'OPD Consultation', value: '₹500' },
                { label: 'IPD Services', value: '₹15,000' },
                { label: 'Lab Tests', value: '₹2,500' },
                { label: 'Pharmacy', value: '₹1,200' }
            ]
        }
    };
    
    const info = kpiInfo[kpiType];
    if (info) {
        showModal(info.title, `
            <div class="kpi-details-modal">
                <p class="kpi-description">${info.description}</p>
                <div class="kpi-breakdown">
                    ${info.breakdown.map(item => `
                        <div class="breakdown-item">
                            <span class="breakdown-label">${item.label}</span>
                            <span class="breakdown-value">${item.value}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="kpi-actions">
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                    <button class="btn-primary" onclick="exportKPIReport('${kpiType}')"><i class="fas fa-download"></i> Export Details</button>
                </div>
            </div>
        `);
    }
}

// Export KPI Report
function exportKPIReport(kpiType) {
    toast.show(`Exporting ${kpiType} report...`, 'info');
    setTimeout(() => {
        exportAnalyticsReport();
        closeModal();
    }, 500);
}

// Save Settings
function saveSettings() {
    toast.show('Saving settings...', 'info');
    
    // Collect all form data from settings section
    const settingsSection = document.getElementById('settings');
    const inputs = settingsSection.querySelectorAll('input, select, textarea');
    const settings = {};
    
    inputs.forEach(input => {
        const label = input.closest('.form-group')?.querySelector('label')?.textContent;
        if (label) {
            if (input.type === 'checkbox') {
                settings[label] = input.checked;
            } else {
                settings[label] = input.value;
            }
        }
    });
    
    localStorage.setItem('hospitalSettings', JSON.stringify(settings));
    
    setTimeout(() => {
        toast.show('Settings saved successfully!', 'success');
    }, 500);
}

// ============================================
// GLOBAL SEARCH AND FILTER FUNCTIONS
// ============================================

// Global Search Handler
function globalSearchHandler(query) {
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        performGlobalSearch(query);
    }, 300);
}

// Perform Global Search
async function performGlobalSearch(query) {
    query = query.toLowerCase();
    const results = [];
    
    try {
        // Search patients from API
        const response = await api.getPatients();
        if (response.success) {
            const matchingPatients = response.data.filter(p => 
                p.name.toLowerCase().includes(query) ||
                (p.patientId && p.patientId.toLowerCase().includes(query)) ||
                (p.contact && p.contact.includes(query))
            ).slice(0, 5);
            
            matchingPatients.forEach(p => {
                results.push({
                    type: 'Patient',
                    title: p.name,
                    subtitle: `${p.patientId || p._id.substring(0, 8)} • ${p.type || 'OPD'}`,
                    action: () => viewPatient(p._id)
                });
            });
        }
        
        // Search staff from localStorage
        const staff = JSON.parse(localStorage.getItem('staff') || '[]');
        const matchingStaff = staff.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.empId.toLowerCase().includes(query)
        ).slice(0, 3);
        
        matchingStaff.forEach(s => {
            results.push({
                type: 'Staff',
                title: s.name,
                subtitle: `${s.empId} • ${s.designation}`,
                action: () => { window.location.hash = 'hr'; }
            });
        });
        
        // Search inventory
        const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        const matchingItems = inventory.filter(i =>
            i.itemName.toLowerCase().includes(query) ||
            i.itemCode.toLowerCase().includes(query)
        ).slice(0, 3);
        
        matchingItems.forEach(item => {
            results.push({
                type: 'Inventory',
                title: item.itemName,
                subtitle: `${item.itemCode} • Stock: ${item.currentStock}`,
                action: () => { window.location.hash = 'inventory'; }
            });
        });
        
        showSearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Show Search Results
function showSearchResults(results) {
    let dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchResultsDropdown';
        dropdown.className = 'search-results-dropdown';
        document.querySelector('.search-box').appendChild(dropdown);
    }
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-no-results">No results found</div>';
    } else {
        dropdown.innerHTML = results.map((r, i) => `
            <div class="search-result-item" onclick="window.searchResults[${i}].action(); hideSearchResults();">
                <span class="result-type ${r.type.toLowerCase()}">${r.type}</span>
                <div class="result-content">
                    <div class="result-title">${r.title}</div>
                    <div class="result-subtitle">${r.subtitle}</div>
                </div>
            </div>
        `).join('');
        window.searchResults = results;
    }
    
    dropdown.style.display = 'block';
}

// Hide Search Results
function hideSearchResults() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Execute Global Search
function executeGlobalSearch() {
    const query = document.getElementById('globalSearch').value;
    if (query) {
        performGlobalSearch(query);
    }
}

// Filter Table by Text
function filterTable(tableId, query) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    query = query.toLowerCase();
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Filter Table by Column Value
function filterTableByColumn(tableId, columnIndex, value) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > columnIndex) {
            const cellText = cells[columnIndex].textContent.toLowerCase();
            if (!value || cellText.includes(value.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// Filter Table by Date
function filterTableByDate(tableId, columnIndex, dateValue) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    const filterDate = dateValue ? new Date(dateValue).toLocaleDateString() : '';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > columnIndex) {
            const cellText = cells[columnIndex].textContent;
            if (!filterDate || cellText.includes(filterDate)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// View Patient History
function viewPatientHistory(patientId) {
    toast.show('Loading patient history...', 'info');
    // Would fetch historical records in a real app
}

// Order Lab Tests from Emergency
function orderLabTests(patientId) {
    window.location.hash = 'lab';
    setTimeout(() => {
        const btn = document.getElementById('newLabTestBtn');
        if (btn) btn.click();
    }, 300);
}

// Order Imaging from Emergency
function orderImaging(patientId) {
    window.location.hash = 'radiology';
    setTimeout(() => {
        const btn = document.getElementById('newRadiologyBtn');
        if (btn) btn.click();
    }, 300);
}

async function updateDashboardStats() {
    try {
        const stats = await api.getStats();
        if (stats.success) {
            const data = stats.data;
            
            // ========== PRIMARY METRICS ==========
            // Update Total Patients
            const totalPatientsEl = document.getElementById('totalPatientsCount');
            if (totalPatientsEl) {
                totalPatientsEl.textContent = data.totalPatients.toLocaleString('en-IN');
            }
            
            // Update Today's Patients count
            const appointmentsEl = document.getElementById('appointmentsTodayCount');
            if (appointmentsEl) {
                appointmentsEl.textContent = data.todayPatients || data.opdCount;
            }
            
            // Update appointments detail
            const appointmentsDetail = document.getElementById('appointmentsDetail');
            if (appointmentsDetail) {
                const waiting = Math.floor((data.todayOPD || data.opdCount) * 0.3);
                const completed = (data.todayOPD || data.opdCount) - waiting;
                appointmentsDetail.textContent = `${waiting} waiting, ${completed} completed`;
            }
            
            // Update Bed Occupancy
            const bedOccupancyEl = document.getElementById('bedOccupancyRate');
            if (bedOccupancyEl) {
                const occupancyRate = data.bedOccupancy || Math.round((data.occupiedBeds / (data.totalBeds || 100)) * 100);
                bedOccupancyEl.textContent = `${occupancyRate}%`;
            }
            
            // Update bed occupancy detail
            const bedOccupancyDetail = document.getElementById('bedOccupancyDetail');
            if (bedOccupancyDetail) {
                bedOccupancyDetail.textContent = `${data.occupiedBeds || 0}/${data.totalBeds || 100} beds occupied`;
            }
            
            // Update Revenue
            const revenueEl = document.getElementById('revenueTodayCount');
            if (revenueEl) {
                const todayRevenue = data.todayRevenue || 0;
                if (todayRevenue >= 1) {
                    revenueEl.textContent = `₹${todayRevenue.toFixed(1)}L`;
                } else {
                    revenueEl.textContent = `₹${(todayRevenue * 100).toFixed(0)}K`;
                }
            }
            
            // Update revenue trend
            const revenueTrend = document.getElementById('revenueTrend');
            if (revenueTrend && data.yesterdayRevenue !== undefined) {
                const change = data.yesterdayRevenue > 0 
                    ? Math.round(((data.todayRevenue - data.yesterdayRevenue) / data.yesterdayRevenue) * 100)
                    : 0;
                if (change >= 0) {
                    revenueTrend.innerHTML = `<i class="fas fa-arrow-up"></i> ${change}% vs yesterday`;
                    revenueTrend.classList.remove('negative');
                    revenueTrend.classList.add('positive');
                } else {
                    revenueTrend.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(change)}% vs yesterday`;
                    revenueTrend.classList.remove('positive');
                    revenueTrend.classList.add('negative');
                }
            }
            
            // ========== SECONDARY METRICS ==========
            // OPD Today
            const opdTodayEl = document.getElementById('opdTodayCount');
            if (opdTodayEl) {
                opdTodayEl.textContent = data.todayOPD || data.opdCount;
            }
            
            // Active IPD
            const ipdActiveEl = document.getElementById('ipdActiveCount');
            if (ipdActiveEl) {
                ipdActiveEl.textContent = data.activeIPD || data.ipdCount;
            }
            
            // Emergency Active
            const emergencyActiveEl = document.getElementById('emergencyActiveCount');
            if (emergencyActiveEl) {
                emergencyActiveEl.textContent = data.emergencyCount;
            }
            
            // Pending Labs
            const pendingLabsEl = document.getElementById('pendingLabsCount');
            if (pendingLabsEl) {
                pendingLabsEl.textContent = data.pendingLabTests || 0;
            }
            
            // Pending Imaging
            const pendingImagingEl = document.getElementById('pendingImagingCount');
            if (pendingImagingEl) {
                pendingImagingEl.textContent = data.pendingImaging || 0;
            }
            
            // Surgeries Today
            const surgeriesTodayEl = document.getElementById('surgeriesTodayCount');
            if (surgeriesTodayEl) {
                surgeriesTodayEl.textContent = data.todaySurgeries || data.scheduledSurgeries || 0;
            }
            
            // ========== BED STATUS DONUT ==========
            updateBedStatusDonut(data);
            
            // ========== DEPARTMENT STATS ==========
            updateDepartmentStats(data.departmentStats);
            
            // ========== PENDING ACTIONS ==========
            updatePendingActions(data);
            
            // ========== RECENT ADMISSIONS ==========
            if (data.recentAdmissions) {
                updateRecentAdmissions(data.recentAdmissions);
            }
            
            // ========== TODAY'S SCHEDULE ==========
            if (data.todaySchedule) {
                updateTodaySchedule(data.todaySchedule);
            }
            
            // ========== OT STATUS ==========
            updateOTStatusGrid();
            
            // ========== STAFF ON DUTY ==========
            updateStaffOnDuty();
            
            // ========== TODAY'S DATE ==========
            const todayDateEl = document.getElementById('todayDateDisplay');
            if (todayDateEl) {
                todayDateEl.textContent = new Date().toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
        }
    } catch (err) {
        console.error('Failed to update dashboard stats:', err);
    }
}

// Update Bed Status Donut Chart
function updateBedStatusDonut(data) {
    const occupancy = data.bedOccupancy || Math.round((data.occupiedBeds / (data.totalBeds || 100)) * 100);
    
    // Update donut circle
    const donutCircle = document.getElementById('bedDonutCircle');
    if (donutCircle) {
        donutCircle.style.strokeDasharray = `${occupancy}, 100`;
        // Color based on occupancy
        if (occupancy >= 90) {
            donutCircle.style.stroke = '#ef4444';
        } else if (occupancy >= 75) {
            donutCircle.style.stroke = '#f59e0b';
        } else {
            donutCircle.style.stroke = '#0891b2';
        }
    }
    
    // Update donut text
    const donutText = document.getElementById('bedDonutText');
    if (donutText) {
        donutText.textContent = `${occupancy}%`;
    }
    
    // Update legend values
    const bedsOccupied = document.getElementById('bedsOccupied');
    const bedsAvailable = document.getElementById('bedsAvailable');
    const bedsCritical = document.getElementById('bedsCritical');
    const bedsMaintenance = document.getElementById('bedsMaintenance');
    
    if (bedsOccupied) bedsOccupied.textContent = data.occupiedBeds || 0;
    if (bedsAvailable) bedsAvailable.textContent = data.availableBeds || (data.totalBeds - data.occupiedBeds) || 0;
    if (bedsCritical) bedsCritical.textContent = data.criticalBeds || 0;
    if (bedsMaintenance) bedsMaintenance.textContent = data.maintenanceBeds || 0;
}

// Update Department Stats
function updateDepartmentStats(departmentStats) {
    const deptMapping = {
        'Cardiology': 'deptCardiology',
        'Neurology': 'deptNeurology',
        'Orthopedics': 'deptOrthopedics',
        'Pediatrics': 'deptPediatrics',
        'General Medicine': 'deptGeneral',
        'General': 'deptGeneral'
    };
    
    // Reset all to 0
    Object.values(deptMapping).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
    
    // Update with actual data
    if (departmentStats && Array.isArray(departmentStats)) {
        departmentStats.forEach(stat => {
            const elementId = deptMapping[stat._id];
            if (elementId) {
                const el = document.getElementById(elementId);
                if (el) el.textContent = stat.count;
            }
        });
    }
}

// Update Pending Actions
function updatePendingActions(data) {
    // Pending Labs
    const pendingLabResults = document.getElementById('pendingLabResults');
    if (pendingLabResults) pendingLabResults.textContent = data.pendingLabTests || 0;
    
    // Pending Imaging
    const pendingImagingResults = document.getElementById('pendingImagingResults');
    if (pendingImagingResults) pendingImagingResults.textContent = data.pendingImaging || 0;
    
    // Pending Bills
    const pendingBillsEl = document.getElementById('pendingBills');
    if (pendingBillsEl) pendingBillsEl.textContent = data.pendingBills || 0;
    
    // Pending Prescriptions
    const pendingPrescriptionsEl = document.getElementById('pendingPrescriptions');
    if (pendingPrescriptionsEl) pendingPrescriptionsEl.textContent = data.pendingPrescriptions || 0;
    
    // Insurance Claims (from localStorage)
    const claims = JSON.parse(localStorage.getItem('insuranceClaims') || '[]');
    const pendingClaims = claims.filter(c => c.status === 'Pending' || c.status === 'Under Review').length;
    const pendingClaimsEl = document.getElementById('pendingClaims');
    if (pendingClaimsEl) pendingClaimsEl.textContent = pendingClaims;
    
    // Low Stock Items (from localStorage)
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const lowStock = inventory.filter(i => (i.stock || i.quantity || 0) < 50).length;
    const lowStockEl = document.getElementById('lowStockItems');
    if (lowStockEl) lowStockEl.textContent = lowStock;
}

// Update Recent Admissions
function updateRecentAdmissions(admissions) {
    const container = document.getElementById('recentAdmissions');
    if (!container) return;
    
    if (!admissions || admissions.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <span class="no-data">No recent admissions</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = admissions.map(patient => {
        const time = new Date(patient.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const ward = patient.ward || 'General Ward';
        const status = patient.status === 'Critical' ? '(Critical)' : '';
        return `
            <div class="activity-item">
                <strong>${patient.name}</strong> admitted to ${ward} ${status}<br>
                <small>${time} - ${patient.diagnosis || 'General checkup'}</small>
            </div>
        `;
    }).join('');
}

// Update Today's Schedule
function updateTodaySchedule(schedule) {
    const container = document.getElementById('todayTimeline');
    if (!container) return;
    
    if (!schedule || schedule.length === 0) {
        // Show sample timeline if no real data
        container.innerHTML = `
            <div class="timeline-item">
                <span class="timeline-time">09:00 AM</span>
                <div class="timeline-content">
                    <div class="timeline-title">OPD Opens</div>
                    <div class="timeline-desc">Morning consultations begin</div>
                </div>
                <span class="timeline-badge opd">OPD</span>
            </div>
            <div class="timeline-item">
                <span class="timeline-time">10:30 AM</span>
                <div class="timeline-content">
                    <div class="timeline-title">Scheduled Surgery</div>
                    <div class="timeline-desc">General Surgery - OT-1</div>
                </div>
                <span class="timeline-badge surgery">Surgery</span>
            </div>
            <div class="timeline-item">
                <span class="timeline-time">02:00 PM</span>
                <div class="timeline-content">
                    <div class="timeline-title">Lab Results Review</div>
                    <div class="timeline-desc">Batch results processing</div>
                </div>
                <span class="timeline-badge lab">Lab</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = schedule.map(item => {
        const time = item.time || '09:00 AM';
        return `
            <div class="timeline-item">
                <span class="timeline-time">${time}</span>
                <div class="timeline-content">
                    <div class="timeline-title">${item.procedure || item.name}</div>
                    <div class="timeline-desc">${item.patientName || 'Patient'} - ${item.otRoom || item.department || 'OT-1'}</div>
                </div>
                <span class="timeline-badge surgery">Surgery</span>
            </div>
        `;
    }).join('');
}

// Update OT Status Grid
function updateOTStatusGrid() {
    const container = document.getElementById('otStatusGrid');
    if (!container) return;
    
    const otRooms = HospitalConfig.otRooms || [
        { id: 'OT-1', name: 'OT-1', status: 'available' },
        { id: 'OT-2', name: 'OT-2', status: 'available' },
        { id: 'OT-3', name: 'OT-3', status: 'available' },
        { id: 'OT-4', name: 'OT-4', status: 'available' }
    ];
    
    const statusMap = {
        'available': { class: 'available', text: 'Available' },
        'in-use': { class: 'in-surgery', text: 'In Surgery' },
        'occupied': { class: 'in-surgery', text: 'In Surgery' },
        'maintenance': { class: 'maintenance', text: 'Maintenance' },
        'preparing': { class: 'preparing', text: 'Preparing' }
    };
    
    container.innerHTML = otRooms.slice(0, 4).map(room => {
        const statusInfo = statusMap[room.status] || statusMap['available'];
        return `
            <div class="ot-room-status">
                <span class="ot-name">${room.name}</span>
                <span class="ot-badge ${statusInfo.class}">${statusInfo.text}</span>
            </div>
        `;
    }).join('');
    
    // Update OT summary
    const otTodaySurgeries = document.getElementById('otTodaySurgeries');
    const otUpcoming = document.getElementById('otUpcoming');
    if (otTodaySurgeries) {
        const surgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
        const today = new Date().toISOString().split('T')[0];
        const todayCount = surgeries.filter(s => s.date && s.date.startsWith(today)).length;
        otTodaySurgeries.textContent = todayCount || '0';
    }
    if (otUpcoming) {
        const surgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
        const upcoming = surgeries.filter(s => s.status === 'Scheduled').length;
        otUpcoming.textContent = upcoming || '0';
    }
}

// Update Staff On Duty
function updateStaffOnDuty() {
    const container = document.getElementById('staffOnDutyList');
    if (!container) return;
    
    // Get staff from localStorage or use sample data
    const staff = JSON.parse(localStorage.getItem('staff') || '[]');
    
    const sampleStaff = staff.length > 0 ? staff.slice(0, 5) : [
        { name: 'Dr. Rajesh Kumar', role: 'Senior Cardiologist', status: 'on-duty', avatar: 'RK' },
        { name: 'Dr. Priya Sharma', role: 'Neurologist', status: 'on-duty', avatar: 'PS' },
        { name: 'Nurse Anita Verma', role: 'Head Nurse - ICU', status: 'on-duty', avatar: 'AV' },
        { name: 'Dr. Amit Singh', role: 'Orthopedic Surgeon', status: 'on-break', avatar: 'AS' },
        { name: 'Dr. Meera Patel', role: 'Pediatrician', status: 'on-duty', avatar: 'MP' }
    ];
    
    container.innerHTML = sampleStaff.map(s => {
        const initials = s.avatar || s.name.split(' ').map(n => n[0]).join('');
        const statusClass = (s.status || 'on-duty').replace(' ', '-').toLowerCase();
        const statusText = s.status === 'on-duty' ? 'On Duty' : s.status === 'on-break' ? 'On Break' : 'Off Duty';
        return `
            <div class="staff-item">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=0891b2&color=fff&size=42" 
                     alt="${s.name}" class="staff-avatar">
                <div class="staff-info">
                    <span class="staff-name">${s.name}</span>
                    <span class="staff-role">${s.role || s.department || 'Medical Staff'}</span>
                </div>
                <span class="staff-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
}

// Refresh Department Stats
function refreshDepartmentStats() {
    updateDashboardStats();
    if (typeof toast !== 'undefined') {
        toast.show('Department stats refreshed', 'success');
    }
}

// Export Dashboard Data
function exportDashboardData() {
    const data = {
        opdPatients: JSON.parse(localStorage.getItem('opdPatients') || '[]'),
        ipdPatients: JSON.parse(localStorage.getItem('ipdPatients') || '[]'),
        emergencyPatients: JSON.parse(localStorage.getItem('emergencyPatients') || '[]'),
        bills: JSON.parse(localStorage.getItem('bills') || '[]')
    };
    
    // Combine all data for export
    const allData = [
        ...data.opdPatients.map(p => ({...p, type: 'OPD'})),
        ...data.ipdPatients.map(p => ({...p, type: 'IPD'})),
        ...data.emergencyPatients.map(p => ({...p, type: 'Emergency'}))
    ];
    
    exportToCSV(allData, 'Hospital_Dashboard_Report');
    toast.show('Dashboard report exported successfully!', 'success');
}

// Print Report - Using Professional Print Utils
function printReport(type) {
    toast.show('Preparing report for print...', 'info');
    
    const section = document.getElementById(type) || document.querySelector('.content-section.active');
    if (section) {
        // Clone and clean the content
        const printContent = section.cloneNode(true);
        
        // Remove action buttons and interactive elements
        printContent.querySelectorAll('.action-btn, button, .actions-column, .dropdown, .toast-container').forEach(el => el.remove());
        
        // Get section title
        const titleEl = section.querySelector('h1, h2, .section-title');
        const sectionTitle = titleEl ? titleEl.textContent : type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
        
        // Use PrintUtils for professional output
        PrintUtils.printSection(sectionTitle, printContent.innerHTML);
        toast.show('Opening print preview...', 'success');
    } else {
        toast.show('Section not found for printing', 'error');
    }
}

// Export Analytics Report
function exportAnalyticsReport() {
    const analyticsData = {
        generatedAt: new Date().toISOString(),
        patientSatisfaction: 4.7,
        averageWaitTime: '24 min',
        bedTurnoverRate: 3.2,
        revenuePerPatient: '₹4,200',
        insuranceClaims: JSON.parse(localStorage.getItem('insuranceClaims') || '[]'),
        staffData: JSON.parse(localStorage.getItem('staff') || '[]'),
        inventory: JSON.parse(localStorage.getItem('inventory') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hospital_Analytics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.show('Analytics report exported!', 'success');
}

// Download Backup
function downloadBackup() {
    const allData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {
            opdPatients: JSON.parse(localStorage.getItem('opdPatients') || '[]'),
            ipdPatients: JSON.parse(localStorage.getItem('ipdPatients') || '[]'),
            emergencyPatients: JSON.parse(localStorage.getItem('emergencyPatients') || '[]'),
            insuranceClaims: JSON.parse(localStorage.getItem('insuranceClaims') || '[]'),
            staff: JSON.parse(localStorage.getItem('staff') || '[]'),
            inventory: JSON.parse(localStorage.getItem('inventory') || '[]'),
            bills: JSON.parse(localStorage.getItem('bills') || '[]'),
            prescriptions: JSON.parse(localStorage.getItem('prescriptions') || '[]')
        }
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HIS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.show('Backup downloaded successfully!', 'success');
}

// Run Backup Now
function runBackupNow() {
    toast.show('Creating backup...', 'info');
    
    // Simulate backup process
    setTimeout(() => {
        const now = new Date();
        const lastBackupEl = document.getElementById('lastBackupTime');
        if (lastBackupEl) {
            lastBackupEl.textContent = now.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Auto-download the backup
        downloadBackup();
        toast.show('Backup completed and downloaded!', 'success');
    }, 1500);
}

// Print Patient Details - Using Professional Print Utils
function printPatientDetails(patientId) {
    toast.show('Preparing patient report for print...', 'info');
    
    api.getPatients().then(response => {
        if (response.success) {
            const patient = response.data.find(p => (p._id === patientId || p.id === patientId));
            if (patient) {
                PrintUtils.printPatientSummary(patient);
                toast.show('Opening print preview...', 'success');
            } else {
                toast.show('Patient not found', 'error');
            }
        } else {
            toast.show('Error loading patient data', 'error');
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error preparing print', 'error');
    });
}

// ============================================
// COMPREHENSIVE ACTION FUNCTIONS FOR ALL MODULES
// ============================================

// VIEW PATIENT (OPD) - Full Details Modal
function viewPatient(patientId) {
    api.getPatients().then(response => {
        if (response.success) {
            const patient = response.data.find(p => (p._id === patientId || p.id === patientId));
            if (patient) {
                showModal('Patient Details', `
                    <div class="patient-details-view">
                        <div class="patient-header-section">
                            <div class="patient-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="patient-info-main">
                                <h2>${patient.name}</h2>
                                <div class="patient-meta">
                                    <div class="patient-meta-item"><i class="fas fa-id-card"></i> <strong>${patient.patientId || patient._id}</strong></div>
                                    <div class="patient-meta-item"><i class="fas fa-user"></i> ${patient.age} yrs / ${patient.gender}</div>
                                    <div class="patient-meta-item"><i class="fas fa-phone"></i> ${patient.contact || patient.phone || 'N/A'}</div>
                                </div>
                            </div>
                            <div class="patient-quick-actions">
                                <button class="quick-action-btn" onclick="editPatient('${patient._id || patient.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="quick-action-btn" onclick="printPatientDetails('${patient._id || patient.id}')" title="Print"><i class="fas fa-print"></i></button>
                            </div>
                        </div>
                        
                        <div class="details-grid">
                            <div class="details-section">
                                <div class="details-section-header">
                                    <i class="fas fa-user"></i>
                                    <h3>Personal Information</h3>
                                </div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Blood Group</span><span class="detail-value">${patient.bloodGroup || 'N/A'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${patient.email || 'N/A'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${patient.address || 'N/A'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Aadhar</span><span class="detail-value">${patient.aadharNumber || 'N/A'}</span></div>
                                </div>
                            </div>
                            
                            <div class="details-section">
                                <div class="details-section-header">
                                    <i class="fas fa-hospital"></i>
                                    <h3>Visit Details</h3>
                                </div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Department</span><span class="detail-value">${patient.department || 'N/A'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Doctor</span><span class="detail-value">${patient.doctor || 'N/A'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Visit Date</span><span class="detail-value">${new Date(patient.createdAt).toLocaleDateString()}</span></div>
                                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${patient.status.toLowerCase()}">${patient.status}</span></span></div>
                                </div>
                            </div>
                            
                            <div class="details-section full-width">
                                <div class="details-section-header">
                                    <i class="fas fa-notes-medical"></i>
                                    <h3>Medical Information</h3>
                                </div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Chief Complaint</span><span class="detail-value">${patient.complaint || patient.chiefComplaint || 'N/A'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Diagnosis</span><span class="detail-value">${patient.diagnosis || 'Pending'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Allergies</span><span class="detail-value">${patient.allergies || 'None known'}</span></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-actions">
                            <button class="btn-action secondary" onclick="viewPatientEMR('${patient._id || patient.id}')"><i class="fas fa-file-medical"></i> View EMR</button>
                            <button class="btn-action primary" onclick="startConsultation('${patient._id || patient.id}')"><i class="fas fa-stethoscope"></i> Start Consultation</button>
                        </div>
                    </div>
                `);
            } else {
                toast.show('Patient not found', 'error');
            }
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error loading patient details', 'error');
    });
}

// EDIT PATIENT - Edit Form Modal
function editPatient(patientId) {
    api.getPatients().then(response => {
        if (response.success) {
            const patient = response.data.find(p => (p._id === patientId || p.id === patientId));
            if (patient) {
                showModal('Edit Patient', `
                    <form id="editPatientForm" onsubmit="savePatientEdit(event, '${patient._id || patient.id}')">
                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-user"></i> Name</label>
                                <input type="text" name="name" value="${patient.name}" required>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-calendar"></i> Age</label>
                                <input type="number" name="age" value="${patient.age}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-venus-mars"></i> Gender</label>
                                <select name="gender">
                                    <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                                    <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                                    <option value="Other" ${patient.gender === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-phone"></i> Contact</label>
                                <input type="tel" name="contact" value="${patient.contact || patient.phone || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-tint"></i> Blood Group</label>
                                <select name="bloodGroup">
                                    <option value="">Select</option>
                                    ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => 
                                        `<option value="${bg}" ${patient.bloodGroup === bg ? 'selected' : ''}>${bg}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-user-md"></i> Doctor</label>
                                <input type="text" name="doctor" value="${patient.doctor || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-map-marker-alt"></i> Address</label>
                            <textarea name="address" rows="2">${patient.address || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-notes-medical"></i> Diagnosis</label>
                            <textarea name="diagnosis" rows="2">${patient.diagnosis || ''}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-info-circle"></i> Status</label>
                                <select name="status">
                                    <option value="Waiting" ${patient.status === 'Waiting' ? 'selected' : ''}>Waiting</option>
                                    <option value="Consulting" ${patient.status === 'Consulting' ? 'selected' : ''}>Consulting</option>
                                    <option value="Completed" ${patient.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Admitted" ${patient.status === 'Admitted' ? 'selected' : ''}>Admitted</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save Changes</button>
                        </div>
                    </form>
                `);
            }
        }
    });
}

// Save Patient Edit
async function savePatientEdit(e, patientId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Patient updated successfully', 'success');
        } else {
            toast.show('Error updating patient', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        toast.show('Error updating patient', 'error');
    }
}

// Start Consultation
function startConsultation(patientId) {
    api.getPatients().then(response => {
        if (response.success) {
            const patient = response.data.find(p => (p._id === patientId || p.id === patientId));
            if (patient) {
                showModal('Start Consultation - ' + patient.name, `
                    <form id="consultationForm" onsubmit="saveConsultation(event, '${patientId}')">
                        <div class="form-group">
                            <label><i class="fas fa-heartbeat"></i> Vitals</label>
                            <div class="vitals-grid">
                                <input type="text" name="bp" placeholder="BP (e.g., 120/80)">
                                <input type="text" name="pulse" placeholder="Pulse (bpm)">
                                <input type="text" name="temp" placeholder="Temp (°F)">
                                <input type="text" name="spo2" placeholder="SpO2 (%)">
                            </div>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-stethoscope"></i> Clinical Findings</label>
                            <textarea name="findings" rows="3" placeholder="Physical examination findings..."></textarea>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-diagnoses"></i> Diagnosis</label>
                            <textarea name="diagnosis" rows="2" placeholder="Provisional/Final diagnosis...">${patient.diagnosis || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-prescription"></i> Prescription</label>
                            <textarea name="prescription" rows="3" placeholder="Medications with dosage..."></textarea>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-clipboard-list"></i> Advice/Instructions</label>
                            <textarea name="advice" rows="2" placeholder="Patient instructions..."></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-calendar"></i> Follow-up Date</label>
                                <input type="date" name="followUp">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-tasks"></i> Action</label>
                                <select name="action">
                                    <option value="completed">Complete & Discharge</option>
                                    <option value="admit">Admit to IPD</option>
                                    <option value="refer">Refer to Specialist</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary"><i class="fas fa-check"></i> Complete Consultation</button>
                        </div>
                    </form>
                `);
                
                // Update status to Consulting
                fetch(`${API_URL}/patients/${patientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Consulting' })
                });
            }
        }
    });
}

// Save Consultation
async function saveConsultation(e, patientId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const updateData = {
        diagnosis: data.diagnosis,
        status: data.action === 'completed' ? 'Completed' : data.action === 'admit' ? 'Admitted' : 'Referred',
        vitals: {
            bp: data.bp,
            pulse: data.pulse,
            temp: data.temp,
            spo2: data.spo2
        },
        clinicalFindings: data.findings,
        prescription: data.prescription,
        advice: data.advice,
        followUpDate: data.followUp
    };
    
    try {
        const response = await fetch(`${API_URL}/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Consultation completed successfully', 'success');
            
            // If prescription was given, create prescription record
            if (data.prescription) {
                api.createPrescription({
                    patient: patientId,
                    patientName: 'Patient',
                    doctor: 'Dr. ' + (JSON.parse(localStorage.getItem('currentUser'))?.username || 'Doctor'),
                    medicines: [{ name: data.prescription, dosage: 'As prescribed', frequency: 'As advised', duration: '5 days' }],
                    status: 'Pending'
                });
            }
        }
    } catch (err) {
        console.error('Error:', err);
        toast.show('Error saving consultation', 'error');
    }
}

// DELETE PATIENT
async function deletePatient(patientId) {
    if (!confirm('Are you sure you want to delete this patient record? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`${API_URL}/patients/${patientId}`, { method: 'DELETE' });
        if (response.ok) {
            loadTableData();
            toast.show('Patient deleted successfully', 'success');
        } else {
            toast.show('Error deleting patient', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        toast.show('Error deleting patient', 'error');
    }
}

// VIEW SURGERY DETAILS
function viewSurgery(surgeryId) {
    api.getSurgeries().then(response => {
        if (response.success) {
            const surgery = response.data.find(s => s._id === surgeryId);
            if (surgery) {
                // Use correct field names from Surgery model
                const surgeryDate = surgery.surgeryDate || surgery.date;
                const surgeryTime = surgery.surgeryTime || surgery.time || 'N/A';
                const otRoom = surgery.otRoom || surgery.room || 'N/A';
                const duration = surgery.estimatedDuration || surgery.duration || 'N/A';
                const dateDisplay = surgeryDate ? new Date(surgeryDate).toLocaleDateString() : 'N/A';
                
                showModal('Surgery Details', `
                    <div class="patient-details-view">
                        <div class="details-grid">
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-procedures"></i><h3>Surgery Information</h3></div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Procedure</span><span class="detail-value">${surgery.procedure || 'N/A'}</span></div>
                                    <div class="detail-row"><span class="detail-label">Date/Time</span><span class="detail-value">${dateDisplay} ${surgeryTime}</span></div>
                                    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${duration}</span></div>
                                    <div class="detail-row"><span class="detail-label">OT Room</span><span class="detail-value">${otRoom}</span></div>
                                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${(surgery.status || 'scheduled').toLowerCase().replace(' ', '-')}">${surgery.status || 'Scheduled'}</span></span></div>
                                </div>
                            </div>
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-user-injured"></i><h3>Patient</h3></div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${surgery.patientName}</span></div>
                                    <div class="detail-row"><span class="detail-label">Surgeon</span><span class="detail-value">${surgery.surgeon}</span></div>
                                    <div class="detail-row"><span class="detail-label">Anesthesia</span><span class="detail-value">${surgery.anesthesiaType || 'General'}</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="detail-actions">
                            <button class="btn-action secondary" onclick="printSurgery('${surgery._id}')"><i class="fas fa-print"></i> Print</button>
                            <button class="btn-action secondary" onclick="closeModal()">Close</button>
                            <button class="btn-action primary" onclick="editSurgery('${surgery._id}')"><i class="fas fa-edit"></i> Edit</button>
                        </div>
                    </div>
                `);
            }
        }
    });
}

// PRINT SURGERY - Using Professional Print Utils
function printSurgery(surgeryId) {
    toast.show('Preparing surgery report for print...', 'info');
    api.getSurgeries().then(response => {
        if (response.success) {
            const surgery = response.data.find(s => s._id === surgeryId);
            if (surgery) {
                PrintUtils.printSurgeryReport(surgery);
                toast.show('Opening print preview...', 'success');
            } else {
                toast.show('Surgery record not found', 'error');
            }
        } else {
            toast.show('Error loading surgery data', 'error');
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error preparing print', 'error');
    });
}

// EDIT SURGERY
function editSurgery(surgeryId) {
    api.getSurgeries().then(response => {
        if (response.success) {
            const surgery = response.data.find(s => s._id === surgeryId);
            if (surgery) {
                // Use correct field names from Surgery model
                const surgeryDate = surgery.surgeryDate || surgery.date || '';
                const surgeryTime = surgery.surgeryTime || surgery.time || '';
                const otRoom = surgery.otRoom || surgery.room || '';
                const dateValue = surgeryDate ? surgeryDate.split('T')[0] : '';
                
                showModal('Edit Surgery', `
                    <form id="editSurgeryForm" onsubmit="saveSurgeryEdit(event, '${surgeryId}')">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Patient Name</label>
                                <input type="text" name="patientName" value="${surgery.patientName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Procedure</label>
                                <input type="text" name="procedure" value="${surgery.procedure || ''}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Surgeon</label>
                                <input type="text" name="surgeon" value="${surgery.surgeon || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>OT Room</label>
                                <input type="text" name="otRoom" value="${otRoom}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" name="surgeryDate" value="${dateValue}">
                            </div>
                            <div class="form-group">
                                <label>Time</label>
                                <input type="time" name="surgeryTime" value="${surgeryTime}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status">
                                <option value="Scheduled" ${surgery.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="In Progress" ${surgery.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed" ${surgery.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${surgery.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                        </div>
                    </form>
                `);
            }
        }
    });
}

// Save Surgery Edit
async function saveSurgeryEdit(e, surgeryId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/surgeries/${surgeryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            closeModal();
            loadTableData();
            loadOTRooms();
            toast.show('Surgery updated successfully', 'success');
        }
    } catch (err) {
        toast.show('Error updating surgery', 'error');
    }
}

// VIEW LAB TEST
function viewLabTest(testId) {
    api.getLabTests().then(response => {
        if (response.success) {
            const test = response.data.find(t => t._id === testId);
            if (test) {
                showModal('Lab Test Details', `
                    <div class="patient-details-view">
                        <div class="details-grid">
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-flask"></i><h3>Test Information</h3></div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Test Type</span><span class="detail-value">${test.testType}</span></div>
                                    <div class="detail-row"><span class="detail-label">Patient</span><span class="detail-value">${test.patientName}</span></div>
                                    <div class="detail-row"><span class="detail-label">Ordered By</span><span class="detail-value">${test.orderedBy}</span></div>
                                    <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value"><span class="status-badge ${test.priority.toLowerCase()}">${test.priority}</span></span></div>
                                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${test.status.toLowerCase().replace(' ', '-')}">${test.status}</span></span></div>
                                    <div class="detail-row"><span class="detail-label">Order Date</span><span class="detail-value">${new Date(test.createdAt).toLocaleString()}</span></div>
                                </div>
                            </div>
                            ${test.results ? `
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-clipboard-list"></i><h3>Results</h3></div>
                                <div class="details-content">
                                    <pre style="white-space: pre-wrap; color: var(--text-primary);">${test.results}</pre>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="detail-actions">
                            <button class="btn-action secondary" onclick="printLabReport('${testId}')"><i class="fas fa-print"></i> Print</button>
                            <button class="btn-action secondary" onclick="closeModal()">Close</button>
                            <button class="btn-action primary" onclick="updateLabStatus('${testId}')"><i class="fas fa-edit"></i> Update Status</button>
                        </div>
                    </div>
                `);
            }
        }
    });
}

// PRINT LAB REPORT - Using Professional Print Utils
function printLabReport(testId) {
    toast.show('Preparing lab report for print...', 'info');
    api.getLabTests().then(response => {
        if (response.success) {
            const test = response.data.find(t => t._id === testId);
            if (test) {
                // Map the test data to expected format
                const labData = {
                    ...test,
                    testName: test.testType,
                    doctor: test.orderedBy,
                    result: test.results
                };
                PrintUtils.printLabReport(labData);
                toast.show('Opening print preview...', 'success');
            } else {
                toast.show('Lab test not found', 'error');
            }
        } else {
            toast.show('Error loading lab data', 'error');
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error preparing print', 'error');
    });
}

// UPDATE LAB STATUS
function updateLabStatus(testId) {
    api.getLabTests().then(response => {
        if (response.success) {
            const test = response.data.find(t => t._id === testId);
            if (test) {
                showModal('Update Lab Test', `
                    <form id="updateLabForm" onsubmit="saveLabUpdate(event, '${testId}')">
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status" required>
                                <option value="Pending" ${test.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Sample Collected" ${test.status === 'Sample Collected' ? 'selected' : ''}>Sample Collected</option>
                                <option value="In Progress" ${test.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed" ${test.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Results</label>
                            <textarea name="results" rows="5" placeholder="Enter test results...">${test.results || ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                        </div>
                    </form>
                `);
            }
        }
    });
}

// Save Lab Update
async function saveLabUpdate(e, testId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/labs/${testId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Lab test updated successfully', 'success');
        }
    } catch (err) {
        toast.show('Error updating lab test', 'error');
    }
}

// VIEW IMAGING ORDER
function viewImaging(orderId) {
    api.getImagingOrders().then(response => {
        if (response.success) {
            const order = response.data.find(o => o._id === orderId);
            if (order) {
                showModal('Imaging Order Details', `
                    <div class="patient-details-view">
                        <div class="details-grid">
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-x-ray"></i><h3>Order Information</h3></div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Modality</span><span class="detail-value">${order.imagingType}</span></div>
                                    <div class="detail-row"><span class="detail-label">Body Part</span><span class="detail-value">${order.bodyPart}</span></div>
                                    <div class="detail-row"><span class="detail-label">Patient</span><span class="detail-value">${order.patientName}</span></div>
                                    <div class="detail-row"><span class="detail-label">Ordered By</span><span class="detail-value">${order.orderedBy}</span></div>
                                    <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value"><span class="status-badge ${order.priority?.toLowerCase() || 'routine'}">${order.priority || 'Routine'}</span></span></div>
                                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></span></div>
                                </div>
                            </div>
                            ${order.findings ? `
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-file-medical"></i><h3>Findings</h3></div>
                                <div class="details-content">
                                    <pre style="white-space: pre-wrap; color: var(--text-primary);">${order.findings}</pre>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="detail-actions">
                            <button class="btn-action secondary" onclick="printImaging('${orderId}')"><i class="fas fa-print"></i> Print</button>
                            <button class="btn-action secondary" onclick="closeModal()">Close</button>
                            <button class="btn-action primary" onclick="updateImagingStatus('${orderId}')"><i class="fas fa-edit"></i> Update</button>
                        </div>
                    </div>
                `);
            }
        }
    });
}

// PRINT IMAGING REPORT - Using Professional Print Utils
function printImaging(orderId) {
    toast.show('Preparing imaging report for print...', 'info');
    api.getImagingOrders().then(response => {
        if (response.success) {
            const order = response.data.find(o => o._id === orderId);
            if (order) {
                // Map the order data to expected format
                const imagingData = {
                    ...order,
                    type: order.imagingType,
                    modality: order.imagingType,
                    doctor: order.orderedBy,
                    referredBy: order.orderedBy
                };
                PrintUtils.printImagingReport(imagingData);
                toast.show('Opening print preview...', 'success');
            } else {
                toast.show('Imaging order not found', 'error');
            }
        } else {
            toast.show('Error loading imaging data', 'error');
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error preparing print', 'error');
    });
}

// UPDATE IMAGING STATUS
function updateImagingStatus(orderId) {
    api.getImagingOrders().then(response => {
        if (response.success) {
            const order = response.data.find(o => o._id === orderId);
            if (order) {
                showModal('Update Imaging Order', `
                    <form id="updateImagingForm" onsubmit="saveImagingUpdate(event, '${orderId}')">
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status" required>
                                <option value="Scheduled" ${order.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Findings/Report</label>
                            <textarea name="findings" rows="5" placeholder="Enter imaging findings...">${order.findings || ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                        </div>
                    </form>
                `);
            }
        }
    });
}

// Save Imaging Update
async function saveImagingUpdate(e, orderId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/imaging/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Imaging order updated successfully', 'success');
        }
    } catch (err) {
        toast.show('Error updating imaging order', 'error');
    }
}

// VIEW PRESCRIPTION
function viewPrescription(rxId) {
    api.getPrescriptions().then(response => {
        if (response.success) {
            const rx = response.data.find(r => r._id === rxId);
            if (rx) {
                const medicinesList = rx.medicines?.map(m => `
                    <div class="medicine-item">
                        <strong>${m.name}</strong>
                        <span>${m.dosage || ''} - ${m.frequency || ''} - ${m.duration || ''}</span>
                    </div>
                `).join('') || 'No medicines';
                
                showModal('Prescription Details', `
                    <div class="patient-details-view">
                        <div class="details-grid">
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-prescription"></i><h3>Prescription Info</h3></div>
                                <div class="details-content">
                                    <div class="detail-row"><span class="detail-label">Patient</span><span class="detail-value">${rx.patientName}</span></div>
                                    <div class="detail-row"><span class="detail-label">Doctor</span><span class="detail-value">${rx.doctor}</span></div>
                                    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${new Date(rx.createdAt).toLocaleString()}</span></div>
                                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${rx.status.toLowerCase()}">${rx.status}</span></span></div>
                                </div>
                            </div>
                            <div class="details-section">
                                <div class="details-section-header"><i class="fas fa-pills"></i><h3>Medicines</h3></div>
                                <div class="details-content medicine-list">
                                    ${medicinesList}
                                </div>
                            </div>
                        </div>
                        <div class="detail-actions">
                            <button class="btn-action secondary" onclick="printPrescription('${rxId}')"><i class="fas fa-print"></i> Print</button>
                            <button class="btn-action success" onclick="dispensePrescription('${rxId}')"><i class="fas fa-check"></i> Dispense</button>
                        </div>
                    </div>
                `);
            }
        }
    });
}

// DISPENSE PRESCRIPTION
async function dispensePrescription(rxId) {
    if (!confirm('Mark this prescription as dispensed?')) return;
    
    try {
        const response = await fetch(`${API_URL}/prescriptions/${rxId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Dispensed' })
        });
        if (response.ok) {
            closeModal();
            loadTableData();
            toast.show('Prescription dispensed successfully', 'success');
        }
    } catch (err) {
        toast.show('Error dispensing prescription', 'error');
    }
}

// PRINT PRESCRIPTION - Using Professional Print Utils
function printPrescription(rxId) {
    toast.show('Preparing prescription for print...', 'info');
    api.getPrescriptions().then(response => {
        if (response.success) {
            const rx = response.data.find(r => r._id === rxId);
            if (rx) {
                PrintUtils.printPrescription(rx);
                toast.show('Opening print preview...', 'success');
            } else {
                toast.show('Prescription not found', 'error');
            }
        } else {
            toast.show('Error loading prescription data', 'error');
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error preparing print', 'error');
    });
}

// VIEW BILL
function viewBill(billId) {
    api.getBills().then(response => {
        if (response.success) {
            const bill = response.data.find(b => b._id === billId);
            if (bill) {
                const itemsList = bill.items?.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.rate?.toFixed(2) || '0.00'}</td>
                        <td>₹${item.amount?.toFixed(2) || '0.00'}</td>
                    </tr>
                `).join('') || '<tr><td colspan="4">No items</td></tr>';
                
                showModal('Bill Details - ' + bill.billNumber, `
                    <div class="patient-details-view">
                        <div class="details-section full-width">
                            <div class="details-section-header"><i class="fas fa-file-invoice"></i><h3>Bill #${bill.billNumber}</h3></div>
                            <div class="detail-row"><span class="detail-label">Patient</span><span class="detail-value">${bill.patientName}</span></div>
                            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${new Date(bill.createdAt).toLocaleString()}</span></div>
                            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${bill.paymentStatus.toLowerCase()}">${bill.paymentStatus}</span></span></div>
                        </div>
                        <table class="bill-items-table" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--bg-tertiary);">
                                    <th style="padding: 10px; text-align: left;">Description</th>
                                    <th style="padding: 10px;">Qty</th>
                                    <th style="padding: 10px;">Rate</th>
                                    <th style="padding: 10px;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>${itemsList}</tbody>
                            <tfoot>
                                <tr><td colspan="3" style="text-align: right; padding: 10px;"><strong>Subtotal:</strong></td><td style="padding: 10px;">₹${bill.subtotal?.toFixed(2) || '0.00'}</td></tr>
                                <tr><td colspan="3" style="text-align: right; padding: 10px;"><strong>Tax:</strong></td><td style="padding: 10px;">₹${bill.tax?.toFixed(2) || '0.00'}</td></tr>
                                <tr><td colspan="3" style="text-align: right; padding: 10px;"><strong>Discount:</strong></td><td style="padding: 10px;">-₹${bill.discount?.toFixed(2) || '0.00'}</td></tr>
                                <tr style="background: var(--primary-color); color: white;"><td colspan="3" style="text-align: right; padding: 10px;"><strong>Total:</strong></td><td style="padding: 10px;"><strong>₹${bill.total?.toFixed(2) || '0.00'}</strong></td></tr>
                            </tfoot>
                        </table>
                        <div class="detail-actions">
                            <button class="btn-action secondary" onclick="printBill('${billId}')"><i class="fas fa-print"></i> Print</button>
                            ${bill.paymentStatus !== 'Paid' ? `<button class="btn-action success" onclick="payBill('${billId}')"><i class="fas fa-money-bill"></i> Process Payment</button>` : ''}
                        </div>
                    </div>
                `);
            }
        }
    });
}

// PAY BILL
function payBill(billId) {
    showModal('Process Payment', `
        <form id="paymentForm" onsubmit="processPayment(event, '${billId}')">
            <div class="form-group">
                <label>Payment Method</label>
                <select name="paymentMethod" required>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Cheque">Cheque</option>
                </select>
            </div>
            <div class="form-group">
                <label>Reference Number (if applicable)</label>
                <input type="text" name="reference" placeholder="Transaction/Cheque number">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-check"></i> Complete Payment</button>
            </div>
        </form>
    `);
}

// Process Payment
async function processPayment(e, billId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/bills/${billId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentStatus: 'Paid', paymentMethod: data.paymentMethod })
        });
        if (response.ok) {
            closeModal();
            loadTableData();
            updateDashboardStats();
            toast.show('Payment processed successfully', 'success');
        }
    } catch (err) {
        toast.show('Error processing payment', 'error');
    }
}

// PRINT BILL - Using Professional Print Utils
function printBill(billId) {
    toast.show('Preparing bill for print...', 'info');
    api.getBills().then(response => {
        if (response.success) {
            const bill = response.data.find(b => b._id === billId);
            if (bill) {
                PrintUtils.printBill(bill);
                toast.show('Opening print preview...', 'success');
            } else {
                toast.show('Bill not found', 'error');
            }
        } else {
            toast.show('Error loading bill data', 'error');
        }
    }).catch(err => {
        console.error('Error:', err);
        toast.show('Error preparing print', 'error');
    });
}

// REFRESH DATA
function refreshData() {
    toast.show('Refreshing data...', 'info');
    loadTableData();
    updateDashboardStats();
    loadOTRooms();
    updateAllSectionStats();
    setTimeout(() => toast.show('Data refreshed successfully', 'success'), 500);
}

// ============================================
// INSURANCE, HR & INVENTORY ACTIONS
// ============================================

// VIEW INSURANCE CLAIM
function viewInsuranceClaim(index) {
    const claims = JSON.parse(localStorage.getItem('insuranceClaims') || '[]');
    const claim = claims[index];
    if (claim) {
        showModal('Insurance Claim Details', `
            <div class="patient-details-view">
                <div class="details-grid">
                    <div class="details-section">
                        <div class="details-section-header"><i class="fas fa-file-medical-alt"></i><h3>Claim Information</h3></div>
                        <div class="details-content">
                            <div class="detail-row"><span class="detail-label">Claim ID</span><span class="detail-value">${claim.claimId}</span></div>
                            <div class="detail-row"><span class="detail-label">Patient</span><span class="detail-value">${claim.patient}</span></div>
                            <div class="detail-row"><span class="detail-label">Provider</span><span class="detail-value">${claim.provider}</span></div>
                            <div class="detail-row"><span class="detail-label">Policy No</span><span class="detail-value">${claim.policyNo}</span></div>
                            <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${claim.claimAmount}</span></div>
                            <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${claim.submissionDate}</span></div>
                            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${claim.status.toLowerCase().replace(' ', '-')}">${claim.status}</span></span></div>
                        </div>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="btn-action secondary" onclick="closeModal()">Close</button>
                    <button class="btn-action primary" onclick="editInsuranceClaim(${index})"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
        `);
    }
}

// EDIT INSURANCE CLAIM
function editInsuranceClaim(index) {
    const claims = JSON.parse(localStorage.getItem('insuranceClaims') || '[]');
    const claim = claims[index];
    if (claim) {
        showModal('Edit Insurance Claim', `
            <form id="editClaimForm" onsubmit="saveInsuranceClaim(event, ${index})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Patient</label>
                        <input type="text" name="patient" value="${claim.patient}" required>
                    </div>
                    <div class="form-group">
                        <label>Provider</label>
                        <input type="text" name="provider" value="${claim.provider}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Policy Number</label>
                        <input type="text" name="policyNo" value="${claim.policyNo}" required>
                    </div>
                    <div class="form-group">
                        <label>Claim Amount</label>
                        <input type="text" name="claimAmount" value="${claim.claimAmount}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" required>
                        <option value="Pending" ${claim.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Under Review" ${claim.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                        <option value="Approved" ${claim.status === 'Approved' ? 'selected' : ''}>Approved</option>
                        <option value="Rejected" ${claim.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        `);
    }
}

// Save Insurance Claim
function saveInsuranceClaim(e, index) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const claims = JSON.parse(localStorage.getItem('insuranceClaims') || '[]');
    
    claims[index] = {
        ...claims[index],
        patient: formData.get('patient'),
        provider: formData.get('provider'),
        policyNo: formData.get('policyNo'),
        claimAmount: formData.get('claimAmount'),
        status: formData.get('status')
    };
    
    localStorage.setItem('insuranceClaims', JSON.stringify(claims));
    closeModal();
    loadTableData();
    toast.show('Claim updated successfully', 'success');
}

// VIEW STAFF
function viewStaff(index) {
    const staff = JSON.parse(localStorage.getItem('staff') || '[]');
    const emp = staff[index];
    if (emp) {
        showModal('Staff Details', `
            <div class="patient-details-view">
                <div class="patient-header-section">
                    <div class="patient-avatar">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="patient-info-main">
                        <h2>${emp.name}</h2>
                        <div class="patient-meta">
                            <div class="patient-meta-item"><i class="fas fa-id-badge"></i> <strong>${emp.empId}</strong></div>
                            <div class="patient-meta-item"><i class="fas fa-building"></i> ${emp.dept}</div>
                            <div class="patient-meta-item"><i class="fas fa-briefcase"></i> ${emp.designation}</div>
                        </div>
                    </div>
                </div>
                <div class="details-grid">
                    <div class="details-section full-width">
                        <div class="details-section-header"><i class="fas fa-info-circle"></i><h3>Employment Details</h3></div>
                        <div class="details-content">
                            <div class="detail-row"><span class="detail-label">Contact</span><span class="detail-value">${emp.contact}</span></div>
                            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${emp.status.toLowerCase().replace(' ', '-')}">${emp.status}</span></span></div>
                        </div>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="btn-action secondary" onclick="closeModal()">Close</button>
                    <button class="btn-action primary" onclick="editStaff(${index})"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
        `);
    }
}

// EDIT STAFF
function editStaff(index) {
    const staff = JSON.parse(localStorage.getItem('staff') || '[]');
    const emp = staff[index];
    if (emp) {
        showModal('Edit Staff', `
            <form id="editStaffForm" onsubmit="saveStaff(event, ${index})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" name="name" value="${emp.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <select name="dept" required>
                            <option value="Cardiology" ${emp.dept === 'Cardiology' ? 'selected' : ''}>Cardiology</option>
                            <option value="Neurology" ${emp.dept === 'Neurology' ? 'selected' : ''}>Neurology</option>
                            <option value="Orthopedics" ${emp.dept === 'Orthopedics' ? 'selected' : ''}>Orthopedics</option>
                            <option value="ICU" ${emp.dept === 'ICU' ? 'selected' : ''}>ICU</option>
                            <option value="Admin" ${emp.dept === 'Admin' ? 'selected' : ''}>Admin</option>
                            <option value="Pharmacy" ${emp.dept === 'Pharmacy' ? 'selected' : ''}>Pharmacy</option>
                            <option value="Emergency" ${emp.dept === 'Emergency' ? 'selected' : ''}>Emergency</option>
                            <option value="Lab" ${emp.dept === 'Lab' ? 'selected' : ''}>Lab</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Designation</label>
                        <input type="text" name="designation" value="${emp.designation}" required>
                    </div>
                    <div class="form-group">
                        <label>Contact</label>
                        <input type="tel" name="contact" value="${emp.contact}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" required>
                        <option value="Active" ${emp.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="On Leave" ${emp.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
                        <option value="Inactive" ${emp.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        `);
    }
}

// Save Staff
function saveStaff(e, index) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const staff = JSON.parse(localStorage.getItem('staff') || '[]');
    
    staff[index] = {
        ...staff[index],
        name: formData.get('name'),
        dept: formData.get('dept'),
        designation: formData.get('designation'),
        contact: formData.get('contact'),
        status: formData.get('status')
    };
    
    localStorage.setItem('staff', JSON.stringify(staff));
    closeModal();
    loadTableData();
    toast.show('Staff updated successfully', 'success');
}

// VIEW INVENTORY ITEM
function viewInventoryItem(index) {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const item = inventory[index];
    if (item) {
        showModal('Inventory Item Details', `
            <div class="patient-details-view">
                <div class="details-grid">
                    <div class="details-section">
                        <div class="details-section-header"><i class="fas fa-box"></i><h3>Item Details</h3></div>
                        <div class="details-content">
                            <div class="detail-row"><span class="detail-label">Item Code</span><span class="detail-value">${item.itemCode}</span></div>
                            <div class="detail-row"><span class="detail-label">Item Name</span><span class="detail-value">${item.itemName}</span></div>
                            <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${item.category}</span></div>
                            <div class="detail-row"><span class="detail-label">Current Stock</span><span class="detail-value">${item.currentStock}</span></div>
                            <div class="detail-row"><span class="detail-label">Reorder Level</span><span class="detail-value">${item.reorderLevel}</span></div>
                            <div class="detail-row"><span class="detail-label">Last Updated</span><span class="detail-value">${item.lastUpdated}</span></div>
                            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span></span></div>
                        </div>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="btn-action secondary" onclick="closeModal()">Close</button>
                    <button class="btn-action primary" onclick="editInventoryItem(${index})"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
        `);
    }
}

// EDIT INVENTORY ITEM
function editInventoryItem(index) {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const item = inventory[index];
    if (item) {
        showModal('Edit Inventory Item', `
            <form id="editInventoryForm" onsubmit="saveInventoryItem(event, ${index})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Item Name</label>
                        <input type="text" name="itemName" value="${item.itemName}" required>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select name="category" required>
                            <option value="Medicines" ${item.category === 'Medicines' ? 'selected' : ''}>Medicines</option>
                            <option value="Equipment" ${item.category === 'Equipment' ? 'selected' : ''}>Equipment</option>
                            <option value="Consumables" ${item.category === 'Consumables' ? 'selected' : ''}>Consumables</option>
                            <option value="Linens" ${item.category === 'Linens' ? 'selected' : ''}>Linens</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Current Stock</label>
                        <input type="number" name="currentStock" value="${item.currentStock}" required min="0">
                    </div>
                    <div class="form-group">
                        <label>Reorder Level</label>
                        <input type="number" name="reorderLevel" value="${item.reorderLevel}" required min="0">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        `);
    }
}

// Save Inventory Item
function saveInventoryItem(e, index) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    
    const currentStock = parseInt(formData.get('currentStock'));
    const reorderLevel = parseInt(formData.get('reorderLevel'));
    
    let status = 'In Stock';
    if (currentStock === 0) status = 'Out of Stock';
    else if (currentStock <= reorderLevel) status = 'Low Stock';
    
    inventory[index] = {
        ...inventory[index],
        itemName: formData.get('itemName'),
        category: formData.get('category'),
        currentStock: currentStock,
        reorderLevel: reorderLevel,
        lastUpdated: new Date().toLocaleDateString(),
        status: status
    };
    
    localStorage.setItem('inventory', JSON.stringify(inventory));
    closeModal();
    loadTableData();
    updateAllSectionStats();
    toast.show('Inventory updated successfully', 'success');
}

// ============================================
// DYNAMIC STATS UPDATE FUNCTIONS
// ============================================

// Update All Section Stats
function updateAllSectionStats() {
    updateIPDStats();
    updateEmergencyStats();
    updateLabStats();
    updateRadiologyStats();
    updatePharmacyStats();
    updateBillingStats();
    updateInsuranceStats();
    updateHRStats();
    updateInventoryStats();
    updateAnalyticsKPIs();
}

// Update Analytics KPIs
function updateAnalyticsKPIs() {
    // Calculate dynamic KPIs based on actual data
    const patients = JSON.parse(localStorage.getItem('opdPatients') || '[]');
    const bills = JSON.parse(localStorage.getItem('bills') || '[]');
    const ipdPatients = JSON.parse(localStorage.getItem('ipdPatients') || '[]');
    
    // Patient satisfaction (simulated based on completed visits)
    const completedVisits = patients.filter(p => p.status === 'Completed').length;
    const satisfaction = completedVisits > 0 ? (4.5 + Math.random() * 0.4).toFixed(1) : '4.7';
    updateElementText('patientSatisfaction', `${satisfaction}/5`);
    
    // Average wait time (simulated)
    const avgWait = Math.floor(15 + Math.random() * 10);
    updateElementText('avgWaitTime', `${avgWait} min`);
    
    // Bed turnover rate
    const dischargedCount = ipdPatients.filter(p => p.status === 'Discharged').length;
    const turnover = dischargedCount > 0 ? (2 + Math.random()).toFixed(1) : '2.3';
    updateElementText('bedTurnoverRate', `${turnover} days`);
    
    // Revenue per patient
    const totalRevenue = bills.reduce((sum, b) => {
        const amount = parseFloat(String(b.total || b.amount || '0').replace(/[₹,]/g, '')) || 0;
        return sum + amount;
    }, 0);
    const patientCount = patients.length || 1;
    const revenuePerPatient = Math.round(totalRevenue / patientCount) || 6825;
    updateElementText('revenuePerPatient', `₹${revenuePerPatient.toLocaleString('en-IN')}`);
}

// IPD Stats
function updateIPDStats() {
    const ipdData = JSON.parse(localStorage.getItem('ipdPatients') || '[]');
    const occupied = ipdData.filter(p => p.status === 'Admitted' || p.status === 'Critical').length;
    const available = 120 - occupied; // Assuming 120 total beds
    const newAdmissions = ipdData.filter(p => {
        const admitDate = new Date(p.admitDate);
        const today = new Date();
        return admitDate.toDateString() === today.toDateString();
    }).length;
    const discharges = ipdData.filter(p => p.status === 'Discharged').length;
    
    updateElementText('occupiedBedsCount', occupied || 45);
    updateElementText('availableBedsCount', available > 0 ? available : 75);
    updateElementText('newAdmissionsCount', newAdmissions || 12);
    updateElementText('dischargesTodayCount', discharges || 8);
}

// Emergency Stats
function updateEmergencyStats() {
    const emergencyData = JSON.parse(localStorage.getItem('emergencyPatients') || '[]');
    const critical = emergencyData.filter(p => p.severity === 'Critical').length;
    const urgent = emergencyData.filter(p => p.severity === 'Urgent' || p.severity === 'High').length;
    const stable = emergencyData.filter(p => p.severity === 'Stable' || p.severity === 'Low' || p.severity === 'Medium').length;
    
    updateElementText('criticalCount', critical || 3);
    updateElementText('urgentCount', urgent || 8);
    updateElementText('stableCount', stable || 15);
}

// Lab Stats
function updateLabStats() {
    // Count from actual lab data
    const labTableBody = document.getElementById('labTableBody');
    let pending = 0, inProgress = 0, completed = 0;
    
    if (labTableBody) {
        const rows = labTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const statusCell = row.querySelector('.status-badge');
            if (statusCell) {
                const status = statusCell.textContent.toLowerCase();
                if (status.includes('pending')) pending++;
                else if (status.includes('progress') || status.includes('processing')) inProgress++;
                else if (status.includes('completed') || status.includes('done')) completed++;
            }
        });
    }
    
    updateElementText('pendingTestsCount', pending || 23);
    updateElementText('inProgressTestsCount', inProgress || 15);
    updateElementText('completedTestsCount', completed || 89);
}

// Radiology Stats
function updateRadiologyStats() {
    const radiologyTableBody = document.getElementById('radiologyTableBody');
    let xray = 0, ct = 0, mri = 0, ultrasound = 0;
    
    if (radiologyTableBody) {
        const rows = radiologyTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 2) {
                const modality = cells[2].textContent.toLowerCase();
                if (modality.includes('x-ray') || modality.includes('xray')) xray++;
                else if (modality.includes('ct')) ct++;
                else if (modality.includes('mri')) mri++;
                else if (modality.includes('ultrasound') || modality.includes('usg')) ultrasound++;
            }
        });
    }
    
    updateElementText('xrayCount', xray || 12);
    updateElementText('ctCount', ct || 8);
    updateElementText('mriCount', mri || 5);
    updateElementText('ultrasoundCount', ultrasound || 15);
}

// Pharmacy Stats
function updatePharmacyStats() {
    const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    
    const pending = prescriptions.filter(p => p.status === 'Pending' || p.status === 'Processing').length;
    const medicines = inventory.filter(i => i.category === 'Medicines');
    const inStock = medicines.length;
    const lowStock = medicines.filter(m => m.status === 'Low Stock' || m.currentStock <= m.reorderLevel).length;
    
    updateElementText('pendingRxCount', pending || 67);
    updateElementText('medicinesInStock', inStock > 0 ? formatNumber(inStock * 100) : '1,245');
    updateElementText('lowStockAlerts', lowStock || 15);
}

// Billing Stats
function updateBillingStats() {
    const bills = JSON.parse(localStorage.getItem('bills') || '[]');
    
    const todaysBills = bills.filter(b => {
        const billDate = new Date(b.date);
        const today = new Date();
        return billDate.toDateString() === today.toDateString();
    });
    
    const todayRevenue = todaysBills.reduce((sum, b) => {
        const amount = parseFloat(b.amount.replace(/[₹,]/g, '')) || 0;
        return b.status === 'Paid' ? sum + amount : sum;
    }, 0);
    
    const pendingPayments = bills.filter(b => b.status === 'Pending' || b.status === 'Partial')
        .reduce((sum, b) => sum + (parseFloat(b.amount.replace(/[₹,]/g, '')) || 0), 0);
    
    updateElementText('todayRevenueCount', formatCurrency(todayRevenue) || '₹8.5L');
    updateElementText('billsGeneratedCount', todaysBills.length || 156);
    updateElementText('pendingPaymentsCount', formatCurrency(pendingPayments) || '₹2.3L');
    updateElementText('monthlyRevenueCount', formatCurrency(todayRevenue * 30) || '₹45.2L');
}

// Insurance Stats
function updateInsuranceStats() {
    const claims = JSON.parse(localStorage.getItem('insuranceClaims') || '[]');
    
    const pending = claims.filter(c => c.status === 'Pending' || c.status === 'Under Review').length;
    const approved = claims.filter(c => c.status === 'Approved').length;
    const rejected = claims.filter(c => c.status === 'Rejected').length;
    const totalClaimed = claims.reduce((sum, c) => {
        const amount = parseFloat(c.claimAmount.replace(/[₹,]/g, '')) || 0;
        return sum + amount;
    }, 0);
    
    updateElementText('pendingClaimsCount', pending || 45);
    updateElementText('approvedClaimsCount', approved || 89);
    updateElementText('rejectedClaimsCount', rejected || 7);
    updateElementText('claimedAmountCount', formatCurrency(totalClaimed) || '₹12.5L');
}

// HR Stats
function updateHRStats() {
    const staff = JSON.parse(localStorage.getItem('staffData') || '[]');
    
    const doctors = staff.filter(s => s.designation.toLowerCase().includes('doctor') || s.department === 'Medical').length;
    const nurses = staff.filter(s => s.designation.toLowerCase().includes('nurse')).length;
    const support = staff.filter(s => !s.designation.toLowerCase().includes('doctor') && !s.designation.toLowerCase().includes('nurse')).length;
    const present = staff.filter(s => s.status === 'Active' || s.status === 'On Duty').length;
    
    updateElementText('doctorsCount', doctors || 85);
    updateElementText('nursesCount', nurses || 210);
    updateElementText('supportStaffCount', support || 145);
    updateElementText('presentTodayCount', present || 395);
    
    // Initialize attendance management
    initAttendanceManagement();
}

// ============================================
// AUTOMATED ATTENDANCE MANAGEMENT SYSTEM
// ============================================

let attendanceData = [];
let attendanceChart = null;
let attendanceIntervalId = null;

// Initialize Attendance Management
function initAttendanceManagement() {
    generateAttendanceData();
    updateAttendanceStats();
    populateAttendanceTimeline();
    populateAttendanceGrid();
    initAttendanceChart();
    
    // Start live updates every 30 seconds
    if (attendanceIntervalId) clearInterval(attendanceIntervalId);
    attendanceIntervalId = setInterval(() => {
        simulateLiveCheckIn();
        updateAttendanceStats();
    }, 30000);
}

// Generate mock attendance data for all staff
function generateAttendanceData() {
    const departments = ['doctors', 'nurses', 'admin', 'support'];
    const shifts = ['Morning (6AM-2PM)', 'Afternoon (2PM-10PM)', 'Night (10PM-6AM)'];
    
    const staffNames = [
        { name: 'Dr. Rajesh Kumar', dept: 'doctors', designation: 'Senior Cardiologist', avatar: 'RK' },
        { name: 'Dr. Priya Sharma', dept: 'doctors', designation: 'Neurologist', avatar: 'PS' },
        { name: 'Dr. Amit Patel', dept: 'doctors', designation: 'Orthopedic Surgeon', avatar: 'AP' },
        { name: 'Dr. Sunita Reddy', dept: 'doctors', designation: 'Pediatrician', avatar: 'SR' },
        { name: 'Dr. Vikram Singh', dept: 'doctors', designation: 'General Surgeon', avatar: 'VS' },
        { name: 'Dr. Meera Iyer', dept: 'doctors', designation: 'Gynecologist', avatar: 'MI' },
        { name: 'Dr. Arjun Nair', dept: 'doctors', designation: 'Anesthesiologist', avatar: 'AN' },
        { name: 'Dr. Kavitha Menon', dept: 'doctors', designation: 'Radiologist', avatar: 'KM' },
        { name: 'Nurse Anjali Verma', dept: 'nurses', designation: 'Head Nurse - ICU', avatar: 'AV' },
        { name: 'Nurse Deepa Gupta', dept: 'nurses', designation: 'Staff Nurse - OT', avatar: 'DG' },
        { name: 'Nurse Pooja Yadav', dept: 'nurses', designation: 'Ward Nurse', avatar: 'PY' },
        { name: 'Nurse Rekha Joshi', dept: 'nurses', designation: 'Night Supervisor', avatar: 'RJ' },
        { name: 'Nurse Swati Pillai', dept: 'nurses', designation: 'Emergency Nurse', avatar: 'SP' },
        { name: 'Nurse Lakshmi Das', dept: 'nurses', designation: 'Pediatric Nurse', avatar: 'LD' },
        { name: 'Nurse Seema Rao', dept: 'nurses', designation: 'OPD Nurse', avatar: 'SR' },
        { name: 'Nurse Radha Krishna', dept: 'nurses', designation: 'ICU Nurse', avatar: 'RK' },
        { name: 'Ravi Shankar', dept: 'admin', designation: 'Admin Manager', avatar: 'RS' },
        { name: 'Neha Kapoor', dept: 'admin', designation: 'HR Coordinator', avatar: 'NK' },
        { name: 'Suresh Babu', dept: 'admin', designation: 'Accounts Officer', avatar: 'SB' },
        { name: 'Divya Nath', dept: 'admin', designation: 'Reception Head', avatar: 'DN' },
        { name: 'Mohan Lal', dept: 'support', designation: 'Maintenance Head', avatar: 'ML' },
        { name: 'Gopi Ram', dept: 'support', designation: 'Security Chief', avatar: 'GR' },
        { name: 'Sanjay Kumar', dept: 'support', designation: 'Lab Technician', avatar: 'SK' },
        { name: 'Prakash Jena', dept: 'support', designation: 'Pharmacist', avatar: 'PJ' },
        { name: 'Dr. Nandini Roy', dept: 'doctors', designation: 'Emergency Medicine', avatar: 'NR' },
        { name: 'Nurse Preethi Nair', dept: 'nurses', designation: 'Cardiac Care Nurse', avatar: 'PN' },
        { name: 'Arun Kumar', dept: 'support', designation: 'IT Support', avatar: 'AK' },
        { name: 'Vijay Rajan', dept: 'admin', designation: 'Billing Manager', avatar: 'VR' }
    ];
    
    const statuses = ['present', 'present', 'present', 'present', 'present', 'present', 'absent', 'late', 'leave'];
    const now = new Date();
    
    attendanceData = staffNames.map((staff, index) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const checkInTime = new Date(now);
        checkInTime.setHours(Math.floor(Math.random() * 4) + 6, Math.floor(Math.random() * 60), 0);
        
        let checkOutTime = null;
        if (status === 'present' && Math.random() > 0.5) {
            checkOutTime = new Date(now);
            checkOutTime.setHours(checkInTime.getHours() + 8, Math.floor(Math.random() * 60), 0);
        }
        
        return {
            id: `EMP${String(index + 1001).padStart(4, '0')}`,
            name: staff.name,
            department: staff.dept,
            designation: staff.designation,
            avatar: staff.avatar,
            shift: shifts[Math.floor(Math.random() * shifts.length)],
            status: status,
            checkIn: status !== 'absent' && status !== 'leave' ? checkInTime : null,
            checkOut: checkOutTime,
            workHours: status === 'present' ? (Math.random() * 4 + 6).toFixed(1) : 0,
            isLate: status === 'late',
            leaveType: status === 'leave' ? ['Sick Leave', 'Casual Leave', 'Annual Leave'][Math.floor(Math.random() * 3)] : null,
            biometricId: `BIO-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            lastLocation: ['Main Entrance', 'Staff Gate', 'Emergency Entrance', 'Parking Gate'][Math.floor(Math.random() * 4)]
        };
    });
    
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
}

// Update live attendance stats
function updateAttendanceStats() {
    const total = attendanceData.length;
    const present = attendanceData.filter(a => a.status === 'present').length;
    const absent = attendanceData.filter(a => a.status === 'absent').length;
    const late = attendanceData.filter(a => a.status === 'late').length;
    const onLeave = attendanceData.filter(a => a.status === 'leave').length;
    
    // Update values
    updateElementText('livePresent', present);
    updateElementText('liveAbsent', absent);
    updateElementText('liveLate', late);
    updateElementText('liveOnLeave', onLeave);
    
    // Update percentages
    updateElementText('livePresentPercent', Math.round((present / total) * 100) + '%');
    updateElementText('liveAbsentPercent', Math.round((absent / total) * 100) + '%');
    updateElementText('liveLatePercent', Math.round((late / total) * 100) + '%');
    updateElementText('liveLeavePercent', Math.round((onLeave / total) * 100) + '%');
    
    // Update HR section stats
    updateElementText('hrPresentToday', present + late);
    updateElementText('presentTodayCount', present + late);
}

// Populate attendance timeline with live feed
function populateAttendanceTimeline() {
    const timeline = document.getElementById('attendanceTimeline');
    if (!timeline) return;
    
    // Generate timeline events
    const events = [];
    const now = new Date();
    
    attendanceData.forEach(emp => {
        if (emp.checkIn) {
            events.push({
                type: 'check-in',
                employee: emp.name,
                designation: emp.designation,
                avatar: emp.avatar,
                time: emp.checkIn,
                location: emp.lastLocation,
                isLate: emp.isLate
            });
        }
        if (emp.checkOut) {
            events.push({
                type: 'check-out',
                employee: emp.name,
                designation: emp.designation,
                avatar: emp.avatar,
                time: emp.checkOut,
                location: emp.lastLocation,
                workHours: emp.workHours
            });
        }
    });
    
    // Sort by time descending (most recent first)
    events.sort((a, b) => b.time - a.time);
    
    // Take only last 10 events
    const recentEvents = events.slice(0, 10);
    
    timeline.innerHTML = recentEvents.map(event => {
        const timeStr = event.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const isCheckIn = event.type === 'check-in';
        
        return `
            <div class="timeline-item ${isCheckIn ? 'check-in' : 'check-out'} ${event.isLate ? 'late' : ''}">
                <div class="timeline-icon">
                    <i class="fas ${isCheckIn ? 'fa-sign-in-alt' : 'fa-sign-out-alt'}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-avatar">${event.avatar}</div>
                    <div class="timeline-info">
                        <div class="timeline-name">${event.employee}</div>
                        <div class="timeline-designation">${event.designation}</div>
                        <div class="timeline-meta">
                            <span><i class="fas fa-clock"></i> ${timeStr}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                            ${event.isLate ? '<span class="late-badge"><i class="fas fa-exclamation-triangle"></i> Late</span>' : ''}
                            ${event.workHours ? `<span><i class="fas fa-hourglass-end"></i> ${event.workHours}h worked</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="timeline-time">${timeStr}</div>
            </div>
        `;
    }).join('');
}

// Populate attendance grid
function populateAttendanceGrid(filterDept = 'all', searchQuery = '') {
    const grid = document.getElementById('attendanceGrid');
    if (!grid) return;
    
    let filteredData = [...attendanceData];
    
    // Apply department filter
    if (filterDept !== 'all') {
        filteredData = filteredData.filter(emp => emp.department === filterDept);
    }
    
    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = filteredData.filter(emp => 
            emp.name.toLowerCase().includes(query) ||
            emp.id.toLowerCase().includes(query) ||
            emp.designation.toLowerCase().includes(query)
        );
    }
    
    grid.innerHTML = filteredData.map(emp => {
        const statusClass = emp.status;
        const statusIcon = {
            'present': 'fa-check-circle',
            'absent': 'fa-times-circle',
            'late': 'fa-clock',
            'leave': 'fa-calendar-minus'
        }[emp.status];
        
        const statusText = {
            'present': 'Present',
            'absent': 'Absent',
            'late': 'Late Arrival',
            'leave': emp.leaveType || 'On Leave'
        }[emp.status];
        
        const checkInStr = emp.checkIn ? emp.checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const checkOutStr = emp.checkOut ? emp.checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        
        return `
            <div class="attendance-card ${statusClass}" onclick="showEmployeeAttendanceDetail('${emp.id}')">
                <div class="attendance-card-header">
                    <div class="employee-avatar">${emp.avatar}</div>
                    <div class="status-indicator ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                </div>
                <div class="attendance-card-body">
                    <h4 class="employee-name">${emp.name}</h4>
                    <p class="employee-designation">${emp.designation}</p>
                    <p class="employee-id">${emp.id}</p>
                </div>
                <div class="attendance-card-footer">
                    <div class="time-info">
                        <div class="time-block">
                            <span class="time-label">In</span>
                            <span class="time-value ${emp.isLate ? 'late' : ''}">${checkInStr}</span>
                        </div>
                        <div class="time-block">
                            <span class="time-label">Out</span>
                            <span class="time-value">${checkOutStr}</span>
                        </div>
                    </div>
                    <div class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i> ${statusText}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize attendance chart
function initAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    // Destroy existing chart properly
    if (attendanceChart) {
        attendanceChart.destroy();
        attendanceChart = null;
    }
    
    // Reset canvas dimensions to prevent growth
    ctx.style.height = '280px';
    ctx.style.width = '100%';
    ctx.height = 280;
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const presentData = days.map(() => Math.floor(Math.random() * 20) + 70);
    const absentData = days.map(() => Math.floor(Math.random() * 10) + 5);
    const lateData = days.map(() => Math.floor(Math.random() * 8) + 2);
    
    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Present',
                    data: presentData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6,
                    barThickness: 24
                },
                {
                    label: 'Absent',
                    data: absentData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 6,
                    barThickness: 24
                },
                {
                    label: 'Late',
                    data: lateData,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderRadius: 6,
                    barThickness: 24
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            animation: { duration: 500 },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { 
                        color: '#94a3b8', 
                        font: { size: 11, weight: '500' },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(148, 163, 184, 0.08)' },
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    beginAtZero: true
                }
            }
        }
    });
}

// Search attendance
function searchAttendance(query) {
    populateAttendanceGrid(document.getElementById('attendanceDeptFilter')?.value || 'all', query);
}

// Filter attendance by department
function filterAttendanceByDept(dept) {
    populateAttendanceGrid(dept, document.getElementById('attendanceSearch')?.value || '');
}

// Change attendance view (today/week/month)
function changeAttendanceView(view) {
    // Update chart based on view
    if (!attendanceChart) return;
    
    let labels, data;
    
    switch(view) {
        case 'week':
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            break;
        case 'month':
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            break;
        default: // today
            labels = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM'];
    }
    
    attendanceChart.data.labels = labels;
    attendanceChart.data.datasets[0].data = labels.map(() => Math.floor(Math.random() * 20) + 70);
    attendanceChart.data.datasets[1].data = labels.map(() => Math.floor(Math.random() * 10) + 5);
    attendanceChart.data.datasets[2].data = labels.map(() => Math.floor(Math.random() * 8) + 2);
    attendanceChart.update();
    
    toast.show(`Showing ${view === 'today' ? "today's" : view === 'week' ? 'weekly' : 'monthly'} attendance`, 'info');
}

// Export attendance report
function exportAttendanceReport() {
    const view = document.getElementById('attendanceViewType')?.value || 'today';
    const dept = document.getElementById('attendanceDeptFilter')?.value || 'all';
    
    let exportData = [...attendanceData];
    if (dept !== 'all') {
        exportData = exportData.filter(emp => emp.department === dept);
    }
    
    // Create CSV content
    const headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Status', 'Check In', 'Check Out', 'Work Hours', 'Biometric ID'];
    const csvContent = [
        headers.join(','),
        ...exportData.map(emp => [
            emp.id,
            `"${emp.name}"`,
            emp.department,
            `"${emp.designation}"`,
            emp.status,
            emp.checkIn ? emp.checkIn.toLocaleTimeString('en-IN') : 'N/A',
            emp.checkOut ? emp.checkOut.toLocaleTimeString('en-IN') : 'N/A',
            emp.workHours || 0,
            emp.biometricId
        ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.show('Attendance report downloaded successfully!', 'success');
}

// Show employee attendance detail modal
function showEmployeeAttendanceDetail(empId) {
    const emp = attendanceData.find(e => e.id === empId);
    if (!emp) return;
    
    const statusInfo = {
        'present': { color: '#10b981', icon: 'fa-check-circle', text: 'Present' },
        'absent': { color: '#ef4444', icon: 'fa-times-circle', text: 'Absent' },
        'late': { color: '#f59e0b', icon: 'fa-clock', text: 'Late Arrival' },
        'leave': { color: '#8b5cf6', icon: 'fa-calendar-minus', text: emp.leaveType || 'On Leave' }
    }[emp.status];
    
    // Generate 7-day history
    const history = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const status = ['present', 'present', 'present', 'late', 'present', 'absent'][Math.floor(Math.random() * 6)];
        history.push({
            date: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
            status: status
        });
    }
    
    const modalContent = `
        <div class="employee-detail-modal">
            <div class="emp-detail-header" style="background: linear-gradient(135deg, ${statusInfo.color}22, ${statusInfo.color}11);">
                <div class="emp-detail-avatar">${emp.avatar}</div>
                <div class="emp-detail-info">
                    <h2>${emp.name}</h2>
                    <p>${emp.designation}</p>
                    <span class="emp-id-badge">${emp.id}</span>
                </div>
                <div class="emp-status-badge" style="background: ${statusInfo.color};">
                    <i class="fas ${statusInfo.icon}"></i> ${statusInfo.text}
                </div>
            </div>
            <div class="emp-detail-body">
                <div class="emp-detail-grid">
                    <div class="emp-detail-item">
                        <i class="fas fa-building"></i>
                        <span>Department</span>
                        <strong>${emp.department.charAt(0).toUpperCase() + emp.department.slice(1)}</strong>
                    </div>
                    <div class="emp-detail-item">
                        <i class="fas fa-clock"></i>
                        <span>Shift</span>
                        <strong>${emp.shift}</strong>
                    </div>
                    <div class="emp-detail-item">
                        <i class="fas fa-sign-in-alt"></i>
                        <span>Check In</span>
                        <strong>${emp.checkIn ? emp.checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</strong>
                    </div>
                    <div class="emp-detail-item">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Check Out</span>
                        <strong>${emp.checkOut ? emp.checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</strong>
                    </div>
                    <div class="emp-detail-item">
                        <i class="fas fa-hourglass-half"></i>
                        <span>Work Hours</span>
                        <strong>${emp.workHours}h</strong>
                    </div>
                    <div class="emp-detail-item">
                        <i class="fas fa-fingerprint"></i>
                        <span>Biometric ID</span>
                        <strong>${emp.biometricId}</strong>
                    </div>
                    <div class="emp-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Last Location</span>
                        <strong>${emp.lastLocation}</strong>
                    </div>
                </div>
                <div class="emp-history-section">
                    <h4><i class="fas fa-history"></i> 7-Day Attendance History</h4>
                    <div class="emp-history-grid">
                        ${history.map(h => `
                            <div class="history-day ${h.status}">
                                <span class="history-date">${h.date}</span>
                                <i class="fas ${h.status === 'present' ? 'fa-check' : h.status === 'late' ? 'fa-clock' : 'fa-times'}"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Helper to close/remove the modal
    function closeEmployeeAttendanceModal() {
        const existing = document.getElementById('employeeAttendanceModal');
        if (existing) existing.remove();
    }

    // Expose globally so inline onclick in markup can call it
    window.closeEmployeeAttendanceModal = closeEmployeeAttendanceModal;

    // Create and show modal
    let modal = document.getElementById('employeeAttendanceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'employeeAttendanceModal';
        // Use the existing '.modal' CSS class so the overlay uses the correct fixed positioning
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        document.body.appendChild(modal);

        // One-time Escape key handler to close this modal
        if (!document._employeeModalEscapeBound) {
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const m = document.getElementById('employeeAttendanceModal');
                    if (m && m.classList.contains('active')) m.classList.remove('active');
                }
            });
            document._employeeModalEscapeBound = true;
        }
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3><i class="fas fa-user-clock"></i> Employee Attendance Details</h3>
                <button class="close-btn" onclick="window.closeEmployeeAttendanceModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0;">
                ${modalContent}
            </div>
        </div>
    `;
    
    // Ensure modal is visible (some CSS files show .modal regardless), so we keep it present
    modal.classList.add('active');
}

// Simulate live check-in/check-out
function simulateLiveCheckIn() {
    // Randomly update one employee's status
    const randomIndex = Math.floor(Math.random() * attendanceData.length);
    const emp = attendanceData[randomIndex];
    
    if (emp.status === 'absent') {
        // Check in
        emp.status = Math.random() > 0.3 ? 'present' : 'late';
        emp.checkIn = new Date();
        emp.isLate = emp.status === 'late';
        
        // Update timeline with new check-in
        const timeline = document.getElementById('attendanceTimeline');
        if (timeline) {
            const newItem = document.createElement('div');
            newItem.className = `timeline-item check-in ${emp.isLate ? 'late' : ''} new-entry`;
            newItem.innerHTML = `
                <div class="timeline-icon">
                    <i class="fas fa-sign-in-alt"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-avatar">${emp.avatar}</div>
                    <div class="timeline-info">
                        <div class="timeline-name">${emp.name}</div>
                        <div class="timeline-designation">${emp.designation}</div>
                        <div class="timeline-meta">
                            <span><i class="fas fa-clock"></i> Just now</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${emp.lastLocation}</span>
                            ${emp.isLate ? '<span class="late-badge"><i class="fas fa-exclamation-triangle"></i> Late</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="timeline-time">Now</div>
            `;
            timeline.insertBefore(newItem, timeline.firstChild);
            
            // Remove last item if more than 10
            if (timeline.children.length > 10) {
                timeline.removeChild(timeline.lastChild);
            }
        }
    }
    
    // Update the grid
    populateAttendanceGrid(
        document.getElementById('attendanceDeptFilter')?.value || 'all',
        document.getElementById('attendanceSearch')?.value || ''
    );
}

// Inventory Stats
function updateInventoryStats() {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    
    const lowStock = inventory.filter(i => i.status === 'Low Stock' || i.currentStock <= i.reorderLevel).length;
    const outOfStock = inventory.filter(i => i.status === 'Out of Stock' || i.currentStock === 0).length;
    
    updateElementText('lowStockItemsCount', lowStock || 15);
    updateElementText('outOfStockCount', outOfStock || 5);
}

// Helper function to update element text
function updateElementText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return num.toLocaleString('en-IN');
    return num.toString();
}

// Helper function to format currency
function formatCurrency(amount) {
    if (!amount || amount === 0) return '₹0';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
    if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
    return '₹' + amount.toLocaleString('en-IN');
}

// ============================================
// FILTER FUNCTIONS
// ============================================

// Filter Radiology by modality
function filterRadiology(modality, element) {
    const radiologyTableBody = document.getElementById('radiologyTableBody');
    if (!radiologyTableBody) return;
    
    // Update active tab
    document.querySelectorAll('.radiology-modalities .modality-card, #radiology-modalities .modality-card').forEach(card => {
        card.classList.remove('active');
    });
    if (element) element.classList.add('active');
    
    const rows = radiologyTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 2) {
            const rowModality = cells[2].textContent.toLowerCase();
            if (modality === 'all' || rowModality.includes(modality.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    toast.show(`Showing ${modality} imaging studies`, 'info');
}

// Filter Inventory by category
function filterInventory(category, element) {
    const inventoryTableBody = document.getElementById('inventoryTableBody');
    if (!inventoryTableBody) return;
    
    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (element) element.classList.add('active');
    
    const rows = inventoryTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 2) {
            const rowCategory = cells[2].textContent.toLowerCase();
            if (category === 'all' || rowCategory.includes(category.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    toast.show(`Showing ${category} items`, 'info');
}

// Filter Lab Tests by status
function filterLabTests(status) {
    const labTableBody = document.getElementById('labTableBody');
    if (!labTableBody) return;
    
    const rows = labTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const statusBadge = row.querySelector('.status-badge');
        if (statusBadge) {
            const rowStatus = statusBadge.textContent.toLowerCase();
            if (status === 'all' || rowStatus.includes(status.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    toast.show(`Showing ${status} tests`, 'info');
}

// ============================================
// END OF COMPREHENSIVE ACTION FUNCTIONS
// ============================================

// Navigation Setup
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item[data-section]');
    const sections = document.querySelectorAll('.content-section');
    
    // Function to show section based on hash
    function showSection(sectionId) {
        // Remove active class from all menu items and sections
        menuItems.forEach(mi => mi.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));
        
        // Check RBAC before showing section
        if (!RBAC.canAccess(sectionId)) {
            if (typeof toast !== 'undefined') {
                toast.show('Access denied. You do not have permission to view this section.', 'error');
            }
            // Redirect to overview or first accessible section
            const accessibleSections = getAccessibleSections(getCurrentUser()?.role || '');
            const fallbackSection = accessibleSections.length > 0 ? accessibleSections[0] : 'overview';
            if (fallbackSection !== sectionId) {
                window.location.hash = fallbackSection;
            }
            return;
        }
        
        // Add active class to matching menu item
        const activeMenuItem = document.querySelector(`.menu-item[data-section="${sectionId}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Initialize analytics section when shown
        if (sectionId === 'analytics') {
            setTimeout(() => initAdvancedAnalytics(), 100);
        }
        
        // Initialize AI Command Center when shown
        if (sectionId === 'command-center') {
            setTimeout(() => initAICommandCenter(), 100);
        }
        
        // Resize charts when overview is shown
        if (sectionId === 'overview') {
            setTimeout(() => {
                // Trigger resize on all charts (Chart.js v4 compatible)
                const allCharts = Object.values(Chart.instances || {});
                allCharts.forEach(chart => {
                    if (chart && typeof chart.resize === 'function') {
                        chart.resize();
                    }
                });
            }, 150);
        }
    }
    
    // Handle hash changes
    function handleHashChange() {
        const hash = window.location.hash.substring(1); // Remove #
        const sectionId = hash || 'overview'; // Default to overview
        showSection(sectionId);
    }
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Initial load - show section based on current hash
    handleHashChange();
    
    // Menu item clicks (let default anchor behavior work)
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Just update active states - hash will change automatically
            const targetSection = this.getAttribute('data-section');
            // The hashchange event will handle showing the section
        });
    });
}

// Mobile Menu
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
}

// User Profile Dropdown Functions
function toggleUserDropdown(event) {
    event.stopPropagation();
    const userProfile = document.getElementById('userProfile');
    userProfile.classList.toggle('active');
}

function closeUserDropdown() {
    const userProfile = document.getElementById('userProfile');
    if (userProfile) {
        userProfile.classList.remove('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userProfile = document.getElementById('userProfile');
    if (userProfile && !userProfile.contains(event.target)) {
        userProfile.classList.remove('active');
    }
});

// Handle Logout
function handleLogout() {
    closeUserDropdown();
    
    // Show confirmation toast
    toast.show('Logging out...', 'info');
    
    setTimeout(() => {
        // Clear ALL auth data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        
        // Redirect to login page
        window.location.href = 'index.html';
    }, 1000);
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
    const indicator = document.getElementById('darkModeIndicator');
    if (indicator) {
        indicator.textContent = document.body.classList.contains('light-mode') ? 'OFF' : 'ON';
        indicator.style.background = document.body.classList.contains('light-mode') ? '#6b7280' : '#10b981';
    }
    // Save preference
    localStorage.setItem('darkMode', !document.body.classList.contains('light-mode'));
}

// Show Activity Log
function showActivityLog() {
    closeUserDropdown();
    // Navigate to analytics or show modal
    window.location.hash = 'analytics';
    toast.show('Activity log is available in Analytics section', 'info');
}

// Initialize Charts
function initializeCharts() {
    // Patient Flow Chart
    const patientFlowCtx = document.getElementById('patientFlowChart');
    if (patientFlowCtx) {
        new Chart(patientFlowCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'OPD',
                    data: [120, 145, 132, 158, 142, 95, 78],
                    borderColor: '#0891b2',
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'IPD',
                    data: [45, 52, 48, 55, 51, 38, 32],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Emergency',
                    data: [28, 32, 25, 35, 30, 22, 18],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.04)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.04)'
                        }
                    }
                }
            }
        });
    }
    
    // Department Chart
    const departmentCtx = document.getElementById('departmentChart');
    if (departmentCtx) {
        new Chart(departmentCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'Others'],
                datasets: [{
                    data: [25, 18, 22, 15, 12, 8],
                    backgroundColor: [
                        '#0891b2',
                        '#06b6d4',
                        '#8b5cf6',
                        '#f59e0b',
                        '#10b981',
                        '#64748b'
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                },
                cutout: '65%'
            }
        });
    }
    
    // Revenue Trend Chart
    const revenueTrendCtx = document.getElementById('revenueTrendChart');
    if (revenueTrendCtx) {
        new Chart(revenueTrendCtx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Revenue (₹ Lakhs)',
                    data: [45, 52, 48, 55],
                    backgroundColor: 'rgba(8, 145, 178, 0.85)',
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.04)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Department Revenue Chart
    const deptRevenueCtx = document.getElementById('departmentRevenueChart');
    if (deptRevenueCtx) {
        new Chart(deptRevenueCtx, {
            type: 'bar',
            data: {
                labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General'],
                datasets: [{
                    label: 'Revenue (₹ Lakhs)',
                    data: [15, 12, 14, 8, 6],
                    backgroundColor: [
                        'rgba(20, 184, 166, 0.8)',
                        'rgba(34, 211, 238, 0.8)',
                        'rgba(167, 139, 250, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                    ],
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Demographics Chart
    const demographicsCtx = document.getElementById('demographicsChart');
    if (demographicsCtx) {
        new Chart(demographicsCtx, {
            type: 'pie',
            data: {
                labels: ['0-18', '19-35', '36-50', '51-65', '65+'],
                datasets: [{
                    data: [15, 28, 25, 20, 12],
                    backgroundColor: [
                        '#14b8a6',
                        '#22d3ee',
                        '#a78bfa',
                        '#fbbf24',
                        '#f43f5e'
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
    }
}

// Sample Data
function initializeSampleData() {
    // Initialize sample data if not exists
    if (!localStorage.getItem('opdPatients')) {
        const opdPatients = [
            { id: 'OPD001', name: 'Rajesh Kumar', age: 45, gender: 'M', dept: 'Cardiology', doctor: 'Dr. Sharma', time: '09:00 AM', status: 'Waiting' },
            { id: 'OPD002', name: 'Priya Singh', age: 32, gender: 'F', dept: 'Neurology', doctor: 'Dr. Patel', time: '09:30 AM', status: 'Consulting' },
            { id: 'OPD003', name: 'Amit Verma', age: 28, gender: 'M', dept: 'Orthopedics', doctor: 'Dr. Reddy', time: '10:00 AM', status: 'Completed' },
            { id: 'OPD004', name: 'Sneha Gupta', age: 55, gender: 'F', dept: 'Pediatrics', doctor: 'Dr. Mehta', time: '10:30 AM', status: 'Waiting' },
            { id: 'OPD005', name: 'Vikram Shah', age: 38, gender: 'M', dept: 'Cardiology', doctor: 'Dr. Sharma', time: '11:00 AM', status: 'Consulting' }
        ];
        localStorage.setItem('opdPatients', JSON.stringify(opdPatients));
    }
    
    if (!localStorage.getItem('ipdPatients')) {
        const ipdPatients = [
            { id: 'IPD001', name: 'Ramesh Joshi', ward: 'General Ward', bed: 'GW-101', admissionDate: '2025-12-25', diagnosis: 'Pneumonia', doctor: 'Dr. Sharma', status: 'Active' },
            { id: 'IPD002', name: 'Sunita Devi', ward: 'ICU', bed: 'ICU-01', admissionDate: '2025-12-26', diagnosis: 'Cardiac Arrest', doctor: 'Dr. Patel', status: 'Active' },
            { id: 'IPD003', name: 'Anil Kumar', ward: 'Private Room', bed: 'PR-201', admissionDate: '2025-12-24', diagnosis: 'Post Surgery', doctor: 'Dr. Reddy', status: 'Active' },
            { id: 'IPD004', name: 'Meena Sharma', ward: 'General Ward', bed: 'GW-103', admissionDate: '2025-12-27', diagnosis: 'Diabetes Management', doctor: 'Dr. Mehta', status: 'Active' }
        ];
        localStorage.setItem('ipdPatients', JSON.stringify(ipdPatients));
    }
    
    if (!localStorage.getItem('emergencyPatients')) {
        const emergencyPatients = [
            { time: '08:45 AM', name: 'Unknown Patient', complaint: 'Road Accident', triage: 'Critical', vitals: 'BP: 90/60, HR: 120', assignedTo: 'Dr. Emergency', status: 'In Treatment' },
            { time: '09:15 AM', name: 'Pooja Rao', complaint: 'Severe Chest Pain', triage: 'Urgent', vitals: 'BP: 140/90, HR: 95', assignedTo: 'Dr. Sharma', status: 'Waiting' },
            { time: '09:30 AM', name: 'Rahul Nair', complaint: 'Minor Cut', triage: 'Stable', vitals: 'BP: 120/80, HR: 75', assignedTo: 'Nurse Staff', status: 'In Treatment' }
        ];
        localStorage.setItem('emergencyPatients', JSON.stringify(emergencyPatients));
    }
    
    if (!localStorage.getItem('otSchedules')) {
        const otSchedules = [
            { date: '2025-12-27', time: '09:00 AM', patient: 'John Doe', procedure: 'Cardiac Bypass', surgeon: 'Dr. Sharma', room: 'OT-1', duration: '4 hours', status: 'In Progress' },
            { date: '2025-12-27', time: '02:00 PM', patient: 'Jane Smith', procedure: 'Hip Replacement', surgeon: 'Dr. Patel', room: 'OT-2', duration: '3 hours', status: 'Scheduled' },
            { date: '2025-12-28', time: '10:00 AM', patient: 'Mike Wilson', procedure: 'Appendectomy', surgeon: 'Dr. Reddy', room: 'OT-3', duration: '2 hours', status: 'Scheduled' }
        ];
        localStorage.setItem('otSchedules', JSON.stringify(otSchedules));
    }
    
    if (!localStorage.getItem('labTests')) {
        const labTests = [
            { id: 'LAB001', patient: 'Rajesh Kumar', test: 'Complete Blood Count', orderedBy: 'Dr. Sharma', orderTime: '09:00 AM', priority: 'Routine', status: 'Pending' },
            { id: 'LAB002', patient: 'Priya Singh', test: 'MRI Brain', orderedBy: 'Dr. Patel', orderTime: '09:30 AM', priority: 'Urgent', status: 'In Progress' },
            { id: 'LAB003', patient: 'Amit Verma', test: 'X-Ray Chest', orderedBy: 'Dr. Reddy', orderTime: '10:00 AM', priority: 'Routine', status: 'Completed' }
        ];
        localStorage.setItem('labTests', JSON.stringify(labTests));
    }
    
    if (!localStorage.getItem('radiologyOrders')) {
        const radiologyOrders = [
            { id: 'RAD001', patient: 'Sunita Devi', modality: 'CT Scan', bodyPart: 'Brain', orderedBy: 'Dr. Sharma', scheduledTime: '11:00 AM', status: 'Scheduled' },
            { id: 'RAD002', patient: 'Anil Kumar', modality: 'X-Ray', bodyPart: 'Chest', orderedBy: 'Dr. Patel', scheduledTime: '10:30 AM', status: 'Completed' },
            { id: 'RAD003', patient: 'Meena Sharma', modality: 'Ultrasound', bodyPart: 'Abdomen', orderedBy: 'Dr. Mehta', scheduledTime: '02:00 PM', status: 'Pending' }
        ];
        localStorage.setItem('radiologyOrders', JSON.stringify(radiologyOrders));
    }
    
    if (!localStorage.getItem('prescriptions')) {
        const prescriptions = [
            { id: 'RX001', patient: 'Rajesh Kumar', prescribedBy: 'Dr. Sharma', medicines: 'Aspirin 75mg, Atorvastatin 20mg', dateTime: '2025-12-27 09:30', amount: '₹450', status: 'Pending' },
            { id: 'RX002', patient: 'Priya Singh', prescribedBy: 'Dr. Patel', medicines: 'Paracetamol 500mg, Ibuprofen 400mg', dateTime: '2025-12-27 10:00', amount: '₹280', status: 'Dispensed' },
            { id: 'RX003', patient: 'Amit Verma', prescribedBy: 'Dr. Reddy', medicines: 'Antibiotic Course', dateTime: '2025-12-27 10:30', amount: '₹650', status: 'Pending' }
        ];
        localStorage.setItem('prescriptions', JSON.stringify(prescriptions));
    }
    
    if (!localStorage.getItem('bills')) {
        const bills = [
            { billNo: 'BILL001', patient: 'Rajesh Kumar', services: 'OPD Consultation, Lab Tests', amount: '₹1,250', paymentMethod: 'Cash', date: '2025-12-27', status: 'Paid' },
            { billNo: 'BILL002', patient: 'Priya Singh', services: 'MRI, Consultation', amount: '₹5,800', paymentMethod: 'Card', date: '2025-12-27', status: 'Paid' },
            { billNo: 'BILL003', patient: 'Sunita Devi', services: 'ICU Charges, Medicines', amount: '₹15,000', paymentMethod: 'Insurance', date: '2025-12-27', status: 'Pending' }
        ];
        localStorage.setItem('bills', JSON.stringify(bills));
    }
    
    if (!localStorage.getItem('insuranceClaims')) {
        const insuranceClaims = [
            { claimId: 'CLM001', patient: 'Sunita Devi', provider: 'Star Health', policyNo: 'SH123456', claimAmount: '₹50,000', submissionDate: '2025-12-26', status: 'Pending' },
            { claimId: 'CLM002', patient: 'Anil Kumar', provider: 'HDFC ERGO', policyNo: 'HE789012', claimAmount: '₹35,000', submissionDate: '2025-12-25', status: 'Approved' },
            { claimId: 'CLM003', patient: 'Meena Sharma', provider: 'ICICI Lombard', policyNo: 'IL345678', claimAmount: '₹20,000', submissionDate: '2025-12-24', status: 'Rejected' }
        ];
        localStorage.setItem('insuranceClaims', JSON.stringify(insuranceClaims));
    }
    
    if (!localStorage.getItem('staff')) {
        const staff = [
            { empId: 'EMP001', name: 'Dr. Sharma', dept: 'Cardiology', designation: 'Senior Consultant', contact: '9876543210', status: 'Active' },
            { empId: 'EMP002', name: 'Dr. Patel', dept: 'Neurology', designation: 'Consultant', contact: '9876543211', status: 'Active' },
            { empId: 'EMP003', name: 'Nurse Rita', dept: 'General Ward', designation: 'Staff Nurse', contact: '9876543212', status: 'Active' },
            { empId: 'EMP004', name: 'Ravi Kumar', dept: 'Pharmacy', designation: 'Pharmacist', contact: '9876543213', status: 'Active' }
        ];
        localStorage.setItem('staff', JSON.stringify(staff));
    }
    
    if (!localStorage.getItem('inventory')) {
        const inventory = [
            { itemCode: 'MED001', itemName: 'Paracetamol 500mg', category: 'Medicines', currentStock: 500, reorderLevel: 100, lastUpdated: '2025-12-27', status: 'In Stock' },
            { itemCode: 'MED002', itemName: 'Aspirin 75mg', category: 'Medicines', currentStock: 45, reorderLevel: 50, lastUpdated: '2025-12-27', status: 'Low Stock' },
            { itemCode: 'EQP001', itemName: 'BP Monitor', category: 'Equipment', currentStock: 25, reorderLevel: 10, lastUpdated: '2025-12-26', status: 'In Stock' },
            { itemCode: 'CON001', itemName: 'Surgical Gloves (Box)', category: 'Consumables', currentStock: 5, reorderLevel: 20, lastUpdated: '2025-12-27', status: 'Out of Stock' }
        ];
        localStorage.setItem('inventory', JSON.stringify(inventory));
    }
}

// Load Table Data
async function loadTableData() {
    let patients = [];
    try {
        const response = await api.getPatients();
        if (response.success) {
            patients = response.data;
        }
    } catch (e) {
        console.error("Failed to fetch patients", e);
    }

    // Load OPD Table
    const opdTableBody = document.getElementById('opdTableBody');
    if (opdTableBody) {
        // Use API data if available, else fallback to localStorage (hybrid for demo)
        const opdPatients = patients.length > 0 
            ? patients.filter(p => p.type === 'OPD') 
            : JSON.parse(localStorage.getItem('opdPatients') || '[]');
            
        opdTableBody.innerHTML = opdPatients.map(patient => `
            <tr>
                <td>${patient.patientId || patient.id || patient._id}</td>
                <td>${patient.name}</td>
                <td>${patient.age}/${patient.gender}</td>
                <td>${patient.department || patient.dept}</td>
                <td>${patient.doctor}</td>
                <td>${patient.time || new Date(patient.createdAt).toLocaleTimeString()}</td>
                <td><span class="status-badge ${patient.status.toLowerCase()}">${patient.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewPatient('${patient._id || patient.id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="editPatient('${patient._id || patient.id}')"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    }
    
    // Load IPD Table
    const ipdTableBody = document.getElementById('ipdTableBody');
    if (ipdTableBody) {
        const ipdPatients = patients.length > 0 
            ? patients.filter(p => p.type === 'IPD') 
            : JSON.parse(localStorage.getItem('ipdPatients') || '[]');
            
        ipdTableBody.innerHTML = ipdPatients.map(patient => `
            <tr>
                <td>${patient.patientId || patient.id || patient._id}</td>
                <td>${patient.name}</td>
                <td>${patient.ward} / ${patient.bed}</td>
                <td>${patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>${patient.diagnosis}</td>
                <td>${patient.doctor}</td>
                <td><span class="status-badge ${patient.status.toLowerCase()}">${patient.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewIPDPatient('${patient._id || patient.id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="dischargePatient('${patient._id || patient.id}')"><i class="fas fa-sign-out-alt"></i></button>
                </td>
            </tr>
        `).join('');
    }
    
    // Load Emergency Table
    const emergencyTableBody = document.getElementById('emergencyTableBody');
    if (emergencyTableBody) {
        const emergencyPatients = patients.length > 0 
            ? patients.filter(p => p.type === 'Emergency') 
            : JSON.parse(localStorage.getItem('emergencyPatients') || '[]');
            
        emergencyTableBody.innerHTML = emergencyPatients.map(patient => `
            <tr>
                <td>${patient.time || new Date(patient.createdAt).toLocaleTimeString()}</td>
                <td>${patient.name}</td>
                <td>${patient.complaint || '-'}</td>
                <td><span class="status-badge ${patient.severity ? patient.severity.toLowerCase() : 'critical'}">${patient.severity || patient.triage || 'Critical'}</span></td>
                <td>${patient.vitals || '-'}</td>
                <td>${patient.doctor || patient.assignedTo || '-'}</td>
                <td><span class="status-badge ${patient.status.toLowerCase().replace(' ', '-')}">${patient.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewEmergencyPatient('${patient._id || patient.id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="treatEmergencyPatient('${patient._id || patient.id}')"><i class="fas fa-stethoscope"></i></button>
                </td>
            </tr>
        `).join('');
    }
    
    // Load OT Table
    const otTableBody = document.getElementById('otTableBody');
    if (otTableBody) {
        try {
            const response = await api.getSurgeries();
            const surgeries = response.success ? response.data : [];
            otTableBody.innerHTML = surgeries.map(schedule => {
                // Use correct field names from Surgery model
                const surgeryDate = schedule.surgeryDate || schedule.date;
                const surgeryTime = schedule.surgeryTime || schedule.time || '';
                const otRoom = schedule.otRoom || schedule.room || 'N/A';
                const duration = schedule.estimatedDuration || schedule.duration || 'N/A';
                const dateDisplay = surgeryDate ? new Date(surgeryDate).toLocaleDateString() : 'N/A';
                
                return `
                <tr>
                    <td>${dateDisplay} ${surgeryTime}</td>
                    <td>${schedule.patientName || 'N/A'}</td>
                    <td>${schedule.procedure || 'N/A'}</td>
                    <td>${schedule.surgeon || 'N/A'}</td>
                    <td>${otRoom}</td>
                    <td>${duration}</td>
                    <td><span class="status-badge ${(schedule.status || 'scheduled').toLowerCase().replace(' ', '-')}">${schedule.status || 'Scheduled'}</span></td>
                    <td>
                        <button class="action-btn view" onclick="viewSurgery('${schedule._id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="editSurgery('${schedule._id}')"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `;
            }).join('');
        } catch (err) {
            console.error('Error loading surgeries:', err);
        }
    }
    
    // Load Lab Table
    const labTableBody = document.getElementById('labTableBody');
    if (labTableBody) {
        try {
            const response = await api.getLabTests();
            const labTests = response.success ? response.data : [];
            labTableBody.innerHTML = labTests.map(test => `
                <tr>
                    <td>${test._id ? test._id.substring(0, 8).toUpperCase() : 'N/A'}</td>
                    <td>${test.patientName}</td>
                    <td>${test.testType}</td>
                    <td>${test.orderedBy}</td>
                    <td>${new Date(test.createdAt).toLocaleDateString()}</td>
                    <td><span class="status-badge ${test.priority.toLowerCase()}">${test.priority}</span></td>
                    <td><span class="status-badge ${test.status.toLowerCase().replace(' ', '-')}">${test.status}</span></td>
                    <td>
                        <button class="action-btn view" onclick="viewLabTest('${test._id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="updateLabStatus('${test._id}')"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading lab tests:', err);
        }
    }
    
    // Load Radiology Table
    const radiologyTableBody = document.getElementById('radiologyTableBody');
    if (radiologyTableBody) {
        try {
            const response = await api.getImagingOrders();
            const imagingOrders = response.success ? response.data : [];
            radiologyTableBody.innerHTML = imagingOrders.map(order => `
                <tr>
                    <td>${order._id ? order._id.substring(0, 8).toUpperCase() : 'N/A'}</td>
                    <td>${order.patientName}</td>
                    <td>${order.imagingType}</td>
                    <td>${order.bodyPart}</td>
                    <td>${order.orderedBy}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    <td><span class="status-badge ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
                    <td>
                        <button class="action-btn view" onclick="viewImaging('${order._id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="updateImagingStatus('${order._id}')"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading imaging orders:', err);
        }
    }
    
    // Load Pharmacy Table  
    const pharmacyTableBody = document.getElementById('pharmacyTableBody');
    if (pharmacyTableBody) {
        try {
            const response = await api.getPrescriptions();
            const prescriptions = response.success ? response.data : [];
            pharmacyTableBody.innerHTML = prescriptions.map(rx => `
                <tr>
                    <td>${rx._id ? rx._id.substring(0, 8).toUpperCase() : 'N/A'}</td>
                    <td>${rx.patientName}</td>
                    <td>${rx.doctor}</td>
                    <td>${rx.medicines ? rx.medicines.length : 0} items</td>
                    <td>${new Date(rx.createdAt).toLocaleDateString()}</td>
                    <td>₹${rx.medicines?.reduce((sum, m) => sum + 100, 0) || 0}</td>
                    <td><span class="status-badge ${rx.status.toLowerCase()}">${rx.status}</span></td>
                    <td>
                        <button class="action-btn view" onclick="viewPrescription('${rx._id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="dispensePrescription('${rx._id}')" title="Dispense"><i class="fas fa-check"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading prescriptions:', err);
        }
    }
    
    // Load Billing Table
    const billingTableBody = document.getElementById('billingTableBody');
    if (billingTableBody) {
        try {
            const response = await api.getBills();
            const bills = response.success ? response.data : [];
            billingTableBody.innerHTML = bills.map(bill => `
                <tr>
                    <td>${bill.billNumber}</td>
                    <td>${bill.patientName}</td>
                    <td>${bill.items?.length || 0} services</td>
                    <td>₹${bill.total?.toFixed(2) || '0.00'}</td>
                    <td>${bill.paymentMethod || '-'}</td>
                    <td>${new Date(bill.createdAt).toLocaleDateString()}</td>
                    <td><span class="status-badge ${bill.paymentStatus.toLowerCase()}">${bill.paymentStatus}</span></td>
                    <td>
                        <button class="action-btn view" onclick="viewBill('${bill._id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="printBill('${bill._id}')" title="Print"><i class="fas fa-print"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading bills:', err);
        }
    }
    
    // Load Insurance Table with sample data
    const insuranceTableBody = document.getElementById('insuranceTableBody');
    if (insuranceTableBody) {
        let insuranceClaims = JSON.parse(localStorage.getItem('insuranceClaims') || '[]');
        
        // Initialize sample data if empty
        if (insuranceClaims.length === 0) {
            insuranceClaims = [
                { claimId: 'CLM-001', patient: 'Amit Sharma', provider: 'Star Health', policyNo: 'SH-2024-001', claimAmount: '₹45,000', submissionDate: new Date().toLocaleDateString(), status: 'Pending' },
                { claimId: 'CLM-002', patient: 'Priya Patel', provider: 'HDFC Ergo', policyNo: 'HE-2024-102', claimAmount: '₹78,500', submissionDate: new Date(Date.now() - 86400000).toLocaleDateString(), status: 'Approved' },
                { claimId: 'CLM-003', patient: 'Rajesh Kumar', provider: 'ICICI Lombard', policyNo: 'IL-2024-203', claimAmount: '₹32,000', submissionDate: new Date(Date.now() - 172800000).toLocaleDateString(), status: 'Under Review' },
                { claimId: 'CLM-004', patient: 'Sneha Reddy', provider: 'New India Assurance', policyNo: 'NI-2024-304', claimAmount: '₹1,25,000', submissionDate: new Date(Date.now() - 259200000).toLocaleDateString(), status: 'Rejected' }
            ];
            localStorage.setItem('insuranceClaims', JSON.stringify(insuranceClaims));
        }
        
        insuranceTableBody.innerHTML = insuranceClaims.map((claim, index) => `
            <tr>
                <td>${claim.claimId}</td>
                <td>${claim.patient}</td>
                <td>${claim.provider}</td>
                <td>${claim.policyNo}</td>
                <td>${claim.claimAmount}</td>
                <td>${claim.submissionDate}</td>
                <td><span class="status-badge ${claim.status.toLowerCase().replace(' ', '-')}">${claim.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewInsuranceClaim(${index})"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="editInsuranceClaim(${index})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    }
    
    // Load HR Table with sample data
    const hrTableBody = document.getElementById('hrTableBody');
    if (hrTableBody) {
        let staff = JSON.parse(localStorage.getItem('staff') || '[]');
        
        // Initialize sample data if empty
        if (staff.length === 0) {
            staff = [
                { empId: 'EMP-001', name: 'Dr. Rajesh Sharma', dept: 'Cardiology', designation: 'Senior Consultant', contact: '9876543210', status: 'Active' },
                { empId: 'EMP-002', name: 'Dr. Priya Mehta', dept: 'Neurology', designation: 'Consultant', contact: '9876543211', status: 'Active' },
                { empId: 'EMP-003', name: 'Nurse Anita Desai', dept: 'ICU', designation: 'Head Nurse', contact: '9876543212', status: 'Active' },
                { empId: 'EMP-004', name: 'Suresh Kumar', dept: 'Admin', designation: 'Receptionist', contact: '9876543213', status: 'Active' },
                { empId: 'EMP-005', name: 'Dr. Vikram Patel', dept: 'Orthopedics', designation: 'HOD', contact: '9876543214', status: 'On Leave' },
                { empId: 'EMP-006', name: 'Pharmacist Ravi', dept: 'Pharmacy', designation: 'Senior Pharmacist', contact: '9876543215', status: 'Active' }
            ];
            localStorage.setItem('staff', JSON.stringify(staff));
        }
        
        hrTableBody.innerHTML = staff.map((emp, index) => `
            <tr>
                <td>${emp.empId}</td>
                <td>${emp.name}</td>
                <td>${emp.dept}</td>
                <td>${emp.designation}</td>
                <td>${emp.contact}</td>
                <td><span class="status-badge ${emp.status.toLowerCase().replace(' ', '-')}">${emp.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewStaff(${index})"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="editStaff(${index})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    }
    
    // Load Inventory Table with sample data
    const inventoryTableBody = document.getElementById('inventoryTableBody');
    if (inventoryTableBody) {
        let inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        
        // Initialize sample data if empty
        if (inventory.length === 0) {
            inventory = [
                { itemCode: 'MED-001', itemName: 'Paracetamol 500mg', category: 'Medicines', currentStock: 500, reorderLevel: 100, lastUpdated: new Date().toLocaleDateString(), status: 'In Stock' },
                { itemCode: 'MED-002', itemName: 'Amoxicillin 250mg', category: 'Medicines', currentStock: 45, reorderLevel: 50, lastUpdated: new Date().toLocaleDateString(), status: 'Low Stock' },
                { itemCode: 'EQP-001', itemName: 'Digital Thermometer', category: 'Equipment', currentStock: 25, reorderLevel: 10, lastUpdated: new Date().toLocaleDateString(), status: 'In Stock' },
                { itemCode: 'CON-001', itemName: 'Surgical Gloves (Box)', category: 'Consumables', currentStock: 0, reorderLevel: 20, lastUpdated: new Date().toLocaleDateString(), status: 'Out of Stock' },
                { itemCode: 'MED-003', itemName: 'Ibuprofen 400mg', category: 'Medicines', currentStock: 200, reorderLevel: 50, lastUpdated: new Date().toLocaleDateString(), status: 'In Stock' },
                { itemCode: 'CON-002', itemName: 'Syringes 5ml', category: 'Consumables', currentStock: 150, reorderLevel: 100, lastUpdated: new Date().toLocaleDateString(), status: 'In Stock' }
            ];
            localStorage.setItem('inventory', JSON.stringify(inventory));
        }
        
        inventoryTableBody.innerHTML = inventory.map((item, index) => `
            <tr>
                <td>${item.itemCode}</td>
                <td>${item.itemName}</td>
                <td>${item.category}</td>
                <td>${item.currentStock}</td>
                <td>${item.reorderLevel}</td>
                <td>${item.lastUpdated}</td>
                <td><span class="status-badge ${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewInventoryItem(${index})"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="editInventoryItem(${index})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    }
    
    // Update all section stats after loading data
    updateAllSectionStats();
}

// Helper function to populate patient datalist
async function populatePatientDatalist(datalistId, inputId, hiddenInputId) {
    try {
        const response = await api.getPatients();
        if (response.success && response.data.length > 0) {
            const datalist = document.getElementById(datalistId);
            const input = document.getElementById(inputId);
            const hiddenInput = document.getElementById(hiddenInputId);
            
            if (datalist && input && hiddenInput) {
                datalist.innerHTML = response.data.map(patient => 
                    `<option value="${patient.name}" data-id="${patient._id}">${patient.name} - ${patient.patientId || patient._id.substring(0, 8)}</option>`
                ).join('');
                
                // Set patient ID when name is selected
                input.addEventListener('input', () => {
                    const selectedOption = Array.from(datalist.options).find(option => option.value === input.value);
                    if (selectedOption) {
                        hiddenInput.value = selectedOption.getAttribute('data-id');
                    }
                });
            }
        }
    } catch (err) {
        console.error('Error loading patients:', err);
    }
}

// Setup Button Handlers
function setupButtonHandlers() {
    // New OPD Button
    const newOPDBtn = document.getElementById('newOPDBtn');
    if (newOPDBtn) {
        newOPDBtn.addEventListener('click', () => {
            showModal('New OPD Registration', createOPDForm());
        });
    }
    
    // New IPD Button
    const newIPDBtn = document.getElementById('newIPDBtn');
    if (newIPDBtn) {
        newIPDBtn.addEventListener('click', () => {
            showModal('New IPD Admission', createIPDForm());
        });
    }

    // New Emergency Button
    const newEmergencyBtn = document.getElementById('newEmergencyBtn');
    if (newEmergencyBtn) {
        newEmergencyBtn.addEventListener('click', () => {
            showModal('New Emergency Admission', createEmergencyForm());
        });
    }
    
    // Schedule OT Button
    const scheduleOTBtn = document.getElementById('scheduleOTBtn');
    if (scheduleOTBtn) {
        scheduleOTBtn.addEventListener('click', async () => {
            showModal('Schedule Surgery', createOTForm());
            await populatePatientDatalist('patientsList', 'otPatientName', 'otPatientId');
        });
    }
    
    // New Lab Test Button
    const newLabTestBtn = document.getElementById('newLabTestBtn');
    if (newLabTestBtn) {
        newLabTestBtn.addEventListener('click', async () => {
            showModal('New Lab Test Order', createLabForm());
            await populatePatientDatalist('labPatientsList', 'labPatientName', 'labPatientId');
        });
    }
    
    // New Radiology Button
    const newRadiologyBtn = document.getElementById('newRadiologyBtn');
    if (newRadiologyBtn) {
        newRadiologyBtn.addEventListener('click', async () => {
            showModal('New Imaging Order', createRadiologyForm());
            await populatePatientDatalist('radPatientsList', 'radPatientName', 'radPatientId');
        });
    }
    
    // New Prescription Button
    const newPrescriptionBtn = document.getElementById('newPrescriptionBtn');
    if (newPrescriptionBtn) {
        newPrescriptionBtn.addEventListener('click', async () => {
            showModal('New Prescription', createPrescriptionForm());
            await populatePatientDatalist('rxPatientsList', 'rxPatientName', 'rxPatientId');
        });
    }
    
    // Generate Bill Button
    const generateBillBtn = document.getElementById('generateBillBtn');
    if (generateBillBtn) {
        generateBillBtn.addEventListener('click', async () => {
            showModal('Generate Bill', createBillForm());
            await populatePatientDatalist('billPatientsList', 'billPatientName', 'billPatientId');
        });
    }
    
    // New Claim Button
    const newClaimBtn = document.getElementById('newClaimBtn');
    if (newClaimBtn) {
        newClaimBtn.addEventListener('click', () => {
            showModal('New Insurance Claim', createClaimForm());
        });
    }
    
    // Add Staff Button
    const addStaffBtn = document.getElementById('addStaffBtn');
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', () => {
            showModal('Add Staff Member', createStaffForm());
        });
    }
    
    // Add Inventory Button
    const addInventoryBtn = document.getElementById('addInventoryBtn');
    if (addInventoryBtn) {
        addInventoryBtn.addEventListener('click', () => {
            showModal('Add Inventory Item', createInventoryForm());
        });
    }
}

// Modal Functions
function showModal(title, content) {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = `
        <div class="modal active">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-modal" onclick="closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
}

function closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = '';
}

// Form Creation Functions
function createOPDForm() {
    return `
        <form onsubmit="submitOPDForm(event)" class="settings-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Patient Name <span class="required">*</span></label>
                    <input type="text" name="name" placeholder="Enter full name" required>
                </div>
                <div class="form-group">
                    <label>Contact Number <span class="required">*</span></label>
                    <input type="tel" name="contact" placeholder="10-digit mobile" pattern="[0-9]{10}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Age <span class="required">*</span></label>
                    <input type="number" name="age" min="0" max="120" placeholder="Years" required>
                </div>
                <div class="form-group">
                    <label>Gender <span class="required">*</span></label>
                    <select name="gender" required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Blood Group</label>
                    <select name="bloodGroup">
                        <option value="">Select</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" name="address" placeholder="Full address">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Department <span class="required">*</span></label>
                    <select name="department" required>
                        <option value="">Select Department</option>
                        <option value="General Medicine">General Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Gynecology">Gynecology</option>
                        <option value="ENT">ENT</option>
                        <option value="Ophthalmology">Ophthalmology</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Gastroenterology">Gastroenterology</option>
                        <option value="Pulmonology">Pulmonology</option>
                        <option value="Nephrology">Nephrology</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Doctor <span class="required">*</span></label>
                    <select name="doctor" required>
                        <option value="">Select Doctor</option>
                        <option value="Dr. Rajesh Sharma">Dr. Rajesh Sharma</option>
                        <option value="Dr. Vikram Patel">Dr. Vikram Patel</option>
                        <option value="Dr. Sunil Reddy">Dr. Sunil Reddy</option>
                        <option value="Dr. Priya Mehta">Dr. Priya Mehta</option>
                        <option value="Dr. Anjali Deshmukh">Dr. Anjali Deshmukh</option>
                        <option value="Dr. Amit Kapoor">Dr. Amit Kapoor</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Appointment Time</label>
                    <input type="time" name="appointmentTime">
                </div>
                <div class="form-group">
                    <label>Consultation Fee (₹)</label>
                    <input type="number" name="consultationFee" placeholder="800" value="800">
                </div>
            </div>
            <div class="form-group">
                <label>Chief Complaint / Symptoms</label>
                <textarea name="symptoms" rows="2" placeholder="Describe symptoms..."></textarea>
            </div>
            <button type="submit" class="btn-primary"><i class="fas fa-user-plus"></i> Register Patient</button>
        </form>
    `;
}

function createIPDForm() {
    return `
        <form onsubmit="submitIPDForm(event)" class="settings-form">
            <div class="form-section-title">
                <i class="fas fa-user"></i> Patient Information
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Patient Name<span class="required">*</span></label>
                    <input type="text" name="name" placeholder="Enter full name" required>
                </div>
                <div class="form-group">
                    <label>Aadhar Number</label>
                    <input type="text" name="aadharNumber" placeholder="12-digit Aadhar" pattern="[0-9]{12}" maxlength="12">
                </div>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label>Age<span class="required">*</span></label>
                    <input type="number" name="age" min="0" max="120" required>
                </div>
                <div class="form-group">
                    <label>Gender<span class="required">*</span></label>
                    <select name="gender" required>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Blood Group<span class="required">*</span></label>
                    <select name="bloodGroup" required>
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Contact Number<span class="required">*</span></label>
                    <input type="tel" name="contact" placeholder="10-digit mobile" pattern="[0-9]{10}" maxlength="10" required>
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" placeholder="patient@email.com">
                </div>
            </div>
            <div class="form-group">
                <label>Address<span class="required">*</span></label>
                <textarea name="address" rows="2" placeholder="Full residential address" required></textarea>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-phone-alt"></i> Emergency Contact
                </div>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Name<span class="required">*</span></label>
                        <input type="text" name="emergencyContactName" placeholder="Contact person" required>
                    </div>
                    <div class="form-group">
                        <label>Relationship<span class="required">*</span></label>
                        <select name="emergencyContactRelation" required>
                            <option value="">Select</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Child">Child</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Phone<span class="required">*</span></label>
                        <input type="tel" name="emergencyContactPhone" placeholder="Mobile number" pattern="[0-9]{10}" maxlength="10" required>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-procedures"></i> Admission Details
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Room Type<span class="required">*</span></label>
                        <select name="roomType" id="roomTypeSelect" required onchange="updateRoomRate()">
                            <option value="">Select Room Type</option>
                            <option value="General Ward" data-rate="500">General Ward - ₹500/day</option>
                            <option value="Semi-Private" data-rate="1500">Semi-Private - ₹1,500/day</option>
                            <option value="Private" data-rate="3000">Private Room - ₹3,000/day</option>
                            <option value="ICU" data-rate="8000">ICU - ₹8,000/day</option>
                            <option value="NICU" data-rate="10000">NICU - ₹10,000/day</option>
                            <option value="CCU" data-rate="8500">CCU - ₹8,500/day</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Bed Number<span class="required">*</span></label>
                        <input type="text" name="bedNumber" placeholder="e.g., GW-101, ICU-05" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Department<span class="required">*</span></label>
                        <select name="department" required>
                            <option value="">Select Department</option>
                            <option value="General Medicine">General Medicine</option>
                            <option value="Cardiology">Cardiology</option>
                            <option value="Neurology">Neurology</option>
                            <option value="Orthopedics">Orthopedics</option>
                            <option value="Gastroenterology">Gastroenterology</option>
                            <option value="Pulmonology">Pulmonology</option>
                            <option value="Nephrology">Nephrology</option>
                            <option value="Oncology">Oncology</option>
                            <option value="General Surgery">General Surgery</option>
                            <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                            <option value="Pediatrics">Pediatrics</option>
                            <option value="Psychiatry">Psychiatry</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Attending Doctor<span class="required">*</span></label>
                        <select name="doctor" required>
                            <option value="">Select Doctor</option>
                            <option value="Dr. Rajesh Sharma">Dr. Rajesh Sharma - General Medicine</option>
                            <option value="Dr. Priya Patel">Dr. Priya Patel - Cardiology</option>
                            <option value="Dr. Suresh Reddy">Dr. Suresh Reddy - Orthopedics</option>
                            <option value="Dr. Anjali Mehta">Dr. Anjali Mehta - OB/GYN</option>
                            <option value="Dr. Vikram Singh">Dr. Vikram Singh - Surgery</option>
                            <option value="Dr. Neha Gupta">Dr. Neha Gupta - Pediatrics</option>
                            <option value="Dr. Amit Verma">Dr. Amit Verma - Neurology</option>
                            <option value="Dr. Sunita Rao">Dr. Sunita Rao - Oncology</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Admission Diagnosis<span class="required">*</span></label>
                    <textarea name="diagnosis" rows="2" placeholder="Primary diagnosis for admission" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Expected Length of Stay</label>
                        <select name="expectedStay">
                            <option value="1-3">1-3 days</option>
                            <option value="4-7">4-7 days</option>
                            <option value="8-14">1-2 weeks</option>
                            <option value="15+">More than 2 weeks</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Admission Type</label>
                        <select name="admissionType">
                            <option value="Planned">Planned Admission</option>
                            <option value="Emergency">Emergency Admission</option>
                            <option value="Transfer">Transfer from Another Hospital</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-heartbeat"></i> Vitals on Admission
                </div>
                <div class="vitals-grid">
                    <div class="form-group">
                        <label>BP (mmHg)</label>
                        <input type="text" name="vitalsBP" placeholder="120/80">
                    </div>
                    <div class="form-group">
                        <label>Pulse (/min)</label>
                        <input type="number" name="vitalsHR" placeholder="72" min="30" max="200">
                    </div>
                    <div class="form-group">
                        <label>Temp (°F)</label>
                        <input type="number" step="0.1" name="vitalsTemp" placeholder="98.6" min="95" max="108">
                    </div>
                    <div class="form-group">
                        <label>SpO2 (%)</label>
                        <input type="number" name="vitalsO2" placeholder="98" min="50" max="100">
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-notes-medical"></i> Medical History
                </div>
                <div class="form-group">
                    <label>Known Allergies</label>
                    <input type="text" name="allergies" placeholder="e.g., Penicillin, Sulfa drugs, Latex (comma separated)">
                </div>
                <div class="form-group">
                    <label>Chronic Conditions</label>
                    <input type="text" name="chronicConditions" placeholder="e.g., Diabetes, Hypertension, Asthma (comma separated)">
                </div>
                <div class="form-group">
                    <label>Current Medications</label>
                    <textarea name="currentMedications" rows="2" placeholder="List current medications with dosage"></textarea>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-file-invoice-dollar"></i> Insurance Information
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Insurance Provider</label>
                        <select name="insuranceProvider">
                            <option value="">No Insurance / Self Pay</option>
                            <option value="Star Health">Star Health Insurance</option>
                            <option value="ICICI Lombard">ICICI Lombard</option>
                            <option value="HDFC ERGO">HDFC ERGO</option>
                            <option value="Max Bupa">Max Bupa</option>
                            <option value="Bajaj Allianz">Bajaj Allianz</option>
                            <option value="New India">New India Assurance</option>
                            <option value="CGHS">CGHS</option>
                            <option value="ESIC">ESIC</option>
                            <option value="Ayushman Bharat">Ayushman Bharat (PMJAY)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Policy Number</label>
                        <input type="text" name="insurancePolicyNumber" placeholder="Policy/Card Number">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Advance Deposit (₹)</label>
                        <input type="number" name="advanceDeposit" placeholder="0" min="0" step="100">
                    </div>
                    <div class="form-group">
                        <label>Payment Mode</label>
                        <select name="paymentMode">
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="NEFT">NEFT/Bank Transfer</option>
                            <option value="Insurance">Insurance Cashless</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <button type="submit" class="btn-primary">
                <i class="fas fa-bed"></i> Admit Patient
            </button>
        </form>
    `;
}

function createEmergencyForm() {
    return `
        <form onsubmit="submitEmergencyForm(event)" class="settings-form">
            <div class="form-section-title" style="color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle"></i> Emergency Registration - Time is Critical
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Patient Name<span class="required">*</span></label>
                    <input type="text" name="name" placeholder="Enter patient name" required>
                </div>
                <div class="form-group">
                    <label>Brought By</label>
                    <input type="text" name="broughtBy" placeholder="Ambulance / Family / Self">
                </div>
            </div>
            
            <div class="form-row-3">
                <div class="form-group">
                    <label>Age<span class="required">*</span></label>
                    <input type="number" name="age" min="0" max="120" placeholder="Years" required>
                </div>
                <div class="form-group">
                    <label>Gender<span class="required">*</span></label>
                    <select name="gender" required>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Blood Group</label>
                    <select name="bloodGroup">
                        <option value="">Unknown</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Contact Number</label>
                    <input type="tel" name="contact" placeholder="10-digit mobile" pattern="[0-9]{10}" maxlength="10">
                </div>
                <div class="form-group">
                    <label>Emergency Contact Phone</label>
                    <input type="tel" name="emergencyContactPhone" placeholder="Family member phone" pattern="[0-9]{10}" maxlength="10">
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title" style="color: var(--danger-color);">
                    <i class="fas fa-ambulance"></i> Emergency Details
                </div>
                <div class="form-group">
                    <label>Triage Level / Severity<span class="required">*</span></label>
                    <select name="severity" required style="font-weight: 600;">
                        <option value="">Select Severity</option>
                        <option value="Critical" style="background: #fee2e2; color: #dc2626;">🔴 CRITICAL - Immediate Life Threat</option>
                        <option value="High" style="background: #ffedd5; color: #c2410c;">🟠 HIGH - Urgent, Potentially Life Threatening</option>
                        <option value="Medium" style="background: #fef3c7; color: #92400e;">🟡 MEDIUM - Serious but Stable</option>
                        <option value="Low" style="background: #d1fae5; color: #047857;">🟢 LOW - Minor Emergency</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Chief Complaint<span class="required">*</span></label>
                    <textarea name="complaint" rows="2" placeholder="Primary reason for emergency visit (e.g., Chest pain, Accident injury, Difficulty breathing)" required></textarea>
                </div>
                <div class="form-group">
                    <label>Mode of Injury / Onset</label>
                    <select name="modeOfInjury">
                        <option value="">Not Applicable</option>
                        <option value="Road Traffic Accident">Road Traffic Accident (RTA)</option>
                        <option value="Fall">Fall</option>
                        <option value="Assault">Assault / Violence</option>
                        <option value="Burns">Burns</option>
                        <option value="Poisoning">Poisoning / Overdose</option>
                        <option value="Sudden Illness">Sudden Onset Illness</option>
                        <option value="Chest Pain">Cardiac Symptoms</option>
                        <option value="Respiratory Distress">Respiratory Distress</option>
                        <option value="Stroke Symptoms">Stroke Symptoms</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-heartbeat"></i> Vitals (on Arrival)<span class="required">*</span>
                </div>
                <div class="vitals-grid">
                    <div class="form-group">
                        <label>BP (mmHg)</label>
                        <input type="text" name="vitalsBP" placeholder="120/80" required>
                    </div>
                    <div class="form-group">
                        <label>Pulse (/min)</label>
                        <input type="number" name="vitalsHR" placeholder="72" min="0" max="250" required>
                    </div>
                    <div class="form-group">
                        <label>Temp (°F)</label>
                        <input type="number" step="0.1" name="vitalsTemp" placeholder="98.6" min="90" max="110">
                    </div>
                    <div class="form-group">
                        <label>SpO2 (%)</label>
                        <input type="number" name="vitalsO2" placeholder="98" min="0" max="100" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Respiratory Rate (/min)</label>
                        <input type="number" name="vitalsRR" placeholder="16" min="0" max="60">
                    </div>
                    <div class="form-group">
                        <label>GCS Score (3-15)</label>
                        <input type="number" name="gcsScore" placeholder="15" min="3" max="15">
                    </div>
                </div>
                <div class="form-group">
                    <label>Consciousness Level</label>
                    <select name="consciousness">
                        <option value="Alert">Alert & Oriented</option>
                        <option value="Verbal">Responds to Verbal</option>
                        <option value="Pain">Responds to Pain</option>
                        <option value="Unresponsive">Unresponsive</option>
                    </select>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-user-md"></i> Assignment
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Assigned Doctor<span class="required">*</span></label>
                        <select name="doctor" required>
                            <option value="">Select Doctor</option>
                            <option value="Dr. Rajesh Sharma">Dr. Rajesh Sharma - Emergency Medicine</option>
                            <option value="Dr. Vikram Singh">Dr. Vikram Singh - Trauma Surgery</option>
                            <option value="Dr. Priya Patel">Dr. Priya Patel - Cardiology</option>
                            <option value="Dr. Amit Verma">Dr. Amit Verma - Neurology</option>
                            <option value="Dr. Suresh Reddy">Dr. Suresh Reddy - Orthopedics</option>
                            <option value="On-Call Doctor">On-Call Doctor</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Emergency Bed</label>
                        <select name="emergencyBed">
                            <option value="">Assign Later</option>
                            <option value="ER-01">ER Bed 01</option>
                            <option value="ER-02">ER Bed 02</option>
                            <option value="ER-03">ER Bed 03</option>
                            <option value="ER-04">ER Bed 04</option>
                            <option value="Trauma-01">Trauma Bay 01</option>
                            <option value="Trauma-02">Trauma Bay 02</option>
                            <option value="Resuscitation">Resuscitation Bay</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-notes-medical"></i> Quick Medical History
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Known Allergies</label>
                        <input type="text" name="allergies" placeholder="Drug/Food allergies">
                    </div>
                    <div class="form-group">
                        <label>Current Medications</label>
                        <input type="text" name="currentMedications" placeholder="Any regular medications">
                    </div>
                </div>
                <div class="form-group">
                    <label>Relevant Medical History</label>
                    <input type="text" name="medicalHistory" placeholder="Diabetes, Hypertension, Heart Disease, etc.">
                </div>
            </div>
            
            <div class="form-group">
                <label>Initial Treatment Given</label>
                <textarea name="initialTreatment" rows="2" placeholder="Any first aid or treatment given before/upon arrival"></textarea>
            </div>
            
            <button type="submit" class="btn-danger" style="width: 100%; font-size: 16px; padding: 15px;">
                <i class="fas fa-ambulance"></i> Register Emergency Patient
            </button>
        </form>
    `;
}

function createOTForm() {
    return `
        <form onsubmit="submitOTForm(event)" class="settings-form">
            <div class="form-section-title">
                <i class="fas fa-user-injured"></i> Patient Information
            </div>
            <div class="form-group">
                <label>Patient Name<span class="required">*</span></label>
                <input type="text" name="patientName" id="otPatientName" list="patientsList" required placeholder="Type patient name...">
                <datalist id="patientsList"></datalist>
                <input type="hidden" name="patientId" id="otPatientId">
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-procedures"></i> Surgery Details
                </div>
                <div class="form-group">
                    <label>Procedure Name<span class="required">*</span></label>
                    <input type="text" name="procedure" required placeholder="e.g., Laparoscopic Cholecystectomy">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Procedure Code</label>
                        <input type="text" name="procedureCode" placeholder="ICD/CPT Code">
                    </div>
                    <div class="form-group">
                        <label>Surgery Type</label>
                        <select name="surgeryType">
                            <option value="Elective">Elective (Planned)</option>
                            <option value="Emergency">Emergency</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Pre-operative Diagnosis</label>
                    <input type="text" name="preOpDiagnosis" placeholder="Diagnosis before surgery">
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-user-md"></i> Surgical Team
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Primary Surgeon<span class="required">*</span></label>
                        <select name="surgeon" required>
                            <option value="">Select Surgeon</option>
                            <option value="Dr. Vikram Singh">Dr. Vikram Singh - General Surgery</option>
                            <option value="Dr. Suresh Reddy">Dr. Suresh Reddy - Orthopedics</option>
                            <option value="Dr. Priya Patel">Dr. Priya Patel - Cardiac Surgery</option>
                            <option value="Dr. Anjali Mehta">Dr. Anjali Mehta - OB/GYN</option>
                            <option value="Dr. Amit Verma">Dr. Amit Verma - Neurosurgery</option>
                            <option value="Dr. Rajesh Kumar">Dr. Rajesh Kumar - Urology</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Assistant Surgeon</label>
                        <select name="assistantSurgeon">
                            <option value="">None / To Be Assigned</option>
                            <option value="Dr. Neha Gupta">Dr. Neha Gupta</option>
                            <option value="Dr. Arun Kumar">Dr. Arun Kumar</option>
                            <option value="Dr. Sanjay Rao">Dr. Sanjay Rao</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Anesthesiologist<span class="required">*</span></label>
                        <select name="anesthesiologist" required>
                            <option value="">Select Anesthesiologist</option>
                            <option value="Dr. Ramesh Iyer">Dr. Ramesh Iyer</option>
                            <option value="Dr. Sunita Sharma">Dr. Sunita Sharma</option>
                            <option value="Dr. Deepak Joshi">Dr. Deepak Joshi</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Anesthesia Type</label>
                        <select name="anesthesiaType">
                            <option value="General">General Anesthesia</option>
                            <option value="Spinal">Spinal Anesthesia</option>
                            <option value="Epidural">Epidural</option>
                            <option value="Local">Local Anesthesia</option>
                            <option value="Regional">Regional Block</option>
                            <option value="Sedation">Conscious Sedation</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-calendar-alt"></i> Scheduling
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>OT Room<span class="required">*</span></label>
                        <select name="room" required>
                            <option value="">Select OT</option>
                            <option value="OT-1">OT-1 (Major Surgery)</option>
                            <option value="OT-2">OT-2 (Major Surgery)</option>
                            <option value="OT-3">OT-3 (Minor Surgery)</option>
                            <option value="OT-4">OT-4 (Cardiac)</option>
                            <option value="OT-5">OT-5 (Orthopedic)</option>
                            <option value="OT-6">OT-6 (OB/GYN)</option>
                            <option value="Emergency-OT">Emergency OT</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Duration (hours)<span class="required">*</span></label>
                        <select name="duration" required>
                            <option value="1">1 hour</option>
                            <option value="2" selected>2 hours</option>
                            <option value="3">3 hours</option>
                            <option value="4">4 hours</option>
                            <option value="5">5 hours</option>
                            <option value="6">6+ hours</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Date<span class="required">*</span></label>
                        <input type="date" name="date" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Time<span class="required">*</span></label>
                        <input type="time" name="time" required>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-clipboard-check"></i> Pre-operative Checklist
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="consentObtained" value="yes"> 
                            Informed Consent Obtained
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="npoClearance" value="yes"> 
                            NPO Clearance (Fasting)
                        </label>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="bloodReserved" value="yes"> 
                            Blood Reserved/Cross-matched
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="preopTests" value="yes"> 
                            Pre-op Tests Complete
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Special Instructions / Notes</label>
                <textarea name="notes" rows="2" placeholder="Any special requirements, allergies, implants needed, etc."></textarea>
            </div>
            
            <button type="submit" class="btn-primary">
                <i class="fas fa-calendar-check"></i> Schedule Surgery
            </button>
        </form>
    `;
}

function createLabForm() {
    return `
        <form onsubmit="submitLabForm(event)" class="settings-form">
            <div class="form-section-title">
                <i class="fas fa-user"></i> Patient Information
            </div>
            <div class="form-group">
                <label>Patient Name<span class="required">*</span></label>
                <input type="text" name="patientName" id="labPatientName" list="labPatientsList" required placeholder="Type patient name...">
                <datalist id="labPatientsList"></datalist>
                <input type="hidden" name="patientId" id="labPatientId">
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-vial"></i> Test Details
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Test Category<span class="required">*</span></label>
                        <select name="testCategory" id="labTestCategory" required onchange="updateLabTests()">
                            <option value="">Select Category</option>
                            <option value="Hematology">Hematology (Blood)</option>
                            <option value="Biochemistry">Biochemistry</option>
                            <option value="Microbiology">Microbiology</option>
                            <option value="Serology">Serology / Immunology</option>
                            <option value="Urinalysis">Urinalysis</option>
                            <option value="Pathology">Pathology / Histopathology</option>
                            <option value="Hormones">Hormones / Endocrine</option>
                            <option value="Cardiac">Cardiac Markers</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Test Name<span class="required">*</span></label>
                        <select name="testType" id="labTestType" required>
                            <option value="">Select Test</option>
                            <option value="CBC">Complete Blood Count (CBC)</option>
                            <option value="Blood Sugar Fasting">Blood Sugar - Fasting</option>
                            <option value="Blood Sugar PP">Blood Sugar - Post Prandial</option>
                            <option value="HbA1c">HbA1c (Glycated Hemoglobin)</option>
                            <option value="Lipid Profile">Lipid Profile</option>
                            <option value="Liver Function Test">Liver Function Test (LFT)</option>
                            <option value="Kidney Function Test">Kidney Function Test (KFT/RFT)</option>
                            <option value="Thyroid Profile">Thyroid Profile (T3/T4/TSH)</option>
                            <option value="Urine Routine">Urine Routine & Microscopy</option>
                            <option value="Serum Creatinine">Serum Creatinine</option>
                            <option value="Serum Electrolytes">Serum Electrolytes</option>
                            <option value="PT/INR">PT/INR (Coagulation)</option>
                            <option value="D-Dimer">D-Dimer</option>
                            <option value="Troponin">Troponin I/T</option>
                            <option value="CRP">C-Reactive Protein (CRP)</option>
                            <option value="ESR">ESR (Erythrocyte Sedimentation Rate)</option>
                            <option value="Blood Culture">Blood Culture</option>
                            <option value="Urine Culture">Urine Culture</option>
                            <option value="Dengue NS1">Dengue NS1 Antigen</option>
                            <option value="Malaria">Malaria (Rapid/Smear)</option>
                            <option value="HIV">HIV Screening</option>
                            <option value="HBsAg">Hepatitis B (HBsAg)</option>
                            <option value="HCV">Hepatitis C (Anti-HCV)</option>
                            <option value="COVID-19 RT-PCR">COVID-19 RT-PCR</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Sample Type</label>
                        <select name="sampleType">
                            <option value="Blood">Blood (Venous)</option>
                            <option value="Serum">Serum</option>
                            <option value="Plasma">Plasma</option>
                            <option value="Urine">Urine</option>
                            <option value="Stool">Stool</option>
                            <option value="Sputum">Sputum</option>
                            <option value="CSF">CSF (Cerebrospinal Fluid)</option>
                            <option value="Swab">Swab</option>
                            <option value="Tissue">Tissue Biopsy</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Priority<span class="required">*</span></label>
                        <select name="priority" required>
                            <option value="Routine">Routine (24-48 hrs)</option>
                            <option value="Urgent">Urgent (6-12 hrs)</option>
                            <option value="STAT">STAT (Within 1 hr)</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-user-md"></i> Ordering Information
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ordered By<span class="required">*</span></label>
                        <select name="orderedBy" required>
                            <option value="">Select Doctor</option>
                            <option value="Dr. Rajesh Sharma">Dr. Rajesh Sharma</option>
                            <option value="Dr. Priya Patel">Dr. Priya Patel</option>
                            <option value="Dr. Suresh Reddy">Dr. Suresh Reddy</option>
                            <option value="Dr. Anjali Mehta">Dr. Anjali Mehta</option>
                            <option value="Dr. Vikram Singh">Dr. Vikram Singh</option>
                            <option value="Dr. Neha Gupta">Dr. Neha Gupta</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <select name="department">
                            <option value="">Select Department</option>
                            <option value="OPD">OPD</option>
                            <option value="IPD">IPD</option>
                            <option value="Emergency">Emergency</option>
                            <option value="ICU">ICU</option>
                            <option value="Pre-Operative">Pre-Operative</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Clinical Indication / Notes</label>
                <textarea name="clinicalNotes" rows="2" placeholder="Reason for test, relevant clinical history..."></textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="fasting" value="yes"> 
                        Fasting Sample Required
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="homeCollection" value="yes"> 
                        Home Collection
                    </label>
                </div>
            </div>
            
            <button type="submit" class="btn-primary">
                <i class="fas fa-flask"></i> Order Lab Test
            </button>
        </form>
    `;
}

function createRadiologyForm() {
    return `
        <form onsubmit="submitRadiologyForm(event)" class="settings-form">
            <div class="form-section-title">
                <i class="fas fa-user"></i> Patient Information
            </div>
            <div class="form-group">
                <label>Patient Name<span class="required">*</span></label>
                <input type="text" name="patientName" id="radPatientName" list="radPatientsList" required placeholder="Type patient name...">
                <datalist id="radPatientsList"></datalist>
                <input type="hidden" name="patientId" id="radPatientId">
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-x-ray"></i> Imaging Details
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Imaging Modality<span class="required">*</span></label>
                        <select name="imagingType" required>
                            <option value="">Select Modality</option>
                            <option value="X-Ray">X-Ray (Digital)</option>
                            <option value="CT Scan">CT Scan</option>
                            <option value="MRI">MRI</option>
                            <option value="Ultrasound">Ultrasound / USG</option>
                            <option value="Mammography">Mammography</option>
                            <option value="Fluoroscopy">Fluoroscopy</option>
                            <option value="PET Scan">PET Scan</option>
                            <option value="DEXA Scan">DEXA Scan (Bone Density)</option>
                            <option value="Echocardiography">Echocardiography (2D Echo)</option>
                            <option value="Doppler">Doppler Study</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Body Part / Region<span class="required">*</span></label>
                        <select name="bodyPart" required>
                            <option value="">Select Body Part</option>
                            <option value="Head/Brain">Head / Brain</option>
                            <option value="Chest">Chest</option>
                            <option value="Abdomen">Abdomen</option>
                            <option value="Pelvis">Pelvis</option>
                            <option value="Spine - Cervical">Spine - Cervical</option>
                            <option value="Spine - Thoracic">Spine - Thoracic</option>
                            <option value="Spine - Lumbar">Spine - Lumbar / LS</option>
                            <option value="Upper Limb">Upper Limb</option>
                            <option value="Lower Limb">Lower Limb</option>
                            <option value="Knee">Knee</option>
                            <option value="Hip">Hip</option>
                            <option value="Shoulder">Shoulder</option>
                            <option value="Whole Body">Whole Body</option>
                            <option value="Other">Other (specify in notes)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Laterality</label>
                        <select name="laterality">
                            <option value="NA">Not Applicable</option>
                            <option value="Left">Left</option>
                            <option value="Right">Right</option>
                            <option value="Bilateral">Bilateral</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Contrast Required</label>
                        <select name="contrastUsed">
                            <option value="No">No Contrast</option>
                            <option value="Yes - Oral">Yes - Oral Contrast</option>
                            <option value="Yes - IV">Yes - IV Contrast</option>
                            <option value="Yes - Both">Yes - Both</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-user-md"></i> Ordering Information
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ordered By<span class="required">*</span></label>
                        <select name="orderedBy" required>
                            <option value="">Select Doctor</option>
                            <option value="Dr. Rajesh Sharma">Dr. Rajesh Sharma</option>
                            <option value="Dr. Priya Patel">Dr. Priya Patel</option>
                            <option value="Dr. Suresh Reddy">Dr. Suresh Reddy</option>
                            <option value="Dr. Anjali Mehta">Dr. Anjali Mehta</option>
                            <option value="Dr. Vikram Singh">Dr. Vikram Singh</option>
                            <option value="Dr. Amit Verma">Dr. Amit Verma</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Priority<span class="required">*</span></label>
                        <select name="priority" required>
                            <option value="Routine">Routine (24-48 hrs)</option>
                            <option value="Urgent">Urgent (Same Day)</option>
                            <option value="STAT">STAT / Emergency</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Preferred Date</label>
                        <input type="date" name="scheduledDate" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Preferred Time</label>
                        <input type="time" name="scheduledTime">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Clinical Indication<span class="required">*</span></label>
                <textarea name="clinicalIndication" rows="2" placeholder="Reason for imaging, relevant symptoms, provisional diagnosis..." required></textarea>
            </div>
            
            <div class="form-group">
                <label>Special Instructions</label>
                <textarea name="specialInstructions" rows="2" placeholder="Any special requirements, allergies to contrast, claustrophobia, etc."></textarea>
            </div>
            
            <button type="submit" class="btn-primary">
                <i class="fas fa-x-ray"></i> Order Imaging
            </button>
        </form>
    `;
}

function createPrescriptionForm() {
    return `
        <form onsubmit="submitPrescriptionForm(event)" class="settings-form">
            <div class="form-section-title">
                <i class="fas fa-user"></i> Patient Information
            </div>
            <div class="form-group">
                <label>Patient Name<span class="required">*</span></label>
                <input type="text" name="patientName" id="rxPatientName" list="rxPatientsList" required placeholder="Type patient name...">
                <datalist id="rxPatientsList"></datalist>
                <input type="hidden" name="patientId" id="rxPatientId">
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-user-md"></i> Prescribing Doctor
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Doctor<span class="required">*</span></label>
                        <select name="doctor" required>
                            <option value="">Select Doctor</option>
                            <option value="Dr. Rajesh Sharma">Dr. Rajesh Sharma</option>
                            <option value="Dr. Priya Patel">Dr. Priya Patel</option>
                            <option value="Dr. Suresh Reddy">Dr. Suresh Reddy</option>
                            <option value="Dr. Anjali Mehta">Dr. Anjali Mehta</option>
                            <option value="Dr. Vikram Singh">Dr. Vikram Singh</option>
                            <option value="Dr. Neha Gupta">Dr. Neha Gupta</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Diagnosis</label>
                        <input type="text" name="diagnosis" placeholder="Primary diagnosis">
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-pills"></i> Medications
                </div>
                <div id="medicationsList">
                    <div class="medication-item">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Medicine 1<span class="required">*</span></label>
                                <input type="text" name="medicine1" placeholder="Medicine name" required list="commonMedicines">
                                <datalist id="commonMedicines">
                                    <option value="Paracetamol 500mg">
                                    <option value="Paracetamol 650mg">
                                    <option value="Ibuprofen 400mg">
                                    <option value="Amoxicillin 500mg">
                                    <option value="Azithromycin 500mg">
                                    <option value="Cefixime 200mg">
                                    <option value="Metformin 500mg">
                                    <option value="Amlodipine 5mg">
                                    <option value="Atorvastatin 10mg">
                                    <option value="Omeprazole 20mg">
                                    <option value="Pantoprazole 40mg">
                                    <option value="Cetirizine 10mg">
                                    <option value="Montelukast 10mg">
                                    <option value="Vitamin D3 60000 IU">
                                    <option value="Multivitamin">
                                </datalist>
                            </div>
                            <div class="form-group">
                                <label>Dosage<span class="required">*</span></label>
                                <select name="dosage1" required>
                                    <option value="">Select</option>
                                    <option value="1-0-0">1-0-0 (Morning only)</option>
                                    <option value="0-0-1">0-0-1 (Night only)</option>
                                    <option value="1-0-1">1-0-1 (Morning & Night)</option>
                                    <option value="1-1-1">1-1-1 (Thrice daily)</option>
                                    <option value="1-1-1-1">1-1-1-1 (Four times)</option>
                                    <option value="0-1-0">0-1-0 (Afternoon only)</option>
                                    <option value="SOS">SOS (As needed)</option>
                                    <option value="Once Weekly">Once Weekly</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Duration</label>
                                <select name="duration1">
                                    <option value="3 days">3 days</option>
                                    <option value="5 days">5 days</option>
                                    <option value="7 days">7 days</option>
                                    <option value="10 days">10 days</option>
                                    <option value="14 days">14 days</option>
                                    <option value="1 month">1 month</option>
                                    <option value="3 months">3 months</option>
                                    <option value="Continuous">Continuous</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Timing</label>
                                <select name="timing1">
                                    <option value="After Food">After Food</option>
                                    <option value="Before Food">Before Food</option>
                                    <option value="With Food">With Food</option>
                                    <option value="Empty Stomach">Empty Stomach</option>
                                    <option value="At Bedtime">At Bedtime</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="medication-item">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Medicine 2</label>
                                <input type="text" name="medicine2" placeholder="Medicine name" list="commonMedicines">
                            </div>
                            <div class="form-group">
                                <label>Dosage</label>
                                <select name="dosage2">
                                    <option value="">Select</option>
                                    <option value="1-0-0">1-0-0 (Morning only)</option>
                                    <option value="0-0-1">0-0-1 (Night only)</option>
                                    <option value="1-0-1">1-0-1 (Morning & Night)</option>
                                    <option value="1-1-1">1-1-1 (Thrice daily)</option>
                                    <option value="SOS">SOS (As needed)</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Duration</label>
                                <select name="duration2">
                                    <option value="">Select</option>
                                    <option value="3 days">3 days</option>
                                    <option value="5 days">5 days</option>
                                    <option value="7 days">7 days</option>
                                    <option value="14 days">14 days</option>
                                    <option value="1 month">1 month</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Timing</label>
                                <select name="timing2">
                                    <option value="After Food">After Food</option>
                                    <option value="Before Food">Before Food</option>
                                    <option value="At Bedtime">At Bedtime</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="medication-item">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Medicine 3</label>
                                <input type="text" name="medicine3" placeholder="Medicine name" list="commonMedicines">
                            </div>
                            <div class="form-group">
                                <label>Dosage</label>
                                <select name="dosage3">
                                    <option value="">Select</option>
                                    <option value="1-0-0">1-0-0 (Morning only)</option>
                                    <option value="0-0-1">0-0-1 (Night only)</option>
                                    <option value="1-0-1">1-0-1 (Morning & Night)</option>
                                    <option value="1-1-1">1-1-1 (Thrice daily)</option>
                                    <option value="SOS">SOS (As needed)</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Duration</label>
                                <select name="duration3">
                                    <option value="">Select</option>
                                    <option value="3 days">3 days</option>
                                    <option value="5 days">5 days</option>
                                    <option value="7 days">7 days</option>
                                    <option value="14 days">14 days</option>
                                    <option value="1 month">1 month</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Timing</label>
                                <select name="timing3">
                                    <option value="After Food">After Food</option>
                                    <option value="Before Food">Before Food</option>
                                    <option value="At Bedtime">At Bedtime</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-clipboard-list"></i> Additional Instructions
                </div>
                <div class="form-group">
                    <label>Special Instructions</label>
                    <textarea name="instructions" rows="3" placeholder="Diet advice, precautions, follow-up instructions..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Follow-up After</label>
                        <select name="followUp">
                            <option value="">No follow-up specified</option>
                            <option value="3 days">3 days</option>
                            <option value="1 week">1 week</option>
                            <option value="2 weeks">2 weeks</option>
                            <option value="1 month">1 month</option>
                            <option value="3 months">3 months</option>
                            <option value="SOS">If symptoms persist</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tests Advised</label>
                        <input type="text" name="testsAdvised" placeholder="e.g., CBC, Blood Sugar">
                    </div>
                </div>
            </div>
            
            <button type="submit" class="btn-primary">
                <i class="fas fa-prescription"></i> Create Prescription
            </button>
        </form>
    `;
}

function createBillForm() {
    return `
        <form onsubmit="submitBillForm(event)" class="settings-form">
            <div class="form-section-title">
                <i class="fas fa-user"></i> Patient Information
            </div>
            <div class="form-group">
                <label>Patient Name<span class="required">*</span></label>
                <input type="text" name="patientName" id="billPatientName" list="billPatientsList" required placeholder="Type patient name...">
                <datalist id="billPatientsList"></datalist>
                <input type="hidden" name="patientId" id="billPatientId">
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-receipt"></i> Bill Items
                </div>
                <div id="billItemsList">
                    <div class="bill-item">
                        <div class="form-row-3">
                            <div class="form-group">
                                <label>Service/Item<span class="required">*</span></label>
                                <select name="service1" required onchange="updateBillAmount(this)">
                                    <option value="">Select Service</option>
                                    <optgroup label="Consultation">
                                        <option value="OPD Consultation" data-amount="500">OPD Consultation - ₹500</option>
                                        <option value="Specialist Consultation" data-amount="800">Specialist Consultation - ₹800</option>
                                        <option value="Emergency Consultation" data-amount="1000">Emergency Consultation - ₹1000</option>
                                    </optgroup>
                                    <optgroup label="Room Charges">
                                        <option value="General Ward (per day)" data-amount="500">General Ward (per day) - ₹500</option>
                                        <option value="Semi-Private Room (per day)" data-amount="1500">Semi-Private Room (per day) - ₹1500</option>
                                        <option value="Private Room (per day)" data-amount="3000">Private Room (per day) - ₹3000</option>
                                        <option value="ICU (per day)" data-amount="8000">ICU (per day) - ₹8000</option>
                                    </optgroup>
                                    <optgroup label="Lab Tests">
                                        <option value="CBC" data-amount="350">CBC - ₹350</option>
                                        <option value="Blood Sugar" data-amount="150">Blood Sugar - ₹150</option>
                                        <option value="Lipid Profile" data-amount="600">Lipid Profile - ₹600</option>
                                        <option value="Thyroid Profile" data-amount="800">Thyroid Profile - ₹800</option>
                                        <option value="LFT" data-amount="700">Liver Function Test - ₹700</option>
                                        <option value="KFT" data-amount="600">Kidney Function Test - ₹600</option>
                                    </optgroup>
                                    <optgroup label="Imaging">
                                        <option value="X-Ray" data-amount="400">X-Ray - ₹400</option>
                                        <option value="Ultrasound" data-amount="800">Ultrasound - ₹800</option>
                                        <option value="CT Scan" data-amount="4000">CT Scan - ₹4000</option>
                                        <option value="MRI" data-amount="8000">MRI - ₹8000</option>
                                        <option value="ECG" data-amount="300">ECG - ₹300</option>
                                        <option value="2D Echo" data-amount="1500">2D Echo - ₹1500</option>
                                    </optgroup>
                                    <optgroup label="Procedures">
                                        <option value="Dressing" data-amount="200">Dressing - ₹200</option>
                                        <option value="Injection" data-amount="100">Injection - ₹100</option>
                                        <option value="Minor Procedure" data-amount="2000">Minor Procedure - ₹2000</option>
                                    </optgroup>
                                    <optgroup label="Other">
                                        <option value="Pharmacy" data-amount="0">Pharmacy (Enter amount)</option>
                                        <option value="Other" data-amount="0">Other (Enter amount)</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Quantity</label>
                                <input type="number" name="quantity1" value="1" min="1" onchange="updateTotalBill()">
                            </div>
                            <div class="form-group">
                                <label>Amount (₹)<span class="required">*</span></label>
                                <input type="number" name="amount1" required step="0.01" min="0" onchange="updateTotalBill()">
                            </div>
                        </div>
                    </div>
                    
                    <div class="bill-item">
                        <div class="form-row-3">
                            <div class="form-group">
                                <label>Service/Item 2</label>
                                <select name="service2" onchange="updateBillAmount(this)">
                                    <option value="">Add another item...</option>
                                    <optgroup label="Lab Tests">
                                        <option value="CBC" data-amount="350">CBC - ₹350</option>
                                        <option value="Blood Sugar" data-amount="150">Blood Sugar - ₹150</option>
                                        <option value="Lipid Profile" data-amount="600">Lipid Profile - ₹600</option>
                                    </optgroup>
                                    <optgroup label="Imaging">
                                        <option value="X-Ray" data-amount="400">X-Ray - ₹400</option>
                                        <option value="Ultrasound" data-amount="800">Ultrasound - ₹800</option>
                                    </optgroup>
                                    <optgroup label="Other">
                                        <option value="Pharmacy" data-amount="0">Pharmacy</option>
                                        <option value="Other" data-amount="0">Other</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Quantity</label>
                                <input type="number" name="quantity2" value="1" min="1" onchange="updateTotalBill()">
                            </div>
                            <div class="form-group">
                                <label>Amount (₹)</label>
                                <input type="number" name="amount2" step="0.01" min="0" onchange="updateTotalBill()">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="fee-display" id="billSummary">
                    <div class="fee-item">
                        <span>Subtotal:</span>
                        <span id="billSubtotal">₹0.00</span>
                    </div>
                    <div class="fee-item">
                        <span>Discount:</span>
                        <span id="billDiscount">₹0.00</span>
                    </div>
                    <div class="fee-item">
                        <span><strong>Total Amount:</strong></span>
                        <span id="billTotal"><strong>₹0.00</strong></span>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-section-title">
                    <i class="fas fa-money-bill-wave"></i> Payment Details
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Discount (%)</label>
                        <input type="number" name="discountPercent" value="0" min="0" max="100" onchange="updateTotalBill()">
                    </div>
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select name="paymentMethod">
                            <option value="">Pending Payment</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card (Credit/Debit)</option>
                            <option value="UPI">UPI</option>
                            <option value="NEFT">NEFT/Bank Transfer</option>
                            <option value="Insurance">Insurance (Cashless)</option>
                            <option value="Insurance - Reimbursement">Insurance (Reimbursement)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Insurance Provider</label>
                        <select name="insuranceProvider">
                            <option value="">No Insurance</option>
                            <option value="Star Health">Star Health</option>
                            <option value="ICICI Lombard">ICICI Lombard</option>
                            <option value="HDFC ERGO">HDFC ERGO</option>
                            <option value="Max Bupa">Max Bupa</option>
                            <option value="Bajaj Allianz">Bajaj Allianz</option>
                            <option value="CGHS">CGHS</option>
                            <option value="ESIC">ESIC</option>
                            <option value="Ayushman Bharat">Ayushman Bharat</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Policy/Claim Number</label>
                        <input type="text" name="policyNumber" placeholder="For insurance claims">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Notes</label>
                <textarea name="notes" rows="2" placeholder="Any additional notes for the bill..."></textarea>
            </div>
            
            <button type="submit" class="btn-primary">
                <i class="fas fa-file-invoice-dollar"></i> Generate Bill
            </button>
        </form>
    `;
}

function createClaimForm() {
    return `
        <form onsubmit="submitClaimForm(event)" class="settings-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Patient Name <span class="required">*</span></label>
                    <input type="text" name="patient" placeholder="Enter patient name" required>
                </div>
                <div class="form-group">
                    <label>Insurance Provider <span class="required">*</span></label>
                    <select name="provider" required>
                        <option value="">Select Provider</option>
                        <option value="Star Health">Star Health</option>
                        <option value="HDFC Ergo">HDFC Ergo</option>
                        <option value="ICICI Lombard">ICICI Lombard</option>
                        <option value="New India Assurance">New India Assurance</option>
                        <option value="Max Bupa">Max Bupa</option>
                        <option value="Bajaj Allianz">Bajaj Allianz</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Policy Number <span class="required">*</span></label>
                    <input type="text" name="policyNo" placeholder="e.g., SH-2024-001" required>
                </div>
                <div class="form-group">
                    <label>Claim Amount (₹) <span class="required">*</span></label>
                    <input type="number" name="claimAmount" placeholder="Enter amount" min="1" required>
                </div>
            </div>
            <div class="form-group">
                <label>Diagnosis / Treatment</label>
                <textarea name="diagnosis" placeholder="Brief description of treatment"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-paper-plane"></i> Submit Claim</button>
            </div>
        </form>
    `;
}

function createStaffForm() {
    return `
        <form onsubmit="submitStaffForm(event)" class="settings-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Full Name <span class="required">*</span></label>
                    <input type="text" name="name" placeholder="Enter full name" required>
                </div>
                <div class="form-group">
                    <label>Employee ID <span class="required">*</span></label>
                    <input type="text" name="empId" placeholder="e.g., EMP-001" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Department <span class="required">*</span></label>
                    <select name="dept" required>
                        <option value="">Select Department</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="General Medicine">General Medicine</option>
                        <option value="Surgery">Surgery</option>
                        <option value="ICU">ICU</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Radiology">Radiology</option>
                        <option value="Lab">Lab</option>
                        <option value="Admin">Admin</option>
                        <option value="Housekeeping">Housekeeping</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Designation <span class="required">*</span></label>
                    <select name="designation" required>
                        <option value="">Select Designation</option>
                        <option value="HOD">HOD</option>
                        <option value="Senior Consultant">Senior Consultant</option>
                        <option value="Consultant">Consultant</option>
                        <option value="Junior Doctor">Junior Doctor</option>
                        <option value="Head Nurse">Head Nurse</option>
                        <option value="Staff Nurse">Staff Nurse</option>
                        <option value="Senior Pharmacist">Senior Pharmacist</option>
                        <option value="Pharmacist">Pharmacist</option>
                        <option value="Lab Technician">Lab Technician</option>
                        <option value="Radiologist">Radiologist</option>
                        <option value="Receptionist">Receptionist</option>
                        <option value="Admin Officer">Admin Officer</option>
                        <option value="Security">Security</option>
                        <option value="Housekeeping Staff">Housekeeping Staff</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Contact Number <span class="required">*</span></label>
                    <input type="tel" name="contact" placeholder="10-digit mobile" pattern="[0-9]{10}" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" placeholder="email@example.com">
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="Active" selected>Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Resigned">Resigned</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-user-plus"></i> Add Staff</button>
            </div>
        </form>
    `;
}

function createInventoryForm() {
    return `
        <form onsubmit="submitInventoryForm(event)" class="settings-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Item Code <span class="required">*</span></label>
                    <input type="text" name="itemCode" placeholder="e.g., MED-001" required>
                </div>
                <div class="form-group">
                    <label>Item Name <span class="required">*</span></label>
                    <input type="text" name="itemName" placeholder="Enter item name" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Category <span class="required">*</span></label>
                    <select name="category" required>
                        <option value="">Select Category</option>
                        <option value="Medicines">Medicines</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Consumables">Consumables</option>
                        <option value="Linens">Linens</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unit</label>
                    <select name="unit">
                        <option value="Pieces">Pieces</option>
                        <option value="Boxes">Boxes</option>
                        <option value="Bottles">Bottles</option>
                        <option value="Strips">Strips</option>
                        <option value="Packets">Packets</option>
                        <option value="Liters">Liters</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Current Stock <span class="required">*</span></label>
                    <input type="number" name="currentStock" placeholder="0" min="0" required>
                </div>
                <div class="form-group">
                    <label>Reorder Level <span class="required">*</span></label>
                    <input type="number" name="reorderLevel" placeholder="Minimum stock" min="0" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Unit Price (₹)</label>
                    <input type="number" name="unitPrice" placeholder="0.00" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Supplier</label>
                    <input type="text" name="supplier" placeholder="Supplier name">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary"><i class="fas fa-plus"></i> Add Item</button>
            </div>
        </form>
    `;
}

// Populate Recent Activities
async function populateRecentActivities() {
    // Recent Admissions - will be populated by updateDashboardStats from API
    const recentAdmissions = document.getElementById('recentAdmissions');
    if (recentAdmissions && recentAdmissions.innerHTML.trim() === '') {
        recentAdmissions.innerHTML = `
            <div class="activity-item">
                <strong>Loading...</strong><br>
                <small>Fetching recent admissions</small>
            </div>
        `;
    }
    
    // Critical Alerts - dynamic based on current data
    const criticalAlerts = document.getElementById('criticalAlerts');
    if (criticalAlerts) {
        const alerts = [];
        
        // Check for critical beds
        try {
            const bedStats = await api.getBedStats();
            if (bedStats.success && bedStats.data.critical > 0) {
                alerts.push({
                    title: `ICU Alert:`,
                    message: `${bedStats.data.critical} patients in critical condition`,
                    time: 'Now'
                });
            }
        } catch (e) {}
        
        // Check inventory from localStorage
        const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        const lowStock = inventory.filter(i => (i.stock || i.quantity || 0) < 20);
        if (lowStock.length > 0) {
            alerts.push({
                title: 'Pharmacy:',
                message: `${lowStock.length} medicines low on stock`,
                time: '15 minutes ago'
            });
        }
        
        // Check pending labs
        try {
            const stats = await api.getStats();
            if (stats.success && stats.data.pendingLabTests > 10) {
                alerts.push({
                    title: 'Laboratory:',
                    message: `${stats.data.pendingLabTests} test results pending`,
                    time: '30 minutes ago'
                });
            }
        } catch (e) {}
        
        // Default alerts if none
        if (alerts.length === 0) {
            alerts.push(
                { title: 'System:', message: 'All systems operational', time: 'Now' },
                { title: 'Equipment:', message: 'Scheduled maintenance due this week', time: '1 hour ago' },
                { title: 'Staff:', message: 'Shift change at 2:00 PM', time: '2 hours ago' }
            );
        }
        
        criticalAlerts.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <strong>${alert.title}</strong> ${alert.message}<br>
                <small>${alert.time}</small>
            </div>
        `).join('');
    }
}

// Form Submission Functions
async function submitOPDForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Build comprehensive OPD patient data matching seeder.js format
    const patientData = {
        name: formData.get('name'),
        age: parseInt(formData.get('age')) || 0,
        gender: formData.get('gender'),
        contact: formData.get('contact') || '',
        email: formData.get('email') || '',
        address: formData.get('address') || '',
        bloodGroup: formData.get('bloodGroup') || '',
        aadharNumber: formData.get('aadharNumber') || '',
        type: 'OPD',
        department: formData.get('department'),
        doctor: formData.get('doctor'),
        status: 'Waiting',  // Match seeder.js - Waiting or Consulting
        
        // Consultation details - seeder uses 'diagnosis' field
        diagnosis: formData.get('symptoms') || '',
        symptoms: formData.get('symptoms') || '',
        consultationFee: formData.get('consultationFee') ? parseFloat(formData.get('consultationFee')) : 500,
        appointmentTime: formData.get('appointmentTime') || '',
        
        // Quick medical history
        allergies: formData.get('allergies') ? formData.get('allergies').split(',').map(a => a.trim()).filter(a => a) : [],
        chronicConditions: formData.get('chronicConditions') ? formData.get('chronicConditions').split(',').map(c => c.trim()).filter(c => c) : [],
        currentMedications: formData.get('currentMedications') ? formData.get('currentMedications').split(',').map(m => m.trim()).filter(m => m) : [],
        
        // Insurance (optional for OPD)
        insurance: {
            provider: formData.get('insuranceProvider') || '',
            policyNumber: formData.get('insurancePolicyNumber') || ''
        }
    };
    
    try {
        const response = await api.createPatient(patientData);
        
        if (response.success) {
            closeModal();
            
            // Reload table data
            await loadTableData();
            await updateDashboardStats();
            
            if (typeof toast !== 'undefined') {
                toast.show(`OPD Patient ${response.data.name} registered! ID: ${response.data.patientId}`, 'success');
            } else {
                alert('Patient registered successfully!');
            }
        } else {
            throw new Error(response.error || 'Failed to register patient');
        }
    } catch (error) {
        console.error('Error registering patient:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to register patient', 'error');
        } else {
            alert('Failed to register patient: ' + error.message);
        }
    }
}

async function submitIPDForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Build comprehensive patient data object
    const patientData = {
        name: formData.get('name'),
        age: parseInt(formData.get('age')) || 0,
        gender: formData.get('gender'),
        contact: formData.get('contact'),
        email: formData.get('email') || '',
        address: formData.get('address') || '',
        bloodGroup: formData.get('bloodGroup') || '',
        aadharNumber: formData.get('aadharNumber') || '',
        type: 'IPD',
        // seeder.js uses 'ward' and 'bed' fields for IPD
        ward: formData.get('roomType'),
        bed: formData.get('bedNumber'),
        roomType: formData.get('roomType'),
        bedNumber: formData.get('bedNumber'),
        department: formData.get('department'),
        diagnosis: formData.get('diagnosis'),
        doctor: formData.get('doctor'),
        status: 'Active',  // Match seeder.js - Active not Admitted
        admissionDate: new Date(),  // Match seeder.js format
        
        // Emergency contact
        emergencyContact: {
            name: formData.get('emergencyContactName') || '',
            relationship: formData.get('emergencyContactRelation') || '',
            phone: formData.get('emergencyContactPhone') || ''
        },
        
        // Vitals
        vitals: {
            bloodPressure: formData.get('vitalsBP') || '',
            heartRate: formData.get('vitalsHR') ? parseInt(formData.get('vitalsHR')) : null,
            temperature: formData.get('vitalsTemp') ? parseFloat(formData.get('vitalsTemp')) : null,
            oxygenSaturation: formData.get('vitalsO2') ? parseInt(formData.get('vitalsO2')) : null
        },
        
        // Medical history
        allergies: formData.get('allergies') ? formData.get('allergies').split(',').map(a => a.trim()).filter(a => a) : [],
        chronicConditions: formData.get('chronicConditions') ? formData.get('chronicConditions').split(',').map(c => c.trim()).filter(c => c) : [],
        currentMedications: formData.get('currentMedications') ? formData.get('currentMedications').split(',').map(m => m.trim()).filter(m => m) : [],
        
        // Insurance
        insurance: {
            provider: formData.get('insuranceProvider') || '',
            policyNumber: formData.get('insurancePolicyNumber') || ''
        },
        
        // Admission details
        admissionType: formData.get('admissionType') || 'Planned',
        expectedStay: formData.get('expectedStay') || '',
        advanceDeposit: formData.get('advanceDeposit') ? parseFloat(formData.get('advanceDeposit')) : 0,
        paymentMode: formData.get('paymentMode') || 'Cash'
    };
    
    try {
        const response = await api.createPatient(patientData);
        
        closeModal();
        loadTableData();
        updateDashboardStats();
        
        if (response.success) {
            if (typeof toast !== 'undefined') {
                toast.show(`Patient ${response.data.name} admitted to ${patientData.ward} - Bed ${patientData.bed}`, 'success');
            } else {
                alert('Patient admitted successfully!');
            }
        } else {
            throw new Error(response.error || 'Failed to admit patient');
        }
        
    } catch (error) {
        console.error('Error admitting patient:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to admit patient', 'error');
        } else {
            alert('Failed to admit patient');
        }
    }
}

async function submitEmergencyForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Build comprehensive emergency patient data
    const patientData = {
        name: formData.get('name'),
        age: parseInt(formData.get('age')) || 0,
        gender: formData.get('gender'),
        contact: formData.get('contact') || '',
        bloodGroup: formData.get('bloodGroup') || '',
        type: 'Emergency',
        department: 'Emergency',  // Match seeder.js format
        status: 'Active',  // Match seeder.js - use Active not Admitted
        
        // Emergency details
        severity: formData.get('severity'),
        diagnosis: formData.get('complaint'),  // seeder uses 'diagnosis' not 'symptoms'
        symptoms: formData.get('complaint'),
        modeOfInjury: formData.get('modeOfInjury') || '',
        broughtBy: formData.get('broughtBy') || '',
        
        // Emergency contact
        emergencyContact: {
            phone: formData.get('emergencyContactPhone') || ''
        },
        
        // Vitals - critical for emergency
        vitals: {
            bloodPressure: formData.get('vitalsBP') || '',
            heartRate: formData.get('vitalsHR') ? parseInt(formData.get('vitalsHR')) : null,
            temperature: formData.get('vitalsTemp') ? parseFloat(formData.get('vitalsTemp')) : null,
            oxygenSaturation: formData.get('vitalsO2') ? parseInt(formData.get('vitalsO2')) : null,
            respiratoryRate: formData.get('vitalsRR') ? parseInt(formData.get('vitalsRR')) : null
        },
        
        // Consciousness and GCS
        gcsScore: formData.get('gcsScore') ? parseInt(formData.get('gcsScore')) : null,
        consciousness: formData.get('consciousness') || 'Alert',
        
        // Assignment
        doctor: formData.get('doctor'),
        bedNumber: formData.get('emergencyBed') || '',
        roomType: 'Emergency',
        
        // Quick medical history
        allergies: formData.get('allergies') ? formData.get('allergies').split(',').map(a => a.trim()).filter(a => a) : [],
        currentMedications: formData.get('currentMedications') ? formData.get('currentMedications').split(',').map(m => m.trim()).filter(m => m) : [],
        medicalHistory: formData.get('medicalHistory') || '',
        
        // Initial treatment
        initialTreatment: formData.get('initialTreatment') || ''
    };
    
    try {
        const newPatient = await api.createPatient(patientData);
        
        closeModal();
        loadTableData();
        updateDashboardStats();
        
        // Show severity-based message
        const severityMsg = patientData.severity === 'Critical' 
            ? '🚨 CRITICAL PATIENT' 
            : patientData.severity === 'High' 
            ? '⚠️ HIGH PRIORITY' 
            : '';
        
        if (typeof toast !== 'undefined') {
            toast.show(`${severityMsg} Emergency patient ${newPatient.name} registered! Assigned to ${patientData.doctor}`, 
                patientData.severity === 'Critical' ? 'error' : 'success');
        } else {
            alert('Emergency patient registered successfully!');
        }
        
    } catch (error) {
        console.error('Error registering emergency patient:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to register emergency patient', 'error');
        } else {
            alert('Failed to register emergency patient');
        }
    }
}

async function submitOTForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const patientId = formData.get('patientId');
    if (!patientId) {
        if (typeof toast !== 'undefined') {
            toast.show('Please select a valid patient from the list', 'error');
        } else {
            alert('Please select a valid patient');
        }
        return;
    }
    
    // Format time to readable format (e.g., "09:00 AM")
    const timeValue = formData.get('time');
    let formattedTime = timeValue;
    if (timeValue) {
        const [hours, minutes] = timeValue.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        formattedTime = `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    }
    
    // Match seeder.js surgery data structure exactly
    const surgeryData = {
        patient: patientId,
        patientName: formData.get('patientName'),
        procedure: formData.get('procedure'),
        procedureCode: formData.get('procedureCode') || '',
        surgeon: formData.get('surgeon'),
        assistantSurgeon: formData.get('assistantSurgeon') || '',
        anesthesiologist: formData.get('anesthesiologist') || '',
        anesthesiaType: formData.get('anesthesiaType') || 'General',
        otRoom: formData.get('room'),
        surgeryDate: formData.get('date'),
        surgeryTime: formattedTime,
        estimatedDuration: formData.get('duration') + ' hours',
        preOpDiagnosis: formData.get('preOpDiagnosis') || '',
        status: 'Scheduled',
        priority: formData.get('surgeryType') || 'Elective',
        consent: {
            signed: formData.get('consentObtained') === 'yes',
            signedAt: formData.get('consentObtained') === 'yes' ? new Date() : null
        },
        surgeryNotes: formData.get('notes') || ''
    };
    
    try {
        const response = await api.createSurgery(surgeryData);
        
        if (response.success) {
            closeModal();
            await loadTableData();
            await updateDashboardStats();
            
            if (typeof toast !== 'undefined') {
                toast.show(`Surgery scheduled for ${surgeryData.patientName}!`, 'success');
            } else {
                alert('Surgery scheduled successfully!');
            }
        } else {
            throw new Error(response.error || 'Failed to schedule surgery');
        }
    } catch (error) {
        console.error('Error scheduling surgery:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to schedule surgery', 'error');
        } else {
            alert('Failed to schedule surgery: ' + error.message);
        }
    }
}

async function submitLabForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const patientId = formData.get('patientId');
    if (!patientId) {
        if (typeof toast !== 'undefined') {
            toast.show('Please select a valid patient from the list', 'error');
        } else {
            alert('Please select a valid patient');
        }
        return;
    }
    
    // Match seeder.js lab test data structure exactly
    const testData = {
        patient: patientId,
        patientName: formData.get('patientName'),
        testType: formData.get('testType'),
        testCategory: formData.get('testCategory') || 'Other',
        orderedBy: formData.get('orderedBy'),
        priority: formData.get('priority') || 'Routine',
        status: 'Pending',
        sampleType: formData.get('sampleType') || 'Blood',
        orderDate: new Date(),
        remarks: formData.get('clinicalNotes') || ''
    };
    
    try {
        const response = await api.createLabTest(testData);
        if (response.success) {
            closeModal();
            await loadTableData();
            await updateDashboardStats();
            if (typeof toast !== 'undefined') {
                toast.show('Lab test ordered successfully!', 'success');
            }
        } else {
            throw new Error(response.error || 'Failed to order lab test');
        }
    } catch (error) {
        console.error('Error ordering lab test:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to order lab test', 'error');
        }
    }
}

async function submitRadiologyForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const patientId = formData.get('patientId');
    if (!patientId) {
        if (typeof toast !== 'undefined') {
            toast.show('Please select a valid patient from the list', 'error');
        } else {
            alert('Please select a valid patient');
        }
        return;
    }
    
    // Parse contrast used field
    const contrastValue = formData.get('contrastUsed');
    const contrastUsed = contrastValue && contrastValue !== 'No';
    const contrastType = contrastUsed ? contrastValue.replace('Yes - ', '') : '';
    
    // Match seeder.js imaging data structure exactly
    const orderData = {
        patient: patientId,
        patientName: formData.get('patientName'),
        imagingType: formData.get('imagingType'),
        bodyPart: formData.get('bodyPart'),
        laterality: formData.get('laterality') || 'N/A',
        orderedBy: formData.get('orderedBy'),
        clinicalIndication: formData.get('clinicalIndication') || '',
        priority: formData.get('priority') || 'Routine',
        status: 'Scheduled',
        contrastUsed: contrastUsed,
        contrastType: contrastType,
        orderDate: new Date(),
        scheduledTime: formData.get('scheduledDate') && formData.get('scheduledTime') 
            ? new Date(formData.get('scheduledDate') + 'T' + formData.get('scheduledTime'))
            : null,
        recommendations: formData.get('specialInstructions') || ''
    };
    
    try {
        const response = await api.createImagingOrder(orderData);
        if (response.success) {
            closeModal();
            await loadTableData();
            if (typeof toast !== 'undefined') {
                toast.show('Imaging order created successfully!', 'success');
            }
        } else {
            throw new Error(response.error || 'Failed to create imaging order');
        }
    } catch (error) {
        console.error('Error creating imaging order:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to create imaging order', 'error');
        }
    }
}

async function submitPrescriptionForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const patientId = formData.get('patientId');
    if (!patientId) {
        if (typeof toast !== 'undefined') {
            toast.show('Please select a valid patient from the list', 'error');
        } else {
            alert('Please select a valid patient');
        }
        return;
    }
    
    // Build medicines array matching seeder.js format
    const medicines = [];
    
    // Check for medicine 1
    const medicine1 = formData.get('medicine1');
    if (medicine1) {
        medicines.push({
            name: medicine1,
            dosage: formData.get('dosage1') || '1-0-1',
            frequency: formData.get('timing1') || 'After Food',
            duration: formData.get('duration1') || '5 days'
        });
    }
    
    // Check for medicine 2
    const medicine2 = formData.get('medicine2');
    if (medicine2) {
        medicines.push({
            name: medicine2,
            dosage: formData.get('dosage2') || '1-0-1',
            frequency: formData.get('timing2') || 'After Food',
            duration: formData.get('duration2') || '5 days'
        });
    }
    
    // Check for medicine 3
    const medicine3 = formData.get('medicine3');
    if (medicine3) {
        medicines.push({
            name: medicine3,
            dosage: formData.get('dosage3') || '1-0-1',
            frequency: formData.get('timing3') || 'After Food',
            duration: formData.get('duration3') || '5 days'
        });
    }
    
    // Match seeder.js prescription data structure exactly
    const prescriptionData = {
        patient: patientId,
        patientName: formData.get('patientName'),
        doctor: formData.get('doctor'),
        medicines: medicines,
        instructions: formData.get('instructions') || '',
        status: 'Pending'
    };
    
    try {
        const response = await api.createPrescription(prescriptionData);
        if (response.success) {
            closeModal();
            await loadTableData();
            await updateDashboardStats();
            if (typeof toast !== 'undefined') {
                toast.show('Prescription created successfully!', 'success');
            }
        } else {
            throw new Error(response.error || 'Failed to create prescription');
        }
    } catch (error) {
        console.error('Error creating prescription:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to create prescription', 'error');
        }
    }
}

async function submitBillForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const patientId = formData.get('patientId');
    if (!patientId) {
        if (typeof toast !== 'undefined') {
            toast.show('Please select a valid patient from the list', 'error');
        } else {
            alert('Please select a valid patient');
        }
        return;
    }
    
    const amount = parseFloat(formData.get('amount'));
    const paymentMethod = formData.get('paymentMethod');
    const discount = parseFloat(formData.get('discount') || 0);
    
    // Match seeder.js bill structure - no tax by default (common in Indian hospitals)
    const billData = {
        patient: patientId,
        patientName: formData.get('patientName'),
        items: [{
            description: formData.get('service'),
            quantity: 1,
            rate: amount,
            amount: amount
        }],
        subtotal: amount,
        tax: 0,  // Match seeder.js format - tax is 0
        discount: discount,
        total: amount - discount,
        paymentStatus: paymentMethod ? 'Paid' : 'Unpaid',
        paymentMethod: paymentMethod || null
    };
    
    try {
        const response = await api.createBill(billData);
        if (response.success) {
            closeModal();
            await loadTableData();
            await updateDashboardStats();
            if (typeof toast !== 'undefined') {
                toast.show('Bill generated successfully!', 'success');
            }
        } else {
            throw new Error(response.error || 'Failed to generate bill');
        }
    } catch (error) {
        console.error('Error generating bill:', error);
        if (typeof toast !== 'undefined') {
            toast.show(error.message || 'Failed to generate bill', 'error');
        }
    }
}

// Submit Insurance Claim Form
function submitClaimForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const claims = JSON.parse(localStorage.getItem('insuranceClaims') || '[]');
    const claimCount = claims.length + 1;
    
    const newClaim = {
        claimId: `CLM-${String(claimCount).padStart(3, '0')}`,
        patient: formData.get('patient'),
        provider: formData.get('provider'),
        policyNo: formData.get('policyNo'),
        claimAmount: `₹${parseInt(formData.get('claimAmount')).toLocaleString('en-IN')}`,
        submissionDate: new Date().toLocaleDateString(),
        diagnosis: formData.get('diagnosis') || '',
        status: 'Pending'
    };
    
    claims.push(newClaim);
    localStorage.setItem('insuranceClaims', JSON.stringify(claims));
    
    closeModal();
    loadTableData();
    updateAllSectionStats();
    toast.show(`Insurance claim ${newClaim.claimId} submitted successfully!`, 'success');
}

// Submit Staff Form
function submitStaffForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const staff = JSON.parse(localStorage.getItem('staff') || '[]');
    
    const newStaff = {
        empId: formData.get('empId'),
        name: formData.get('name'),
        dept: formData.get('dept'),
        designation: formData.get('designation'),
        contact: formData.get('contact'),
        email: formData.get('email') || '',
        status: formData.get('status') || 'Active'
    };
    
    // Check if employee ID already exists
    const existingIndex = staff.findIndex(s => s.empId === newStaff.empId);
    if (existingIndex !== -1) {
        toast.show('Employee ID already exists!', 'error');
        return;
    }
    
    staff.push(newStaff);
    localStorage.setItem('staff', JSON.stringify(staff));
    
    closeModal();
    loadTableData();
    updateAllSectionStats();
    toast.show(`Staff member ${newStaff.name} added successfully!`, 'success');
}

// Submit Inventory Form
function submitInventoryForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    
    const currentStock = parseInt(formData.get('currentStock')) || 0;
    const reorderLevel = parseInt(formData.get('reorderLevel')) || 0;
    
    let status = 'In Stock';
    if (currentStock === 0) status = 'Out of Stock';
    else if (currentStock <= reorderLevel) status = 'Low Stock';
    
    const newItem = {
        itemCode: formData.get('itemCode'),
        itemName: formData.get('itemName'),
        category: formData.get('category'),
        unit: formData.get('unit') || 'Pieces',
        currentStock: currentStock,
        reorderLevel: reorderLevel,
        unitPrice: parseFloat(formData.get('unitPrice')) || 0,
        supplier: formData.get('supplier') || '',
        lastUpdated: new Date().toLocaleDateString(),
        status: status
    };
    
    // Check if item code already exists
    const existingIndex = inventory.findIndex(i => i.itemCode === newItem.itemCode);
    if (existingIndex !== -1) {
        toast.show('Item code already exists!', 'error');
        return;
    }
    
    inventory.push(newItem);
    localStorage.setItem('inventory', JSON.stringify(inventory));
    
    closeModal();
    loadTableData();
    updateAllSectionStats();
    toast.show(`Inventory item ${newItem.itemName} added successfully!`, 'success');
}

// Helper functions for viewing/editing
function viewPatient(id) {
    console.log('View patient:', id);
    if (typeof toast !== 'undefined') {
        toast.show('Patient details view - Coming soon!', 'info');
    }
}

function editPatient(id) {
    console.log('Edit patient:', id);
    if (typeof toast !== 'undefined') {
        toast.show('Edit patient - Coming soon!', 'info');
    }
}

// Make sure Socket.io connection is established
socket.on('connect', () => {
    console.log('✅ Socket.io connected');
});

socket.on('disconnect', () => {
    console.log('❌ Socket.io disconnected');
});

socket.on('connect_error', (error) => {
    console.error('Socket.io connection error:', error);
});

// Refresh data every 30 seconds to ensure UI stays updated
setInterval(() => {
    loadTableData();
    updateDashboardStats();
}, 30000);

// EMR Functionality
async function loadEMRData() {
    try {
        const response = await api.getPatients();
        if (response.success && response.data) {
            window.allEMRPatients = response.data; // Store for search
            displayEMRPatients(response.data);
        }
    } catch (error) {
        console.error('Error loading EMR data:', error);
    }
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

// Initialize notifications
function initializeNotifications() {
    // Generate dynamic notifications based on data
    const notifications = generateNotifications();
    window.currentNotifications = notifications;
    updateNotificationBadge(notifications.length);
}

// Generate notifications from current data
function generateNotifications() {
    const notifications = [];
    const now = new Date();
    
    // Check for critical patients
    const emergencyPatients = JSON.parse(localStorage.getItem('emergencyPatients') || '[]');
    const criticalPatients = emergencyPatients.filter(p => p.severity === 'Critical');
    if (criticalPatients.length > 0) {
        notifications.push({
            id: 1,
            type: 'critical',
            title: 'Critical Patients Alert',
            message: `${criticalPatients.length} patients in critical condition`,
            time: 'Just now',
            icon: 'fas fa-exclamation-triangle'
        });
    }
    
    // Check for low stock items
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const lowStock = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock');
    if (lowStock.length > 0) {
        notifications.push({
            id: 2,
            type: 'warning',
            title: 'Low Stock Alert',
            message: `${lowStock.length} items need restocking`,
            time: '5 min ago',
            icon: 'fas fa-box-open'
        });
    }
    
    // Check for pending lab tests
    const labTests = JSON.parse(localStorage.getItem('labTests') || '[]');
    const pendingTests = labTests.filter(t => t.status === 'Pending');
    if (pendingTests.length > 0) {
        notifications.push({
            id: 3,
            type: 'info',
            title: 'Pending Lab Tests',
            message: `${pendingTests.length} tests awaiting results`,
            time: '15 min ago',
            icon: 'fas fa-flask'
        });
    }
    
    // Add some default notifications if none exist
    if (notifications.length === 0) {
        notifications.push({
            id: 4,
            type: 'success',
            title: 'System Status',
            message: 'All systems running smoothly',
            time: '1 hour ago',
            icon: 'fas fa-check-circle'
        });
    }
    
    return notifications;
}

// Update notification badge count
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Toggle notifications dropdown
function toggleNotifications() {
    let dropdown = document.getElementById('notificationDropdown');
    
    if (!dropdown) {
        dropdown = createNotificationDropdown();
    }
    
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        initializeNotifications();
        renderNotifications();
    }
}

// Create notification dropdown
function createNotificationDropdown() {
    const dropdown = document.createElement('div');
    dropdown.id = 'notificationDropdown';
    dropdown.className = 'notification-dropdown';
    dropdown.innerHTML = `
        <div class="notification-header">
            <h3>Notifications</h3>
            <button onclick="clearAllNotifications()" class="clear-all-btn">Clear All</button>
        </div>
        <div class="notification-list" id="notificationList"></div>
        <div class="notification-footer">
            <a href="#" onclick="viewAllNotifications()">View All Notifications</a>
        </div>
    `;
    
    document.getElementById('notificationBtn').parentElement.appendChild(dropdown);
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notificationBtn') && !e.target.closest('#notificationDropdown')) {
            dropdown.style.display = 'none';
        }
    });
    
    return dropdown;
}

// Render notifications in dropdown
function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    const notifications = window.currentNotifications || [];
    
    if (notifications.length === 0) {
        list.innerHTML = '<div class="notification-empty">No new notifications</div>';
        return;
    }
    
    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.type}" onclick="handleNotificationClick(${n.id})">
            <div class="notification-icon"><i class="${n.icon}"></i></div>
            <div class="notification-content">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${n.time}</div>
            </div>
            <button class="notification-dismiss" onclick="event.stopPropagation(); dismissNotification(${n.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Handle notification click
function handleNotificationClick(id) {
    const notification = window.currentNotifications?.find(n => n.id === id);
    if (notification) {
        // Navigate based on notification type
        if (notification.type === 'critical') {
            window.location.hash = 'emergency';
        } else if (notification.title.includes('Stock')) {
            window.location.hash = 'inventory';
        } else if (notification.title.includes('Lab')) {
            window.location.hash = 'lab';
        }
        
        document.getElementById('notificationDropdown').style.display = 'none';
    }
}

// Dismiss single notification
function dismissNotification(id) {
    window.currentNotifications = window.currentNotifications?.filter(n => n.id !== id) || [];
    renderNotifications();
    updateNotificationBadge(window.currentNotifications.length);
    toast.show('Notification dismissed', 'info');
}

// Clear all notifications
function clearAllNotifications() {
    window.currentNotifications = [];
    renderNotifications();
    updateNotificationBadge(0);
    toast.show('All notifications cleared', 'success');
}

// View all notifications
function viewAllNotifications() {
    showModal('All Notifications', `
        <div class="all-notifications">
            ${(window.currentNotifications || []).map(n => `
                <div class="notification-item ${n.type}">
                    <div class="notification-icon"><i class="${n.icon}"></i></div>
                    <div class="notification-content">
                        <div class="notification-title">${n.title}</div>
                        <div class="notification-message">${n.message}</div>
                        <div class="notification-time">${n.time}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `);
    document.getElementById('notificationDropdown').style.display = 'none';
}

// Search EMR
function searchEMR(query) {
    if (!window.allEMRPatients) return;
    
    query = query.toLowerCase().trim();
    
    if (query.length < 2) {
        displayEMRPatients(window.allEMRPatients);
        return;
    }
    
    const filtered = window.allEMRPatients.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.patientId && p.patientId.toLowerCase().includes(query)) ||
        (p.contact && p.contact.includes(query)) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(query)) ||
        (p.doctor && p.doctor.toLowerCase().includes(query))
    );
    
    displayEMRPatients(filtered);
    
    if (filtered.length > 0) {
        toast.show(`Found ${filtered.length} matching records`, 'info');
    }
}

function displayEMRPatients(patients) {
    const emrContainer = document.getElementById('emrPatientList');
    if (!emrContainer) return;

    if (!patients || patients.length === 0) {
        emrContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                <i class="fas fa-folder-open" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3>No Patient Records Found</h3>
                <p>Start by registering patients in OPD, IPD, or Emergency sections.</p>
            </div>
        `;
        return;
    }

    emrContainer.innerHTML = patients.map(patient => {
        const statusClass = patient.patientType === 'IPD' ? 'admitted' : 
                          patient.patientType === 'Emergency' ? 'emergency' : 'outpatient';
        
        return `
            <div class="emr-patient-card" onclick="viewPatientEMR('${patient._id}')">
                <div class="emr-patient-header">
                    <div class="emr-patient-info">
                        <h3>${patient.name}</h3>
                        <div class="emr-patient-meta">
                            <span><i class="fas fa-id-card"></i> ${patient.patientId || patient._id.slice(-6).toUpperCase()}</span>
                            <span><i class="fas fa-user"></i> ${patient.age} years, ${patient.gender}</span>
                            <span><i class="fas fa-phone"></i> ${patient.contact || 'N/A'}</span>
                        </div>
                    </div>
                    <span class="emr-status ${statusClass}">${patient.patientType}</span>
                </div>
                <div class="emr-patient-details">
                    <div class="emr-detail-item">
                        <strong>Blood Group:</strong> ${patient.bloodGroup || 'N/A'}
                    </div>
                    ${patient.diagnosis ? `
                    <div class="emr-detail-item">
                        <strong>Current Diagnosis:</strong> ${patient.diagnosis}
                    </div>
                    ` : ''}
                    ${patient.patientType === 'IPD' && patient.wardBed ? `
                    <div class="emr-detail-item">
                        <strong>Ward/Bed:</strong> ${patient.wardBed}
                    </div>
                    ` : ''}
                    ${patient.doctor ? `
                    <div class="emr-detail-item">
                        <strong>Attending Doctor:</strong> ${patient.doctor}
                    </div>
                    ` : ''}
                    <div class="emr-detail-item">
                        <strong>Registered:</strong> ${new Date(patient.createdAt || Date.now()).toLocaleDateString('en-IN')}
                    </div>
                </div>
                <div class="emr-actions">
                    <button class="btn-view" onclick="event.stopPropagation(); viewFullMedicalHistory('${patient._id}')">
                        <i class="fas fa-file-medical"></i> Medical History
                    </button>
                    <button class="btn-view" onclick="event.stopPropagation(); viewLabResults('${patient._id}')">
                        <i class="fas fa-flask"></i> Lab Results
                    </button>
                    <button class="btn-view" onclick="event.stopPropagation(); viewPrescriptions('${patient._id}')">
                        <i class="fas fa-prescription"></i> Prescriptions
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function viewPatientEMR(patientId) {
    try {
        const response = await api.getPatients();
        if (response.success) {
            const patient = response.data.find(p => p._id === patientId);
            if (patient) {
                showPatientEMRModal(patient);
            }
        }
    } catch (error) {
        console.error('Error viewing patient EMR:', error);
        if (typeof toast !== 'undefined') {
            toast.show('Failed to load patient record', 'error');
        }
    }
}

function showPatientEMRModal(patient) {
    showModal('Patient Medical Record', `
        <div class="emr-modal-content">
            <div class="patient-info-section">
                <h3><i class="fas fa-user-circle"></i> Patient Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Patient ID:</label>
                        <span>${patient.patientId || patient._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div class="info-item">
                        <label>Name:</label>
                        <span>${patient.name}</span>
                    </div>
                    <div class="info-item">
                        <label>Age/Gender:</label>
                        <span>${patient.age} years, ${patient.gender}</span>
                    </div>
                    <div class="info-item">
                        <label>Blood Group:</label>
                        <span>${patient.bloodGroup || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Contact:</label>
                        <span>${patient.contact || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Address:</label>
                        <span>${patient.address || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Patient Type:</label>
                        <span class="badge-${patient.patientType?.toLowerCase()}">${patient.patientType}</span>
                    </div>
                    <div class="info-item">
                        <label>Registration Date:</label>
                        <span>${new Date(patient.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                    </div>
                </div>
            </div>

            ${patient.diagnosis ? `
            <div class="diagnosis-section">
                <h3><i class="fas fa-stethoscope"></i> Current Diagnosis</h3>
                <p class="diagnosis-text">${patient.diagnosis}</p>
                ${patient.doctor ? `<p><strong>Attending Doctor:</strong> ${patient.doctor}</p>` : ''}
            </div>
            ` : ''}

            ${patient.patientType === 'IPD' ? `
            <div class="admission-section">
                <h3><i class="fas fa-hospital"></i> Admission Details</h3>
                <div class="info-grid">
                    ${patient.wardBed ? `
                    <div class="info-item">
                        <label>Ward/Bed:</label>
                        <span>${patient.wardBed}</span>
                    </div>
                    ` : ''}
                    ${patient.admissionDate ? `
                    <div class="info-item">
                        <label>Admission Date:</label>
                        <span>${new Date(patient.admissionDate).toLocaleDateString('en-IN')}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <div class="emr-footer">
                <button class="btn-secondary" onclick="closeModal()">Close</button>
                <button class="btn-primary" onclick="printPatientRecord('${patient._id}')">
                    <i class="fas fa-print"></i> Print Record
                </button>
            </div>
        </div>
    `);
}

async function viewFullMedicalHistory(patientId) {
    try {
        // Fetch all related medical data
        const [surgeries, labTests, imaging, prescriptions, bills] = await Promise.all([
            api.getSurgeries(),
            api.getLabTests(),
            api.getImagingOrders(),
            api.getPrescriptions(),
            api.getBills()
        ]);

        const patientSurgeries = surgeries.data?.filter(s => s.patient === patientId) || [];
        const patientLabs = labTests.data?.filter(l => l.patient === patientId) || [];
        const patientImaging = imaging.data?.filter(i => i.patient === patientId) || [];
        const patientPrescriptions = prescriptions.data?.filter(p => p.patient === patientId) || [];
        const patientBills = bills.data?.filter(b => b.patient === patientId) || [];

        showMedicalHistoryModal(patientId, {
            surgeries: patientSurgeries,
            labTests: patientLabs,
            imaging: patientImaging,
            prescriptions: patientPrescriptions,
            bills: patientBills
        });
    } catch (error) {
        console.error('Error fetching medical history:', error);
        if (typeof toast !== 'undefined') {
            toast.show('Failed to load medical history', 'error');
        }
    }
}

function showMedicalHistoryModal(patientId, data) {
    showModal('Complete Medical History', `
        <div class="medical-history-container">
            ${data.surgeries.length > 0 ? `
            <div class="history-section">
                <h3><i class="fas fa-procedures"></i> Surgeries (${data.surgeries.length})</h3>
                <div class="history-items">
                    ${data.surgeries.map(s => `
                        <div class="history-item">
                            <div class="history-item-header">
                                <strong>${s.procedure}</strong>
                                <span class="history-date">${new Date(s.surgeryDate).toLocaleDateString('en-IN')}</span>
                            </div>
                            <div class="history-details">
                                <p><strong>Surgeon:</strong> ${s.surgeon}</p>
                                <p><strong>OT Room:</strong> ${s.otRoom}</p>
                                <p><strong>Duration:</strong> ${s.estimatedDuration}</p>
                                <p><strong>Status:</strong> <span class="badge-${s.status.toLowerCase()}">${s.status}</span></p>
                                ${s.notes ? `<p><strong>Notes:</strong> ${s.notes}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${data.labTests.length > 0 ? `
            <div class="history-section">
                <h3><i class="fas fa-flask"></i> Laboratory Tests (${data.labTests.length})</h3>
                <div class="history-items">
                    ${data.labTests.map(l => `
                        <div class="history-item">
                            <div class="history-item-header">
                                <strong>${l.testType}</strong>
                                <span class="history-date">${new Date(l.orderDate).toLocaleDateString('en-IN')}</span>
                            </div>
                            <div class="history-details">
                                <p><strong>Ordered By:</strong> ${l.orderedBy}</p>
                                <p><strong>Status:</strong> <span class="badge-${l.status.toLowerCase()}">${l.status}</span></p>
                                ${l.results ? `<p><strong>Results:</strong> ${l.results}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${data.imaging.length > 0 ? `
            <div class="history-section">
                <h3><i class="fas fa-x-ray"></i> Imaging Studies (${data.imaging.length})</h3>
                <div class="history-items">
                    ${data.imaging.map(i => `
                        <div class="history-item">
                            <div class="history-item-header">
                                <strong>${i.imagingType} - ${i.bodyPart}</strong>
                                <span class="history-date">${new Date(i.orderDate).toLocaleDateString('en-IN')}</span>
                            </div>
                            <div class="history-details">
                                <p><strong>Ordered By:</strong> ${i.orderedBy}</p>
                                <p><strong>Status:</strong> <span class="badge-${i.status.toLowerCase()}">${i.status}</span></p>
                                ${i.findings ? `<p><strong>Findings:</strong> ${i.findings}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${data.prescriptions.length > 0 ? `
            <div class="history-section">
                <h3><i class="fas fa-prescription"></i> Prescriptions (${data.prescriptions.length})</h3>
                <div class="history-items">
                    ${data.prescriptions.map(p => `
                        <div class="history-item">
                            <div class="history-item-header">
                                <strong>Prescription by ${p.doctor}</strong>
                                <span class="history-date">${new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
                            </div>
                            <div class="history-details">
                                ${p.medicines && p.medicines.length > 0 ? `
                                    <div class="medicines-list">
                                        ${p.medicines.map(m => `
                                            <div class="medicine-item">
                                                <strong>${m.name}</strong> - ${m.dosage}<br>
                                                <small>Frequency: ${m.frequency} | Duration: ${m.duration}</small>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                ${p.instructions ? `<p><strong>Instructions:</strong> ${p.instructions}</p>` : ''}
                                <p><strong>Status:</strong> <span class="badge-${p.status.toLowerCase()}">${p.status}</span></p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${data.bills.length > 0 ? `
            <div class="history-section">
                <h3><i class="fas fa-file-invoice-dollar"></i> Billing History (${data.bills.length})</h3>
                <div class="history-items">
                    ${data.bills.map(b => `
                        <div class="history-item">
                            <div class="history-item-header">
                                <strong>Bill #${b.billNumber}</strong>
                                <span class="history-amount">₹${b.total.toLocaleString('en-IN')}</span>
                            </div>
                            <div class="history-details">
                                <p><strong>Date:</strong> ${new Date(b.createdAt).toLocaleDateString('en-IN')}</p>
                                <p><strong>Payment Status:</strong> <span class="badge-${b.paymentStatus.toLowerCase()}">${b.paymentStatus}</span></p>
                                ${b.paymentMethod ? `<p><strong>Payment Method:</strong> ${b.paymentMethod}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${data.surgeries.length === 0 && data.labTests.length === 0 && data.imaging.length === 0 && data.prescriptions.length === 0 && data.bills.length === 0 ? `
                <div class="no-history">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
                    <p>No medical history available for this patient.</p>
                </div>
            ` : ''}

            <div class="history-footer">
                <button class="btn-secondary" onclick="closeModal()">Close</button>
                <button class="btn-primary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print History
                </button>
            </div>
        </div>
    `);
}

async function viewLabResults(patientId) {
    try {
        const response = await api.getLabTests();
        if (response.success) {
            const patientLabs = response.data.filter(l => l.patient === patientId);
            showLabResultsModal(patientLabs);
        }
    } catch (error) {
        console.error('Error fetching lab results:', error);
        if (typeof toast !== 'undefined') {
            toast.show('Failed to load lab results', 'error');
        }
    }
}

function showLabResultsModal(labTests) {
    showModal('Laboratory Results', `
        <div class="lab-results-container">
            ${labTests.length > 0 ? `
                <div class="lab-results-list">
                    ${labTests.map(lab => `
                        <div class="lab-result-card">
                            <div class="lab-result-header">
                                <div>
                                    <h3>${lab.testType}</h3>
                                    <p class="lab-meta">Ordered by ${lab.orderedBy} on ${new Date(lab.orderDate).toLocaleDateString('en-IN')}</p>
                                </div>
                                <span class="status-badge badge-${lab.status.toLowerCase()}">${lab.status}</span>
                            </div>
                            
                            ${lab.results ? `
                                <div class="lab-results-section">
                                    <h4><i class="fas fa-clipboard-check"></i> Results</h4>
                                    <div class="results-text">${lab.results}</div>
                                </div>
                            ` : `
                                <div class="lab-pending">
                                    <i class="fas fa-hourglass-half"></i>
                                    <p>Results pending...</p>
                                </div>
                            `}

                            ${lab.notes ? `
                                <div class="lab-notes">
                                    <strong>Notes:</strong> ${lab.notes}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="no-results">
                    <i class="fas fa-flask" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
                    <p>No laboratory tests found for this patient.</p>
                </div>
            `}
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">Close</button>
                ${labTests.length > 0 ? `
                    <button class="btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print Results
                    </button>
                ` : ''}
            </div>
        </div>
    `);
}

async function viewPrescriptions(patientId) {
    try {
        const response = await api.getPrescriptions();
        if (response.success) {
            const patientPrescriptions = response.data.filter(p => p.patient === patientId);
            showPrescriptionsModal(patientPrescriptions);
        }
    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        if (typeof toast !== 'undefined') {
            toast.show('Failed to load prescriptions', 'error');
        }
    }
}

function showPrescriptionsModal(prescriptions) {
    showModal('Patient Prescriptions', `
        <div class="prescriptions-container">
            ${prescriptions.length > 0 ? `
                <div class="prescriptions-list">
                    ${prescriptions.map(rx => `
                        <div class="prescription-card">
                            <div class="prescription-header">
                                <div class="prescription-meta">
                                    <h3><i class="fas fa-user-md"></i> Dr. ${rx.doctor}</h3>
                                    <p>${new Date(rx.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <span class="status-badge badge-${rx.status.toLowerCase()}">${rx.status}</span>
                            </div>

                            ${rx.medicines && rx.medicines.length > 0 ? `
                                <div class="medicines-section">
                                    <h4><i class="fas fa-pills"></i> Prescribed Medicines</h4>
                                    <table class="medicines-table">
                                        <thead>
                                            <tr>
                                                <th>Medicine</th>
                                                <th>Dosage</th>
                                                <th>Frequency</th>
                                                <th>Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rx.medicines.map(med => `
                                                <tr>
                                                    <td><strong>${med.name}</strong></td>
                                                    <td>${med.dosage}</td>
                                                    <td>${med.frequency}</td>
                                                    <td>${med.duration}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : ''}

                            ${rx.instructions ? `
                                <div class="prescription-instructions">
                                    <h4><i class="fas fa-notes-medical"></i> Instructions</h4>
                                    <p>${rx.instructions}</p>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="no-results">
                    <i class="fas fa-prescription" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
                    <p>No prescriptions found for this patient.</p>
                </div>
            `}
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">Close</button>
                ${prescriptions.length > 0 ? `
                    <button class="btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print Prescriptions
                    </button>
                ` : ''}
            </div>
        </div>
    `);
}

function printPatientRecord(patientId) {
    if (typeof toast !== 'undefined') {
        toast.show('Preparing patient record for printing...', 'info');
    }
    window.print();
}

// Helper functions for billing form
function updateBillAmount(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const amount = selectedOption.getAttribute('data-amount');
    const itemNumber = selectElement.name.replace('service', '');
    const amountInput = document.querySelector(`input[name="amount${itemNumber}"]`);
    
    if (amount && amountInput) {
        amountInput.value = amount;
    }
    updateTotalBill();
}

function updateTotalBill() {
    let subtotal = 0;
    
    // Get all amount inputs
    const amount1 = parseFloat(document.querySelector('input[name="amount1"]')?.value) || 0;
    const quantity1 = parseInt(document.querySelector('input[name="quantity1"]')?.value) || 1;
    const amount2 = parseFloat(document.querySelector('input[name="amount2"]')?.value) || 0;
    const quantity2 = parseInt(document.querySelector('input[name="quantity2"]')?.value) || 1;
    
    subtotal = (amount1 * quantity1) + (amount2 * quantity2);
    
    // Get discount
    const discountPercent = parseFloat(document.querySelector('input[name="discountPercent"]')?.value) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const total = subtotal - discountAmount;
    
    // Update display
    const subtotalEl = document.getElementById('billSubtotal');
    const discountEl = document.getElementById('billDiscount');
    const totalEl = document.getElementById('billTotal');
    
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `₹${discountAmount.toFixed(2)}`;
    if (totalEl) totalEl.innerHTML = `<strong>₹${total.toFixed(2)}</strong>`;
}

// Helper function for room rate update
function updateRoomRate() {
    const roomSelect = document.getElementById('roomTypeSelect');
    if (roomSelect) {
        const selectedOption = roomSelect.options[roomSelect.selectedIndex];
        const rate = selectedOption.getAttribute('data-rate');
        // Could display rate somewhere if needed
    }
}

// Helper function for lab tests update
function updateLabTests() {
    // This could populate test names based on category if needed
    const category = document.getElementById('labTestCategory')?.value;
    // Could filter test options based on category
}

// ========== Advanced Analytics Functions ==========

// Chart instances for analytics
let analyticsCharts = {
    revenueTrend: null,
    patientFlow: null,
    departmentRevenue: null,
    departmentPatients: null,
    departmentRatings: null,
    revenueStreams: null,
    paymentMethods: null,
    bedUtilization: null,
    otUtilization: null,
    doctorWorkload: null,
    demographics: null,
    gender: null
};

// Flag to prevent multiple initializations
let analyticsInitialized = false;

// Destroy all analytics charts
function destroyAllAnalyticsCharts() {
    Object.keys(analyticsCharts).forEach(key => {
        if (analyticsCharts[key]) {
            analyticsCharts[key].destroy();
            analyticsCharts[key] = null;
        }
    });
}

// Initialize Analytics when section is shown
function initAdvancedAnalytics() {
    // Prevent multiple rapid initializations
    if (analyticsInitialized) {
        return;
    }
    analyticsInitialized = true;
    
    // Destroy existing charts first
    destroyAllAnalyticsCharts();
    
    // Set default date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    const startInput = document.getElementById('analyticsStartDate');
    const endInput = document.getElementById('analyticsEndDate');
    
    if (startInput) startInput.value = startDate.toISOString().split('T')[0];
    if (endInput) endInput.value = endDate.toISOString().split('T')[0];
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        // Initialize all charts
        initRevenueTrendAnalyticsChart();
        initPatientFlowAnalyticsChart();
        initDepartmentCharts();
        initFinancialCharts();
        initOperationalCharts();
        initStaffCharts();
        initDemographicCharts();
        
        // Load analytics data
        loadAnalyticsData();
        
        // Reset flag after a delay to allow re-initialization if needed
        setTimeout(() => {
            analyticsInitialized = false;
        }, 1000);
    }, 100);
}

// Load Analytics Data from Backend
async function loadAnalyticsData() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            updateAnalyticsSummary(data);
        }
    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

// Update Analytics Summary Bar
function updateAnalyticsSummary(data) {
    const totalPatientsEl = document.getElementById('analyticsTotalPatients');
    const totalRevenueEl = document.getElementById('analyticsTotalRevenue');
    const surgeriesEl = document.getElementById('analyticsSurgeries');
    const occupancyEl = document.getElementById('analyticsOccupancy');
    
    if (totalPatientsEl && data.totalPatients !== undefined) {
        animateValue(totalPatientsEl, 0, data.totalPatients, 1500);
    }
    
    if (totalRevenueEl && data.totalCollections !== undefined) {
        totalRevenueEl.textContent = `₹${(data.totalCollections / 100000).toFixed(1)}L`;
    }
    
    if (surgeriesEl && data.surgeries !== undefined) {
        animateValue(surgeriesEl, 0, data.surgeries.length || 0, 1000);
    }
    
    if (occupancyEl && data.beds !== undefined) {
        const occupancy = Math.round((data.beds.occupied / data.beds.total) * 100) || 0;
        occupancyEl.textContent = `${occupancy}%`;
    }
}

// Animate number value
function animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(start + (range * progress));
        element.textContent = value.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Revenue Trend Analytics Chart
function initRevenueTrendAnalyticsChart() {
    const ctx = document.getElementById('analyticsRevenueTrendChart');
    if (!ctx) return;
    
    if (analyticsCharts.revenueTrend) {
        analyticsCharts.revenueTrend.destroy();
    }
    
    analyticsCharts.revenueTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [
                {
                    label: 'OPD Revenue',
                    data: [12.5, 14.2, 13.8, 15.1],
                    borderColor: '#0891b2',
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'IPD Revenue',
                    data: [18.3, 19.5, 17.8, 21.2],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Pharmacy',
                    data: [8.2, 9.1, 8.8, 9.5],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Lab & Imaging',
                    data: [5.5, 6.2, 5.9, 6.8],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 18, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw}L`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: {
                        callback: function(value) { return '₹' + value + 'L'; },
                        color: '#64748b'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

// Change Revenue Chart Type
function changeRevenueChartType(type) {
    const buttons = document.querySelectorAll('.chart-actions .chart-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (analyticsCharts.revenueTrend) {
        analyticsCharts.revenueTrend.config.type = type;
        analyticsCharts.revenueTrend.update();
    }
}

// Patient Flow Analytics Chart
function initPatientFlowAnalyticsChart() {
    const ctx = document.getElementById('patientFlowAnalyticsChart');
    if (!ctx) return;
    
    if (analyticsCharts.patientFlow) {
        analyticsCharts.patientFlow.destroy();
    }
    
    analyticsCharts.patientFlow = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Admissions',
                    data: [45, 52, 48, 55, 51, 38, 32],
                    backgroundColor: 'rgba(8, 145, 178, 0.8)',
                    borderRadius: 6
                },
                {
                    label: 'Discharges',
                    data: [42, 48, 50, 47, 52, 35, 28],
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 6
                },
                {
                    label: 'Transfers',
                    data: [8, 12, 10, 15, 11, 6, 4],
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 18, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

// Update Patient Flow Analytics
function updatePatientFlowAnalytics(filterType) {
    // Update chart based on filter
    console.log('Filter changed to:', filterType);
}

// Initialize Department Charts
function initDepartmentCharts() {
    // Department Revenue Chart
    const revenueCtx = document.getElementById('analyticsDeptRevenueChart');
    if (revenueCtx) {
        if (analyticsCharts.departmentRevenue) analyticsCharts.departmentRevenue.destroy();
        
        analyticsCharts.departmentRevenue = new Chart(revenueCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'ICU'],
                datasets: [{
                    data: [18.5, 14.2, 22.8, 12.4, 16.9, 9.8],
                    backgroundColor: [
                        '#ef4444', '#8b5cf6', '#0891b2', '#10b981', '#f59e0b', '#ec4899'
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', padding: 15, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ₹${context.raw}L`;
                            }
                        }
                    }
                },
                cutout: '55%'
            }
        });
    }
    
    // Department Patients Chart
    const patientsCtx = document.getElementById('departmentPatientsChart');
    if (patientsCtx) {
        if (analyticsCharts.departmentPatients) analyticsCharts.departmentPatients.destroy();
        
        analyticsCharts.departmentPatients = new Chart(patientsCtx, {
            type: 'bar',
            data: {
                labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General'],
                datasets: [{
                    data: [245, 189, 312, 278, 456],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(8, 145, 178, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#64748b' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }
    
    // Department Ratings Chart
    const ratingsCtx = document.getElementById('departmentRatingsChart');
    if (ratingsCtx) {
        if (analyticsCharts.departmentRatings) analyticsCharts.departmentRatings.destroy();
        
        analyticsCharts.departmentRatings = new Chart(ratingsCtx, {
            type: 'radar',
            data: {
                labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General', 'ICU'],
                datasets: [{
                    label: 'Patient Rating',
                    data: [4.6, 4.4, 4.5, 4.8, 4.3, 4.7],
                    backgroundColor: 'rgba(8, 145, 178, 0.2)',
                    borderColor: '#0891b2',
                    borderWidth: 2,
                    pointBackgroundColor: '#0891b2',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            color: '#64748b',
                            backdropColor: 'transparent'
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.08)' },
                        pointLabels: { color: '#94a3b8' }
                    }
                }
            }
        });
    }
}

// Initialize Financial Charts
function initFinancialCharts() {
    // Revenue Streams Chart
    const streamsCtx = document.getElementById('revenueStreamsChart');
    if (streamsCtx) {
        if (analyticsCharts.revenueStreams) analyticsCharts.revenueStreams.destroy();
        
        analyticsCharts.revenueStreams = new Chart(streamsCtx, {
            type: 'bar',
            data: {
                labels: ['OPD Consultation', 'IPD Room Charges', 'Surgery Fees', 'Lab Tests', 'Radiology', 'Pharmacy', 'Others'],
                datasets: [{
                    label: 'Revenue (₹ Lakhs)',
                    data: [15.2, 22.8, 18.5, 8.4, 6.2, 12.3, 4.8],
                    backgroundColor: [
                        'rgba(8, 145, 178, 0.85)',
                        'rgba(16, 185, 129, 0.85)',
                        'rgba(139, 92, 246, 0.85)',
                        'rgba(245, 158, 11, 0.85)',
                        'rgba(236, 72, 153, 0.85)',
                        'rgba(239, 68, 68, 0.85)',
                        'rgba(100, 116, 139, 0.85)'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `₹${context.raw}L`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: {
                            callback: function(value) { return '₹' + value + 'L'; },
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', maxRotation: 45 }
                    }
                }
            }
        });
    }
    
    // Payment Methods Chart
    const paymentsCtx = document.getElementById('paymentMethodsChart');
    if (paymentsCtx) {
        if (analyticsCharts.paymentMethods) analyticsCharts.paymentMethods.destroy();
        
        analyticsCharts.paymentMethods = new Chart(paymentsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cash', 'Card', 'UPI', 'Insurance', 'CGHS/ECHS', 'Corporate'],
                datasets: [{
                    data: [22, 28, 18, 15, 10, 7],
                    backgroundColor: [
                        '#10b981', '#0891b2', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            padding: 12,
                            usePointStyle: true,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${data.datasets[0].data[i]}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    index: i
                                }));
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
}

// Initialize Operational Charts
function initOperationalCharts() {
    // Bed Utilization Chart
    const bedCtx = document.getElementById('bedUtilizationChart');
    if (bedCtx) {
        if (analyticsCharts.bedUtilization) analyticsCharts.bedUtilization.destroy();
        
        analyticsCharts.bedUtilization = new Chart(bedCtx, {
            type: 'bar',
            data: {
                labels: ['General Ward', 'Private Rooms', 'ICU', 'NICU', 'Pediatric', 'Maternity'],
                datasets: [
                    {
                        label: 'Occupied',
                        data: [42, 28, 18, 8, 15, 12],
                        backgroundColor: 'rgba(8, 145, 178, 0.85)',
                        borderRadius: 4
                    },
                    {
                        label: 'Available',
                        data: [8, 7, 2, 2, 5, 3],
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        borderRadius: 4
                    },
                    {
                        label: 'Maintenance',
                        data: [2, 1, 0, 0, 0, 1],
                        backgroundColor: 'rgba(245, 158, 11, 0.85)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#94a3b8', usePointStyle: true }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
    
    // OT Utilization Chart
    const otCtx = document.getElementById('otUtilizationChart');
    if (otCtx) {
        if (analyticsCharts.otUtilization) analyticsCharts.otUtilization.destroy();
        
        analyticsCharts.otUtilization = new Chart(otCtx, {
            type: 'line',
            data: {
                labels: ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'],
                datasets: [
                    {
                        label: 'OT-1',
                        data: [0, 100, 100, 50, 100, 100, 50, 0],
                        borderColor: '#0891b2',
                        backgroundColor: 'rgba(8, 145, 178, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'OT-2',
                        data: [0, 50, 100, 100, 100, 50, 0, 0],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'OT-3',
                        data: [0, 0, 100, 100, 50, 100, 100, 0],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#94a3b8', usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}% utilized`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: {
                            callback: function(value) { return value + '%'; },
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
}

// Initialize Staff Charts
function initStaffCharts() {
    const workloadCtx = document.getElementById('doctorWorkloadChart');
    if (workloadCtx) {
        if (analyticsCharts.doctorWorkload) analyticsCharts.doctorWorkload.destroy();
        
        analyticsCharts.doctorWorkload = new Chart(workloadCtx, {
            type: 'bar',
            data: {
                labels: ['Dr. Rajesh', 'Dr. Priya', 'Dr. Amit', 'Dr. Meera', 'Dr. Suresh', 'Dr. Neha', 'Dr. Vikram'],
                datasets: [
                    {
                        label: 'OPD',
                        data: [85, 72, 68, 78, 62, 55, 48],
                        backgroundColor: 'rgba(8, 145, 178, 0.85)',
                        borderRadius: 4
                    },
                    {
                        label: 'IPD',
                        data: [45, 52, 38, 28, 32, 42, 35],
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        borderRadius: 4
                    },
                    {
                        label: 'Surgery',
                        data: [26, 18, 22, 12, 11, 8, 15],
                        backgroundColor: 'rgba(139, 92, 246, 0.85)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#94a3b8', usePointStyle: true }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
}

// Initialize Demographic Charts
function initDemographicCharts() {
    // Age Demographics Chart
    const demoCtx = document.getElementById('analyticsAgeChart');
    if (demoCtx) {
        if (analyticsCharts.demographics) analyticsCharts.demographics.destroy();
        
        analyticsCharts.demographics = new Chart(demoCtx, {
            type: 'bar',
            data: {
                labels: ['0-18', '19-35', '36-50', '51-65', '65+'],
                datasets: [{
                    label: 'Patients',
                    data: [185, 342, 298, 245, 156],
                    backgroundColor: [
                        'rgba(8, 145, 178, 0.85)',
                        'rgba(16, 185, 129, 0.85)',
                        'rgba(139, 92, 246, 0.85)',
                        'rgba(245, 158, 11, 0.85)',
                        'rgba(239, 68, 68, 0.85)'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
    
    // Gender Distribution Chart
    const genderCtx = document.getElementById('genderChart');
    if (genderCtx) {
        if (analyticsCharts.gender) analyticsCharts.gender.destroy();
        
        analyticsCharts.gender = new Chart(genderCtx, {
            type: 'doughnut',
            data: {
                labels: ['Male', 'Female', 'Other'],
                datasets: [{
                    data: [52, 46, 2],
                    backgroundColor: ['#0891b2', '#ec4899', '#8b5cf6'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            padding: 15,
                            usePointStyle: true,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${data.datasets[0].data[i]}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    index: i
                                }));
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

// Update Analytics Period
function updateAnalyticsPeriod(period) {
    console.log('Analytics period changed to:', period);
    // Reload analytics data based on selected period
    loadAnalyticsData();
}

// Refresh Analytics
function refreshAnalytics() {
    loadAnalyticsData();
    
    // Re-initialize all charts
    initRevenueTrendAnalyticsChart();
    initPatientFlowAnalyticsChart();
    initDepartmentCharts();
    initFinancialCharts();
    initOperationalCharts();
    initStaffCharts();
    initDemographicCharts();
    
    toast.show('Analytics refreshed successfully!', 'success');
}

// Export Analytics Report
function exportAnalyticsReport() {
    const period = document.getElementById('analyticsPeriod')?.value || 'month';
    const analyticsData = {
        reportDate: new Date().toISOString(),
        period: period,
        summary: {
            totalPatients: document.getElementById('analyticsTotalPatients')?.textContent || '0',
            totalRevenue: document.getElementById('analyticsTotalRevenue')?.textContent || '₹0',
            surgeries: document.getElementById('analyticsSurgeries')?.textContent || '0',
            occupancy: document.getElementById('analyticsOccupancy')?.textContent || '0%'
        },
        kpis: {
            patientSatisfaction: document.getElementById('patientSatisfaction')?.textContent || '0',
            avgWaitTime: document.getElementById('avgWaitTime')?.textContent || '0',
            bedTurnoverRate: document.getElementById('bedTurnoverRate')?.textContent || '0',
            revenuePerPatient: document.getElementById('revenuePerPatient')?.textContent || '0',
            readmissionRate: document.getElementById('readmissionRate')?.textContent || '0',
            mortalityRate: document.getElementById('mortalityRate')?.textContent || '0'
        },
        financials: {
            totalCollections: document.getElementById('totalCollections')?.textContent || '₹0',
            outstandingDues: document.getElementById('outstandingDues')?.textContent || '₹0',
            insuranceClaims: document.getElementById('insuranceClaims')?.textContent || '₹0',
            operatingExpenses: document.getElementById('operatingExpenses')?.textContent || '₹0'
        },
        generatedBy: 'Hospital Analytics System',
        exportedAt: new Date().toLocaleString()
    };
    
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hospital_Analytics_Report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.show('Analytics report exported successfully!', 'success');
}

// Export Department Metrics
function exportDepartmentMetrics() {
    toast.show('Department metrics exported!', 'success');
}

// Show KPI Details
function showKPIDetails(kpiType) {
    console.log('Showing details for KPI:', kpiType);
    toast.show(`${kpiType} details - feature coming soon!`, 'info');
}

// Run Comparison
function runComparison() {
    const period1 = document.getElementById('comparisonPeriod1')?.value;
    const period2 = document.getElementById('comparisonPeriod2')?.value;
    console.log('Running comparison:', period1, 'vs', period2);
    toast.show('Comparison updated!', 'success');
}

// Initialize analytics when section becomes visible
const analyticsObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const analyticsSection = document.getElementById('analytics');
            if (analyticsSection && analyticsSection.classList.contains('active')) {
                initAdvancedAnalytics();
            }
        }
    });
});

// Observe analytics section
document.addEventListener('DOMContentLoaded', function() {
    const analyticsSection = document.getElementById('analytics');
    if (analyticsSection) {
        analyticsObserver.observe(analyticsSection, { attributes: true });
    }
});

// ========================================
// AI COMMAND CENTER - HACKATHON FEATURE
// ========================================

// AI Triage Analysis
function analyzeSymptoms() {
    const symptoms = document.getElementById('symptomInput').value.toLowerCase();
    const temp = parseFloat(document.getElementById('triageTemp').value) || 98.6;
    const bp = parseInt(document.getElementById('triageBP').value) || 120;
    const hr = parseInt(document.getElementById('triageHR').value) || 75;
    const o2 = parseInt(document.getElementById('triageO2').value) || 98;

    if (!symptoms.trim()) {
        toast.show('Please enter patient symptoms', 'warning');
        return;
    }

    // Show loading
    const btn = document.querySelector('.btn-ai-analyze');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    btn.disabled = true;

    // Simulate AI analysis
    setTimeout(() => {
        const analysis = performTriageAnalysis(symptoms, temp, bp, hr, o2);
        displayTriageResult(analysis);
        btn.innerHTML = '<i class="fas fa-brain"></i> Analyze with AI';
        btn.disabled = false;
    }, 1500);
}

function performTriageAnalysis(symptoms, temp, bp, hr, o2) {
    let priority = 4; // Default: Low
    let recommendations = [];
    let actions = [];
    let urgency = 'Low';

    // Critical symptoms detection
    const criticalKeywords = ['chest pain', 'heart attack', 'stroke', 'unconscious', 'not breathing', 'severe bleeding', 'seizure', 'cardiac arrest'];
    const urgentKeywords = ['difficulty breathing', 'shortness of breath', 'high fever', 'severe pain', 'confusion', 'head injury', 'fracture'];
    const moderateKeywords = ['fever', 'vomiting', 'diarrhea', 'moderate pain', 'dizziness', 'weakness', 'infection'];

    // Check symptoms
    for (const keyword of criticalKeywords) {
        if (symptoms.includes(keyword)) {
            priority = 1;
            urgency = 'Critical';
            break;
        }
    }
    if (priority > 1) {
        for (const keyword of urgentKeywords) {
            if (symptoms.includes(keyword)) {
                priority = 2;
                urgency = 'Urgent';
                break;
            }
        }
    }
    if (priority > 2) {
        for (const keyword of moderateKeywords) {
            if (symptoms.includes(keyword)) {
                priority = 3;
                urgency = 'Moderate';
                break;
            }
        }
    }

    // Vital signs analysis
    if (temp >= 104 || temp <= 95) priority = Math.min(priority, 1);
    else if (temp >= 102) priority = Math.min(priority, 2);
    else if (temp >= 100) priority = Math.min(priority, 3);

    if (bp >= 180 || bp <= 80) priority = Math.min(priority, 1);
    else if (bp >= 160 || bp <= 90) priority = Math.min(priority, 2);

    if (hr >= 150 || hr <= 40) priority = Math.min(priority, 1);
    else if (hr >= 120 || hr <= 50) priority = Math.min(priority, 2);

    if (o2 <= 88) priority = Math.min(priority, 1);
    else if (o2 <= 92) priority = Math.min(priority, 2);

    // Generate recommendations based on priority
    switch (priority) {
        case 1:
            urgency = 'Critical';
            recommendations = [
                'Immediate medical attention required',
                'Notify emergency team immediately',
                'Prepare resuscitation equipment',
                'Consider ICU admission'
            ];
            actions = ['Alert ER', 'Call Code Team', 'Notify Physician', 'Prepare ICU'];
            break;
        case 2:
            urgency = 'Urgent';
            recommendations = [
                'Requires urgent evaluation within 15 minutes',
                'Monitor vital signs continuously',
                'Prepare for possible intervention',
                'Order priority diagnostic tests'
            ];
            actions = ['Priority Queue', 'Vital Monitoring', 'Order Labs', 'Notify Doctor'];
            break;
        case 3:
            urgency = 'Moderate';
            recommendations = [
                'Evaluation within 30-60 minutes',
                'Standard vital sign monitoring',
                'Consider routine diagnostic workup',
                'May require observation'
            ];
            actions = ['Standard Queue', 'Order Tests', 'Schedule Follow-up'];
            break;
        default:
            urgency = 'Low';
            recommendations = [
                'Can be seen based on arrival time',
                'Routine evaluation appropriate',
                'Outpatient follow-up may be considered'
            ];
            actions = ['Regular Queue', 'OPD Referral'];
    }

    return { priority, urgency, recommendations, actions };
}

function displayTriageResult(analysis) {
    const resultDiv = document.getElementById('triageResult');
    const priorityIndicator = document.getElementById('priorityIndicator');
    const recommendation = document.getElementById('aiRecommendation');
    const actionsDiv = document.getElementById('suggestedActions');

    // Update priority indicator
    const priorityLevel = priorityIndicator.querySelector('.priority-level');
    const priorityText = priorityIndicator.querySelector('.priority-text');

    priorityLevel.textContent = `P${analysis.priority}`;
    priorityLevel.className = `priority-level p${analysis.priority}`;
    priorityText.textContent = analysis.urgency;
    priorityText.className = `priority-text ${analysis.urgency.toLowerCase()}`;

    // Update recommendations
    recommendation.innerHTML = `
        <h4><i class="fas fa-robot"></i> AI Recommendation</h4>
        <ul>
            ${analysis.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
    `;

    // Update actions
    actionsDiv.innerHTML = analysis.actions.map(action => 
        `<button class="action-btn" onclick="executeTriageAction('${action}')">${action}</button>`
    ).join('');

    resultDiv.style.display = 'block';
    
    // Add entry animation
    resultDiv.style.animation = 'none';
    resultDiv.offsetHeight; // Trigger reflow
    resultDiv.style.animation = 'slideInActivity 0.5s ease';

    toast.show(`Triage Complete: Priority ${analysis.priority} - ${analysis.urgency}`, 
        analysis.priority <= 2 ? 'warning' : 'success');
}

function executeTriageAction(action) {
    toast.show(`Executing: ${action}`, 'info');
    // Add actual action logic here
}

// Emergency Code Alerts
let emergencyTimer = null;
let emergencySeconds = 0;

function triggerCodeAlert(code) {
    const codes = {
        blue: { name: 'CODE BLUE', description: 'Cardiac/Respiratory Emergency', color: '#3b82f6' },
        red: { name: 'CODE RED', description: 'Fire Emergency', color: '#ef4444' },
        orange: { name: 'CODE ORANGE', description: 'Mass Casualty Incident', color: '#f97316' },
        green: { name: 'ALL CLEAR', description: 'Emergency Cancelled', color: '#10b981' }
    };

    const codeInfo = codes[code];

    if (code === 'green') {
        dismissEmergency();
        toast.show('All emergency alerts cleared', 'success');
        return;
    }

    // Show emergency banner
    const banner = document.getElementById('emergencyBanner');
    banner.querySelector('.alert-text').textContent = `${codeInfo.name} - Location Pending`;
    banner.style.display = 'flex';
    banner.style.background = `linear-gradient(135deg, ${codeInfo.color}, ${codeInfo.color}dd)`;

    // Start timer
    emergencySeconds = 0;
    if (emergencyTimer) clearInterval(emergencyTimer);
    emergencyTimer = setInterval(() => {
        emergencySeconds++;
        const mins = Math.floor(emergencySeconds / 60);
        const secs = emergencySeconds % 60;
        banner.querySelector('.alert-time').textContent = 
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);

    // Emit socket event
    socket.emit('emergencyAlert', { code: codeInfo.name, time: new Date() });

    // Play alert sound (browser may block)
    playAlertSound();

    // Add to activity feed
    addActivity('critical', `${codeInfo.name} activated - Emergency response initiated`);

    toast.show(`${codeInfo.name} Activated!`, 'error');
}

function dismissEmergency() {
    const banner = document.getElementById('emergencyBanner');
    banner.style.display = 'none';
    if (emergencyTimer) {
        clearInterval(emergencyTimer);
        emergencyTimer = null;
    }
    emergencySeconds = 0;
}

function triggerEmergencyBroadcast() {
    const modal = document.createElement('div');
    modal.className = 'emergency-broadcast-modal';
    modal.innerHTML = `
        <i class="fas fa-exclamation-triangle emergency-icon"></i>
        <div class="emergency-type">EMERGENCY BROADCAST</div>
        <div class="emergency-location">Select Emergency Type</div>
        <div class="response-buttons" style="flex-wrap: wrap; justify-content: center;">
            <button class="btn-respond" style="background: #3b82f6; color: white;" onclick="selectEmergencyType('CODE BLUE - Cardiac Emergency')">
                <i class="fas fa-heartbeat"></i> CODE BLUE
            </button>
            <button class="btn-respond" style="background: #ef4444; color: white;" onclick="selectEmergencyType('CODE RED - Fire Emergency')">
                <i class="fas fa-fire"></i> CODE RED
            </button>
            <button class="btn-respond" style="background: #f97316; color: white;" onclick="selectEmergencyType('CODE ORANGE - Mass Casualty')">
                <i class="fas fa-biohazard"></i> CODE ORANGE
            </button>
            <button class="btn-respond cancel" onclick="this.closest('.emergency-broadcast-modal').remove()">
                Cancel
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    playAlertSound();
}

function selectEmergencyType(type) {
    const modal = document.querySelector('.emergency-broadcast-modal');
    modal.innerHTML = `
        <i class="fas fa-broadcast-tower emergency-icon"></i>
        <div class="emergency-type">${type.split(' - ')[0]}</div>
        <div class="emergency-location">${type.split(' - ')[1] || ''}</div>
        <input type="text" id="emergencyLocation" placeholder="Enter Location (e.g., ICU Room 5)" 
            style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
            color: white; padding: 1rem; border-radius: 8px; font-size: 1.2rem; width: 300px; 
            text-align: center; margin-bottom: 1rem;">
        <div class="response-buttons">
            <button class="btn-respond acknowledge" onclick="broadcastEmergency('${type}')">
                <i class="fas fa-broadcast-tower"></i> BROADCAST NOW
            </button>
            <button class="btn-respond cancel" onclick="this.closest('.emergency-broadcast-modal').remove()">
                Cancel
            </button>
        </div>
    `;
    document.getElementById('emergencyLocation').focus();
}

function broadcastEmergency(type) {
    const location = document.getElementById('emergencyLocation').value || 'Unspecified Location';
    const modal = document.querySelector('.emergency-broadcast-modal');
    
    // Update banner
    const banner = document.getElementById('emergencyBanner');
    banner.querySelector('.alert-text').textContent = `${type.split(' - ')[0]} - ${location}`;
    banner.style.display = 'flex';

    // Start timer
    emergencySeconds = 0;
    if (emergencyTimer) clearInterval(emergencyTimer);
    emergencyTimer = setInterval(() => {
        emergencySeconds++;
        const mins = Math.floor(emergencySeconds / 60);
        const secs = emergencySeconds % 60;
        banner.querySelector('.alert-time').textContent = 
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);

    // Socket broadcast
    socket.emit('emergencyBroadcast', { type, location, time: new Date() });

    // Add to feed
    addActivity('critical', `EMERGENCY BROADCAST: ${type} at ${location}`);

    modal.remove();
    toast.show(`Emergency broadcast sent to all stations!`, 'error');
}

function playAlertSound() {
    // Create audio context for alert sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'square';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.frequency.value = 600;
            setTimeout(() => oscillator.stop(), 200);
        }, 200);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Voice Command System
let voiceRecognition = null;
let isVoiceActive = false;

function toggleVoiceCommand() {
    const btn = document.getElementById('voiceCommandBtn');
    const visualizer = document.getElementById('voiceVisualizer');
    const status = document.getElementById('voiceStatus');
    const transcript = document.getElementById('voiceTranscript');

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast.show('Voice commands not supported in this browser', 'warning');
        return;
    }

    if (isVoiceActive) {
        // Stop voice recognition
        if (voiceRecognition) voiceRecognition.stop();
        isVoiceActive = false;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-microphone"></i> Voice Command';
        visualizer.classList.remove('active');
        status.textContent = 'Ready';
        return;
    }

    // Start voice recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;

    voiceRecognition.onstart = () => {
        isVoiceActive = true;
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop';
        visualizer.classList.add('active');
        status.textContent = 'Listening...';
        transcript.innerHTML = '<p style="color: #10b981;">🎤 Listening for commands...</p>';
    };

    voiceRecognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        transcript.innerHTML = `
            <p style="color: var(--text-primary);">${finalTranscript}</p>
            <p style="color: var(--text-secondary); font-style: italic;">${interimTranscript}</p>
        `;

        if (finalTranscript) {
            processVoiceCommand(finalTranscript.toLowerCase());
        }
    };

    voiceRecognition.onerror = (event) => {
        console.error('Voice error:', event.error);
        status.textContent = 'Error: ' + event.error;
    };

    voiceRecognition.onend = () => {
        if (isVoiceActive) {
            voiceRecognition.start(); // Restart if still active
        }
    };

    voiceRecognition.start();
}

function processVoiceCommand(command) {
    const transcript = document.getElementById('voiceTranscript');
    const status = document.getElementById('voiceStatus');
    let executed = false;
    let response = '';
    
    // Normalize command
    command = command.toLowerCase().trim();
    
    // ========== EMERGENCY CODES ==========
    if (command.includes('code blue')) {
        const roomMatch = command.match(/room\s*(\d+)/i) || command.match(/(\d+)/);
        const location = roomMatch ? `Room ${roomMatch[1]}` : 'Location Pending';
        triggerCodeAlert('blue');
        speakResponse(`Code Blue activated. ${location}. Emergency team alerted.`);
        response = `<span class="cmd-success">✓ CODE BLUE - ${location}</span>`;
        executed = true;
    } 
    else if (command.includes('code red')) {
        triggerCodeAlert('red');
        speakResponse('Code Red. Fire emergency activated. Evacuate immediately.');
        response = '<span class="cmd-success">✓ CODE RED - Fire Alert Activated</span>';
        executed = true;
    }
    else if (command.includes('code orange')) {
        triggerCodeAlert('orange');
        speakResponse('Code Orange. Mass casualty incident. All hands on deck.');
        response = '<span class="cmd-success">✓ CODE ORANGE - Mass Casualty Alert</span>';
        executed = true;
    }
    else if (command.includes('all clear') || command.includes('cancel alert') || command.includes('stand down')) {
        triggerCodeAlert('green');
        speakResponse('All clear. Emergency cancelled.');
        response = '<span class="cmd-success">✓ All alerts cleared</span>';
        executed = true;
    }
    
    // ========== NAVIGATION COMMANDS ==========
    else if (command.includes('dashboard') || command.includes('overview') || command.includes('home')) {
        window.location.hash = 'overview';
        speakResponse('Opening dashboard overview.');
        response = '<span class="cmd-nav">✓ Opening Dashboard</span>';
        executed = true;
    }
    else if (command.includes('emergency') || command.includes('er ') || command.includes('e.r.')) {
        window.location.hash = 'emergency';
        speakResponse('Opening emergency section.');
        response = '<span class="cmd-nav">✓ Opening Emergency</span>';
        executed = true;
    }
    else if (command.includes('icu') || command.includes('i.c.u') || command.includes('intensive care') || command.includes('check beds') || command.includes('bed management')) {
        window.location.hash = 'beds';
        speakResponse('Opening ICU and bed management.');
        response = '<span class="cmd-nav">✓ Opening Bed Management</span>';
        executed = true;
    }
    else if (command.includes('opd') || command.includes('o.p.d') || command.includes('outpatient')) {
        window.location.hash = 'opd';
        speakResponse('Opening OPD section.');
        response = '<span class="cmd-nav">✓ Opening OPD</span>';
        executed = true;
    }
    else if (command.includes('ipd') || command.includes('i.p.d') || command.includes('inpatient')) {
        window.location.hash = 'ipd';
        speakResponse('Opening IPD section.');
        response = '<span class="cmd-nav">✓ Opening IPD</span>';
        executed = true;
    }
    else if (command.includes('lab') || command.includes('laboratory') || command.includes('test results')) {
        window.location.hash = 'lab';
        speakResponse('Opening laboratory section.');
        response = '<span class="cmd-nav">✓ Opening Lab</span>';
        executed = true;
    }
    else if (command.includes('pharmacy') || command.includes('medicine') || command.includes('drugs')) {
        window.location.hash = 'pharmacy';
        speakResponse('Opening pharmacy section.');
        response = '<span class="cmd-nav">✓ Opening Pharmacy</span>';
        executed = true;
    }
    else if (command.includes('radiology') || command.includes('x-ray') || command.includes('imaging') || command.includes('scan')) {
        window.location.hash = 'radiology';
        speakResponse('Opening radiology section.');
        response = '<span class="cmd-nav">✓ Opening Radiology</span>';
        executed = true;
    }
    else if (command.includes('billing') || command.includes('bill') || command.includes('payment') || command.includes('invoice')) {
        window.location.hash = 'billing';
        speakResponse('Opening billing section.');
        response = '<span class="cmd-nav">✓ Opening Billing</span>';
        executed = true;
    }
    else if (command.includes('surgery') || command.includes('operation') || command.includes('ot ') || command.includes('o.t.') || command.includes('operating')) {
        window.location.hash = 'ot';
        speakResponse('Opening operation theater schedule.');
        response = '<span class="cmd-nav">✓ Opening OT Schedule</span>';
        executed = true;
    }
    else if (command.includes('analytics') || command.includes('reports') || command.includes('statistics')) {
        window.location.hash = 'analytics';
        speakResponse('Opening analytics and reports.');
        response = '<span class="cmd-nav">✓ Opening Analytics</span>';
        executed = true;
    }
    else if (command.includes('settings') || command.includes('configuration') || command.includes('preferences')) {
        window.location.hash = 'settings';
        speakResponse('Opening settings.');
        response = '<span class="cmd-nav">✓ Opening Settings</span>';
        executed = true;
    }
    else if (command.includes('insurance') || command.includes('claim')) {
        window.location.hash = 'insurance';
        speakResponse('Opening insurance section.');
        response = '<span class="cmd-nav">✓ Opening Insurance</span>';
        executed = true;
    }
    else if (command.includes('inventory') || command.includes('stock') || command.includes('supplies')) {
        window.location.hash = 'inventory';
        speakResponse('Opening inventory management.');
        response = '<span class="cmd-nav">✓ Opening Inventory</span>';
        executed = true;
    }
    else if (command.includes('hr') || command.includes('human resource') || command.includes('staff') || command.includes('employees')) {
        window.location.hash = 'hr';
        speakResponse('Opening HR section.');
        response = '<span class="cmd-nav">✓ Opening HR</span>';
        executed = true;
    }
    
    // ========== ACTION COMMANDS ==========
    else if (command.includes('add patient') || command.includes('new patient') || command.includes('register patient') || command.includes('admit patient')) {
        window.location.hash = 'opd';
        setTimeout(() => {
            const addBtn = document.querySelector('#opd .btn-primary');
            if (addBtn) addBtn.click();
        }, 500);
        speakResponse('Opening new patient registration.');
        response = '<span class="cmd-action">✓ Opening Patient Registration</span>';
        executed = true;
    }
    else if (command.includes('schedule surgery') || command.includes('book surgery') || command.includes('new surgery')) {
        window.location.hash = 'ot';
        setTimeout(() => {
            const scheduleBtn = document.querySelector('#ot .btn-primary');
            if (scheduleBtn) scheduleBtn.click();
        }, 500);
        speakResponse('Opening surgery scheduling.');
        response = '<span class="cmd-action">✓ Opening Surgery Scheduler</span>';
        executed = true;
    }
    else if (command.includes('order lab') || command.includes('new lab test') || command.includes('lab order')) {
        window.location.hash = 'lab';
        setTimeout(() => {
            const orderBtn = document.querySelector('#lab .btn-primary');
            if (orderBtn) orderBtn.click();
        }, 500);
        speakResponse('Opening lab test order form.');
        response = '<span class="cmd-action">✓ Opening Lab Order</span>';
        executed = true;
    }
    else if (command.includes('create bill') || command.includes('new bill') || command.includes('generate bill')) {
        window.location.hash = 'billing';
        setTimeout(() => {
            const billBtn = document.querySelector('#billing .btn-primary');
            if (billBtn) billBtn.click();
        }, 500);
        speakResponse('Opening billing form.');
        response = '<span class="cmd-action">✓ Opening Billing Form</span>';
        executed = true;
    }
    
    // ========== QUERY COMMANDS ==========
    else if (command.includes('find patient') || command.includes('search patient') || command.includes('patient status')) {
        const nameMatch = command.match(/(?:find|search|status)\s+(?:patient\s+)?(.+)/i);
        if (nameMatch && nameMatch[1]) {
            const patientName = nameMatch[1].trim();
            document.getElementById('globalSearch').value = patientName;
            globalSearchHandler(patientName);
            speakResponse(`Searching for patient ${patientName}.`);
            response = `<span class="cmd-action">✓ Searching: ${patientName}</span>`;
        } else {
            document.getElementById('globalSearch').focus();
            speakResponse('Ready to search. Please say the patient name.');
            response = '<span class="cmd-action">✓ Search activated - say patient name</span>';
        }
        executed = true;
    }
    else if (command.includes('hospital status') || command.includes('current status') || command.includes('hospital capacity')) {
        announceHospitalStatus();
        response = '<span class="cmd-info">✓ Hospital Status Announced</span>';
        executed = true;
    }
    else if (command.includes('available beds') || command.includes('how many beds') || command.includes('bed count')) {
        const availBeds = document.getElementById('aiAvailableBeds')?.textContent || '0';
        const icuBeds = document.getElementById('aiICUBeds')?.textContent || '0';
        speakResponse(`There are ${availBeds} general beds and ${icuBeds} ICU beds available.`);
        response = `<span class="cmd-info">✓ ${availBeds} beds, ${icuBeds} ICU available</span>`;
        executed = true;
    }
    else if (command.includes('emergency count') || command.includes('how many emergency')) {
        const emCount = document.getElementById('aiEmergencyCount')?.textContent || '0';
        speakResponse(`There are ${emCount} active emergency cases.`);
        response = `<span class="cmd-info">✓ ${emCount} emergency cases</span>`;
        executed = true;
    }
    
    // ========== UTILITY COMMANDS ==========
    else if (command.includes('help') || command.includes('what can you do') || command.includes('commands')) {
        speakResponse('I can help with navigation, emergency codes, patient search, and hospital status. Try saying Code Blue, Show Emergency, or Find Patient.');
        response = '<span class="cmd-info">✓ Showing available commands</span>';
        executed = true;
    }
    else if (command.includes('time') || command.includes('what time')) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        speakResponse(`The current time is ${timeStr}.`);
        response = `<span class="cmd-info">✓ Time: ${timeStr}</span>`;
        executed = true;
    }
    else if (command.includes('date') || command.includes('what date') || command.includes('today')) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        speakResponse(`Today is ${dateStr}.`);
        response = `<span class="cmd-info">✓ ${dateStr}</span>`;
        executed = true;
    }
    else if (command.includes('stop listening') || command.includes('stop voice') || command.includes('deactivate')) {
        toggleVoiceCommand();
        speakResponse('Voice commands deactivated.');
        response = '<span class="cmd-info">✓ Voice commands stopped</span>';
        executed = true;
    }
    else if (command.includes('optimize') || command.includes('run optimization')) {
        optimizeResources();
        speakResponse('Running AI resource optimization.');
        response = '<span class="cmd-action">✓ Running Optimization</span>';
        executed = true;
    }
    else if (command.includes('broadcast') || command.includes('emergency broadcast')) {
        triggerEmergencyBroadcast();
        speakResponse('Opening emergency broadcast.');
        response = '<span class="cmd-action">✓ Emergency Broadcast</span>';
        executed = true;
    }
    else if (command.includes('triage') || command.includes('analyze symptoms')) {
        document.getElementById('symptomInput')?.focus();
        speakResponse('Ready for triage. Please enter patient symptoms.');
        response = '<span class="cmd-action">✓ Triage Ready - Enter symptoms</span>';
        executed = true;
    }
    else if (command.includes('logout') || command.includes('sign out') || command.includes('log out')) {
        speakResponse('Logging out. Goodbye.');
        setTimeout(() => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }, 1500);
        response = '<span class="cmd-warning">✓ Logging out...</span>';
        executed = true;
    }
    else if (command.includes('refresh') || command.includes('reload')) {
        speakResponse('Refreshing data.');
        location.reload();
        response = '<span class="cmd-action">✓ Refreshing...</span>';
        executed = true;
    }
    
    // ========== UNKNOWN COMMAND ==========
    if (!executed) {
        speakResponse(`Sorry, I didn't understand: ${command}. Try saying Help for available commands.`);
        response = `<span class="cmd-error">✗ Unknown: "${command}"</span>`;
    }
    
    // Update transcript
    transcript.innerHTML = response;
    
    // Update status indicator
    if (status) {
        status.textContent = executed ? 'Command Executed' : 'Unknown Command';
        status.className = `voice-status ${executed ? 'success' : 'error'}`;
        setTimeout(() => {
            status.textContent = 'Listening...';
            status.className = 'voice-status';
        }, 2000);
    }
    
    // Log activity
    addActivity(executed ? 'success' : 'warning', `Voice: "${command}"`);
}

// Text-to-Speech Response
function speakResponse(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        // Try to use a female voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female'));
        if (preferredVoice) utterance.voice = preferredVoice;
        
        speechSynthesis.speak(utterance);
    }
}

// Announce Hospital Status
function announceHospitalStatus() {
    const emergency = document.getElementById('aiEmergencyCount')?.textContent || '0';
    const beds = document.getElementById('aiAvailableBeds')?.textContent || '0';
    const icu = document.getElementById('aiICUBeds')?.textContent || '0';
    const ot = document.getElementById('aiOTRooms')?.textContent || '0';
    const capacity = document.getElementById('hospitalCapacityText')?.textContent || '0%';
    
    const status = `Hospital Status Report. ${emergency} active emergency cases. ${beds} general beds available. ${icu} ICU beds available. ${ot} operating rooms available. Hospital capacity at ${capacity}.`;
    speakResponse(status);
}

// Activity Feed Management
function addActivity(type, text) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = `activity-item ${type}`;
    
    const icons = {
        critical: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        success: 'fas fa-check-circle',
        info: 'fas fa-info-circle'
    };

    item.innerHTML = `
        <span class="activity-time">Just now</span>
        <span class="activity-icon"><i class="${icons[type]}"></i></span>
        <span class="activity-text">${text}</span>
    `;

    feed.insertBefore(item, feed.firstChild);

    // Update count
    const count = document.getElementById('activityCount');
    if (count) {
        const num = parseInt(count.textContent) + 1;
        count.textContent = `${num} events`;
    }

    // Limit feed items
    while (feed.children.length > 20) {
        feed.removeChild(feed.lastChild);
    }
}

// Prediction Chart
let predictionChart = null;

function initPredictionChart() {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;

    if (predictionChart) predictionChart.destroy();

    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Now', '+4h', '+8h', '+12h', '+16h', '+20h', '+24h'],
            datasets: [{
                label: 'Predicted Occupancy',
                data: [65, 68, 72, 75, 70, 68, 65],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Capacity Threshold',
                data: [85, 85, 85, 85, 85, 85, 85],
                borderColor: '#ef4444',
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#9ca3af' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9ca3af' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

function updatePredictions() {
    const timeframe = document.getElementById('predictionTimeframe').value;
    let admissions, discharges, emergency;

    switch (timeframe) {
        case '24h':
            admissions = '12-18';
            discharges = '8-12';
            emergency = '5-8';
            break;
        case '48h':
            admissions = '25-35';
            discharges = '18-25';
            emergency = '10-15';
            break;
        case '7d':
            admissions = '80-120';
            discharges = '70-100';
            emergency = '35-50';
            break;
    }

    document.getElementById('predictedAdmissions').textContent = admissions;
    document.getElementById('predictedDischarges').textContent = discharges;
    document.getElementById('predictedEmergency').textContent = emergency;

    toast.show(`Predictions updated for ${timeframe}`, 'info');
}

// Resource Optimization
function optimizeResources() {
    toast.show('AI analyzing resource allocation...', 'info');
    
    setTimeout(() => {
        const recommendations = document.getElementById('resourceRecommendations');
        
        // Add new recommendation
        const newRec = document.createElement('div');
        newRec.className = 'recommendation-item info';
        newRec.innerHTML = `
            <i class="fas fa-lightbulb"></i>
            <div class="rec-content">
                <strong>New Optimization Found</strong>
                <p>Shift 2 nurses from General Ward to Emergency - based on current patient load</p>
            </div>
            <button class="btn-apply" onclick="applyRecommendation('nurse-shift')">Apply</button>
        `;
        recommendations.insertBefore(newRec, recommendations.firstChild);
        
        toast.show('New optimization recommendations available!', 'success');
        addActivity('success', 'AI resource optimization completed');
    }, 2000);
}

function applyRecommendation(type) {
    toast.show(`Applying recommendation: ${type}`, 'success');
    
    // Update button
    event.target.textContent = 'Applied';
    event.target.className = 'btn-applied';
    event.target.disabled = true;
    
    addActivity('success', `Recommendation applied: ${type}`);
}

// Initialize AI Command Center
let aiCommandCenterInitialized = false;

function initAICommandCenter() {
    if (aiCommandCenterInitialized) {
        // Just update stats on subsequent visits
        updateAIStats();
        return;
    }
    
    aiCommandCenterInitialized = true;
    
    // Update real-time stats
    updateAIStats();
    
    // Initialize prediction chart
    initPredictionChart();
    
    // Add initial demo activities
    populateDemoActivities();
    
    // Start periodic updates
    setInterval(updateAIStats, 30000);
    
    // Socket listeners for real-time updates
    socket.on('emergencyAlert', (data) => {
        addActivity('critical', `Emergency Alert: ${data.code}`);
    });
    
    // Simulate periodic activity updates
    setInterval(() => {
        const events = [
            { type: 'success', text: 'Patient discharged: Room 205 now available' },
            { type: 'info', text: 'Lab results ready for Patient #2847' },
            { type: 'warning', text: 'Bed occupancy reaching 85% in General Ward' },
            { type: 'success', text: 'Surgery completed: OT-2 now available' },
            { type: 'info', text: 'New admission assigned to ICU Bed 3' }
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        addActivity(randomEvent.type, randomEvent.text);
    }, 15000);
}

function populateDemoActivities() {
    const demoActivities = [
        { type: 'success', text: 'AI system initialized and ready' },
        { type: 'info', text: 'Morning shift handover completed' },
        { type: 'warning', text: 'ICU Bed 5 patient vitals need attention' },
        { type: 'success', text: 'Emergency patient stabilized - moved to General Ward' },
        { type: 'info', text: 'Surgery scheduled for OT-1 at 10:00 AM' }
    ];
    
    demoActivities.forEach((activity, index) => {
        setTimeout(() => {
            addActivity(activity.type, activity.text);
        }, index * 200);
    });
}

async function updateAIStats() {
    try {
        const stats = await api.getStats();
        if (stats.success) {
            document.getElementById('aiEmergencyCount').textContent = stats.data.emergencyCount || 0;
            
            // Calculate available beds from bed data
            const bedsResponse = await api.getBedStats();
            if (bedsResponse.success) {
                document.getElementById('aiAvailableBeds').textContent = bedsResponse.data.available || 0;
                document.getElementById('aiICUBeds').textContent = Math.floor(Math.random() * 5) + 2; // Demo
                document.getElementById('aiOTRooms').textContent = Math.floor(Math.random() * 3) + 1; // Demo
                
                // Update capacity bar
                const total = bedsResponse.data.total || 100;
                const occupied = bedsResponse.data.occupied || 0;
                const capacity = Math.round((occupied / total) * 100);
                
                document.getElementById('hospitalCapacityBar').style.width = `${capacity}%`;
                document.getElementById('hospitalCapacityText').textContent = `${capacity}%`;
            }
        }
    } catch (err) {
        console.error('Error updating AI stats:', err);
    }
}

// Initialize when command center is viewed
document.addEventListener('DOMContentLoaded', () => {
    // Check if command-center section exists
    const commandCenter = document.getElementById('command-center');
    if (commandCenter) {
        // Initialize when section becomes active
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    initAICommandCenter();
                }
            });
        });
        observer.observe(commandCenter, { attributes: true, attributeFilter: ['class'] });
    }
});

// ==================== NEW MODULE TAB FUNCTIONS ====================

// Pharmacy Tab Functions
function switchPharmacyTab(tabName, element) {
    // Remove active from all tabs
    document.querySelectorAll('#pharmacy .sub-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pharmacy-tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active to selected
    element.classList.add('active');
    const tabContent = document.getElementById(`pharmacy${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Load tab data
    switch(tabName) {
        case 'prescriptions':
            loadPharmacyPrescriptions();
            break;
        case 'batches':
            loadBatchInventory();
            break;
        case 'expiry':
            loadExpiryTracking();
            break;
        case 'alerts':
            loadSafetyAlerts();
            break;
    }
}

async function loadPharmacyPrescriptions() {
    try {
        const response = await fetch('/api/pharmacy/prescriptions');
        const data = await response.json();
        if (data.success) {
            renderPrescriptionsTable(data.data);
        }
    } catch (err) {
        console.error('Error loading prescriptions:', err);
    }
}

async function loadBatchInventory() {
    try {
        const response = await fetch('/api/pharmacy/batches');
        const data = await response.json();
        if (data.success) {
            renderBatchInventoryTable(data.data);
        }
    } catch (err) {
        console.error('Error loading batches:', err);
    }
}

async function loadExpiryTracking() {
    try {
        const response = await fetch('/api/pharmacy/batches/expiring?days=90');
        const data = await response.json();
        if (data.success) {
            renderExpiryTable(data.data);
            updateExpiryCounts(data.data);
        }
    } catch (err) {
        console.error('Error loading expiry data:', err);
    }
}

async function loadSafetyAlerts() {
    // Load drug recalls, allergy alerts, interaction alerts
    try {
        // These would be populated from actual data
        document.getElementById('drugRecallsList').innerHTML = '<p class="no-data">No active drug recalls</p>';
        document.getElementById('allergyAlertsList').innerHTML = '<p class="no-data">No allergy alerts today</p>';
        document.getElementById('interactionAlertsList').innerHTML = '<p class="no-data">No interaction alerts</p>';
    } catch (err) {
        console.error('Error loading safety alerts:', err);
    }
}

function renderBatchInventoryTable(batches) {
    const tbody = document.getElementById('batchInventoryTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = batches.map(batch => `
        <tr>
            <td><strong>${batch.batchNumber}</strong></td>
            <td>${batch.drug?.brandName || batch.drugName || 'N/A'}</td>
            <td>${batch.drug?.genericName || batch.genericName || 'N/A'}</td>
            <td>${batch.receivedQuantity}</td>
            <td>${batch.currentQuantity}</td>
            <td>₹${batch.mrp?.toFixed(2) || '0.00'}</td>
            <td>${new Date(batch.expiryDate).toLocaleDateString()}</td>
            <td><span class="status-badge ${batch.status?.toLowerCase().replace(' ', '-')}">${batch.status}</span></td>
            <td>
                <button class="btn-action" onclick="viewBatchDetails('${batch._id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action" onclick="adjustBatchStock('${batch._id}')" title="Adjust Stock">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderExpiryTable(batches) {
    const tbody = document.getElementById('expiryTrackingTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = batches.map(batch => {
        const daysToExpiry = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysToExpiry <= 7 ? 'danger' : daysToExpiry <= 30 ? 'warning' : 'caution';
        
        return `
            <tr class="${urgencyClass}">
                <td>${batch.drug?.brandName || batch.drugName}</td>
                <td>${batch.batchNumber}</td>
                <td>${batch.currentQuantity}</td>
                <td>${new Date(batch.expiryDate).toLocaleDateString()}</td>
                <td><span class="days-badge ${urgencyClass}">${daysToExpiry} days</span></td>
                <td>₹${(batch.currentQuantity * (batch.costPrice || 0)).toFixed(2)}</td>
                <td>
                    <button class="btn-action" onclick="markForReturn('${batch._id}')" title="Mark for Return">
                        <i class="fas fa-undo"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateExpiryCounts(batches) {
    const now = new Date();
    let expired = 0, exp7 = 0, exp30 = 0, exp90 = 0;
    
    batches.forEach(b => {
        const days = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (days <= 0) expired++;
        else if (days <= 7) exp7++;
        else if (days <= 30) exp30++;
        else if (days <= 90) exp90++;
    });
    
    document.getElementById('expiredCount').textContent = expired;
    document.getElementById('expiring7Days').textContent = exp7;
    document.getElementById('expiring30Days').textContent = exp30;
    document.getElementById('expiring90Days').textContent = exp90;
}

// Insurance Tab Functions
function switchInsuranceTab(tabName, element) {
    document.querySelectorAll('#insurance .sub-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.insurance-tab-content').forEach(c => c.classList.remove('active'));
    
    element.classList.add('active');
    const tabContent = document.getElementById(`insurance${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    switch(tabName) {
        case 'policies':
            loadInsurancePolicies();
            break;
        case 'preauth':
            loadPreAuthorizations();
            break;
        case 'claims':
            loadInsuranceClaims();
            break;
        case 'settlements':
            loadSettlements();
            break;
    }
}

async function loadInsurancePolicies() {
    try {
        const response = await fetch('/api/insurance?status=Active');
        const data = await response.json();
        if (data.success) {
            renderPoliciesTable(data.data);
        }
    } catch (err) {
        console.error('Error loading policies:', err);
    }
}

async function loadPreAuthorizations() {
    try {
        const response = await fetch('/api/insurance?limit=100');
        const data = await response.json();
        // Extract pre-auths from policies
        if (data.success) {
            const preAuths = [];
            data.data.forEach(policy => {
                (policy.preAuthorizations || []).forEach(pa => {
                    preAuths.push({ ...pa, policyId: policy._id, patientName: policy.patientName });
                });
            });
            renderPreAuthTable(preAuths);
        }
    } catch (err) {
        console.error('Error loading pre-authorizations:', err);
    }
}

async function loadInsuranceClaims() {
    try {
        const response = await fetch('/api/insurance?limit=100');
        const data = await response.json();
        if (data.success) {
            const claims = [];
            data.data.forEach(policy => {
                (policy.claims || []).forEach(claim => {
                    claims.push({ ...claim, policyId: policy._id, patientName: policy.patientName, insuranceProvider: policy.insuranceProvider, policyNumber: policy.policyNumber });
                });
            });
            renderClaimsTable(claims);
        }
    } catch (err) {
        console.error('Error loading claims:', err);
    }
}

async function loadSettlements() {
    try {
        const response = await fetch('/api/insurance?limit=100');
        const data = await response.json();
        if (data.success) {
            const settlements = [];
            data.data.forEach(policy => {
                (policy.claims || []).filter(c => c.status === 'Settled').forEach(claim => {
                    settlements.push({ ...claim, patientName: policy.patientName, insuranceProvider: policy.insuranceProvider });
                });
            });
            renderSettlementsTable(settlements);
        }
    } catch (err) {
        console.error('Error loading settlements:', err);
    }
}

function renderPoliciesTable(policies) {
    const tbody = document.getElementById('insurancePoliciesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = policies.map(policy => `
        <tr>
            <td><strong>${policy.policyNumber}</strong></td>
            <td>${policy.patientName || 'N/A'}<br><small>${policy.uhid || ''}</small></td>
            <td>${policy.insuranceProvider}</td>
            <td>${policy.tpaDetails?.tpaName || 'Direct'}</td>
            <td>₹${policy.coverage?.sumInsured?.toLocaleString() || 0}</td>
            <td>₹${policy.utilization?.totalClaimed?.toLocaleString() || 0}</td>
            <td>${new Date(policy.policyEndDate).toLocaleDateString()}</td>
            <td><span class="status-badge ${policy.status?.toLowerCase()}">${policy.status}</span></td>
            <td>
                <button class="btn-action" onclick="viewPolicy('${policy._id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action" onclick="requestPreAuth('${policy._id}')" title="Pre-Auth">
                    <i class="fas fa-clipboard-check"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderPreAuthTable(preAuths) {
    const tbody = document.getElementById('preAuthTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = preAuths.map(pa => `
        <tr>
            <td><strong>${pa.preAuthNumber || 'N/A'}</strong></td>
            <td>${pa.patientName || 'N/A'}</td>
            <td>${pa.admissionType || 'N/A'}</td>
            <td>${pa.diagnosis || 'N/A'}</td>
            <td>${(pa.icdCodes || []).join(', ') || 'N/A'}</td>
            <td>₹${pa.requestedAmount?.toLocaleString() || 0}</td>
            <td>₹${pa.approvedAmount?.toLocaleString() || 0}</td>
            <td><span class="status-badge ${pa.status?.toLowerCase()}">${pa.status}</span></td>
            <td>
                <button class="btn-action" onclick="viewPreAuth('${pa.policyId}', '${pa._id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderClaimsTable(claims) {
    const tbody = document.getElementById('insuranceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = claims.map(claim => `
        <tr>
            <td><strong>${claim.claimNumber || 'N/A'}</strong></td>
            <td>${claim.patientName || 'N/A'}</td>
            <td>${claim.insuranceProvider || 'N/A'}</td>
            <td>${claim.policyNumber || 'N/A'}</td>
            <td>₹${claim.billDetails?.totalBillAmount?.toLocaleString() || 0}</td>
            <td>₹${claim.billDetails?.claimableAmount?.toLocaleString() || 0}</td>
            <td>${claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString() : 'N/A'}</td>
            <td><span class="status-badge ${claim.status?.toLowerCase().replace(' ', '-')}">${claim.status}</span></td>
            <td>
                <button class="btn-action" onclick="viewClaim('${claim.policyId}', '${claim._id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderSettlementsTable(settlements) {
    const tbody = document.getElementById('settlementsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = settlements.map(s => `
        <tr>
            <td><strong>${s.claimNumber || 'N/A'}</strong></td>
            <td>${s.patientName || 'N/A'}</td>
            <td>${s.insuranceProvider || 'N/A'}</td>
            <td>₹${s.billDetails?.claimableAmount?.toLocaleString() || 0}</td>
            <td>₹${s.settlement?.settledAmount?.toLocaleString() || 0}</td>
            <td>₹${s.settlement?.tdsDeducted?.toLocaleString() || 0}</td>
            <td>${s.settlement?.settledAt ? new Date(s.settlement.settledAt).toLocaleDateString() : 'N/A'}</td>
            <td>${s.settlement?.transactionReference || 'N/A'}</td>
        </tr>
    `).join('');
}

// Inventory Tab Functions
function switchInventoryTab(tabName, element) {
    document.querySelectorAll('#inventory .sub-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.inventory-tab-content').forEach(c => c.classList.remove('active'));
    
    element.classList.add('active');
    const tabContent = document.getElementById(`inventory${tabName.charAt(0).toUpperCase() + tabName.slice(1).replace('-', '')}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    switch(tabName) {
        case 'stock':
            loadStockOverview();
            break;
        case 'purchase-orders':
            loadPurchaseOrders();
            break;
        case 'grn':
            loadGRNs();
            break;
        case 'vendors':
            loadVendors();
            break;
        case 'reports':
            // Reports tab is static
            break;
    }
}

async function loadStockOverview() {
    // This uses existing inventory loading logic
    // Could be enhanced to use new API endpoints
}

async function loadPurchaseOrders() {
    try {
        const response = await fetch('/api/inventory/purchase-orders');
        const data = await response.json();
        if (data.success) {
            renderPurchaseOrdersTable(data.data);
            updatePOStats(data.data);
        }
    } catch (err) {
        console.error('Error loading purchase orders:', err);
    }
}

async function loadGRNs() {
    try {
        const response = await fetch('/api/inventory/grns');
        const data = await response.json();
        if (data.success) {
            renderGRNTable(data.data);
        }
    } catch (err) {
        console.error('Error loading GRNs:', err);
    }
}

async function loadVendors() {
    try {
        const response = await fetch('/api/inventory/vendors');
        const data = await response.json();
        if (data.success) {
            renderVendorsTable(data.data);
        }
    } catch (err) {
        console.error('Error loading vendors:', err);
    }
}

function renderPurchaseOrdersTable(pos) {
    const tbody = document.getElementById('purchaseOrdersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = pos.map(po => `
        <tr>
            <td><strong>${po.poNumber}</strong></td>
            <td>${po.vendorName || po.vendor?.name || 'N/A'}</td>
            <td>${new Date(po.orderDate).toLocaleDateString()}</td>
            <td>${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</td>
            <td>${po.items?.length || 0} items</td>
            <td>₹${po.totalAmount?.toLocaleString() || 0}</td>
            <td><span class="status-badge ${po.status?.toLowerCase().replace(' ', '-')}">${po.status}</span></td>
            <td>
                <button class="btn-action" onclick="viewPO('${po._id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${po.status === 'Pending Approval' ? `<button class="btn-action success" onclick="approvePO('${po._id}')" title="Approve"><i class="fas fa-check"></i></button>` : ''}
            </td>
        </tr>
    `).join('');
}

function updatePOStats(pos) {
    document.getElementById('poDraftCount').textContent = pos.filter(p => p.status === 'Draft').length;
    document.getElementById('poPendingApprovalCount').textContent = pos.filter(p => p.status === 'Pending Approval').length;
    document.getElementById('poApprovedCount').textContent = pos.filter(p => p.status === 'Approved').length;
    document.getElementById('poReceivedCount').textContent = pos.filter(p => p.status === 'Received').length;
}

function renderGRNTable(grns) {
    const tbody = document.getElementById('grnTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = grns.map(grn => `
        <tr>
            <td><strong>${grn.grnNumber}</strong></td>
            <td>${grn.poNumber || 'Direct'}</td>
            <td>${grn.vendorName || grn.vendor?.name || 'N/A'}</td>
            <td>${new Date(grn.receiptDate).toLocaleDateString()}</td>
            <td>${grn.items?.length || 0} items</td>
            <td>₹${grn.invoiceAmount?.toLocaleString() || 0}</td>
            <td><span class="status-badge ${grn.status?.toLowerCase().replace(' ', '-')}">${grn.status}</span></td>
            <td>
                <button class="btn-action" onclick="viewGRN('${grn._id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${grn.status === 'Received' ? `<button class="btn-action" onclick="processQC('${grn._id}')" title="Quality Check"><i class="fas fa-clipboard-check"></i></button>` : ''}
                ${grn.status === 'Quality Checked' ? `<button class="btn-action success" onclick="postToInventory('${grn._id}')" title="Post to Inventory"><i class="fas fa-database"></i></button>` : ''}
            </td>
        </tr>
    `).join('');
}

function renderVendorsTable(vendors) {
    const tbody = document.getElementById('vendorsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = vendors.map(vendor => `
        <tr>
            <td><strong>${vendor.vendorCode}</strong></td>
            <td>${vendor.name}</td>
            <td>${vendor.vendorType || 'N/A'}</td>
            <td>${vendor.contact?.phone || vendor.contact?.email || 'N/A'}</td>
            <td>${vendor.creditTerms?.creditDays || 0} days</td>
            <td>${vendor.performanceMetrics?.rating ? `${vendor.performanceMetrics.rating.toFixed(1)}/5` : 'N/A'}</td>
            <td><span class="status-badge ${vendor.isActive ? 'active' : 'inactive'}">${vendor.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-action" onclick="viewVendor('${vendor._id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action" onclick="editVendor('${vendor._id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// EMR Tab Functions
function switchEMRTab(tabName, element) {
    document.querySelectorAll('#emr .sub-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.emr-tab-content').forEach(c => c.classList.remove('active'));
    
    element.classList.add('active');
    const tabContent = document.getElementById(`emr${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    switch(tabName) {
        case 'records':
            // Default search view
            break;
        case 'active':
            loadActiveEncounters();
            break;
        case 'discharge':
            loadDischargeSummaries();
            break;
    }
}

async function loadActiveEncounters() {
    try {
        const response = await fetch('/api/emr?status=Active');
        const data = await response.json();
        if (data.success) {
            renderActiveEncounters(data.data);
        }
    } catch (err) {
        console.error('Error loading active encounters:', err);
        document.getElementById('activeEncountersGrid').innerHTML = '<p class="no-data">No active encounters</p>';
    }
}

async function loadDischargeSummaries() {
    try {
        const response = await fetch('/api/emr?hasDischargeSummary=true');
        const data = await response.json();
        if (data.success) {
            renderDischargeSummariesTable(data.data);
        }
    } catch (err) {
        console.error('Error loading discharge summaries:', err);
    }
}

function renderActiveEncounters(encounters) {
    const grid = document.getElementById('activeEncountersGrid');
    if (!grid) return;
    
    if (!encounters.length) {
        grid.innerHTML = '<p class="no-data">No active encounters</p>';
        return;
    }
    
    grid.innerHTML = encounters.map(enc => `
        <div class="encounter-card ${enc.encounterType?.toLowerCase() || 'opd'}">
            <div class="encounter-header">
                <div>
                    <div class="encounter-patient">${enc.patientName || 'Patient'}</div>
                    <div class="encounter-uhid">${enc.uhid || ''}</div>
                </div>
                <span class="encounter-type ${enc.encounterType?.toLowerCase() || 'opd'}">${enc.encounterType || 'OPD'}</span>
            </div>
            <div class="encounter-details">
                <p><strong>Chief Complaint:</strong> ${enc.chiefComplaint || 'Not recorded'}</p>
                <p><strong>Doctor:</strong> ${enc.consultingDoctor || 'N/A'}</p>
                <p><strong>Since:</strong> ${enc.admissionDate ? new Date(enc.admissionDate).toLocaleString() : 'Today'}</p>
            </div>
            <div class="encounter-actions">
                <button class="btn-secondary" onclick="viewEMR('${enc._id}')"><i class="fas fa-eye"></i> View</button>
                <button class="btn-primary" onclick="addProgressNote('${enc._id}')"><i class="fas fa-plus"></i> Add Note</button>
            </div>
        </div>
    `).join('');
}

function renderDischargeSummariesTable(records) {
    const tbody = document.getElementById('dischargeSummariesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = records.filter(r => r.dischargeSummary).map(record => {
        const ds = record.dischargeSummary;
        return `
            <tr>
                <td>${ds.dischargeDate ? new Date(ds.dischargeDate).toLocaleDateString() : 'N/A'}</td>
                <td>${record.patientName || 'N/A'}<br><small>${record.uhid || ''}</small></td>
                <td>${record.admissionDate ? new Date(record.admissionDate).toLocaleDateString() : 'N/A'}</td>
                <td>${ds.finalDiagnosis || 'N/A'}</td>
                <td><span class="status-badge">${ds.dischargeType || 'Normal'}</span></td>
                <td>${ds.conditionAtDischarge || 'N/A'}</td>
                <td>${ds.followUpDate ? new Date(ds.followUpDate).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn-action" onclick="viewDischargeSummary('${record._id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action" onclick="printDischargeSummary('${record._id}')" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Placeholder functions for modal opens
function openDrugMasterModal() { showToast('Drug Master modal coming soon', 'info'); }
function openInsuranceReportsModal() { showToast('Insurance Reports modal coming soon', 'info'); }
function openNewPurchaseOrderModal() { showToast('New PO modal coming soon', 'info'); }
function openVendorManagement() { switchInventoryTab('vendors', document.querySelector('#inventory .sub-tab:nth-child(4)')); }
function openNewGRNModal() { showToast('New GRN modal coming soon', 'info'); }
function openAddVendorModal() { showToast('Add Vendor modal coming soon', 'info'); }
function openNewEMRModal() { showToast('New EMR modal coming soon', 'info'); }

// Inventory report generation
function generateInventoryReport(reportType) {
    showToast(`Generating ${reportType.replace('-', ' ')} report...`, 'info');
    // Implementation would fetch and display/download the report
}

// View functions
function viewBatchDetails(id) { showToast('View batch: ' + id, 'info'); }
function adjustBatchStock(id) { showToast('Adjust batch: ' + id, 'info'); }
function markForReturn(id) { showToast('Mark for return: ' + id, 'info'); }
function viewPolicy(id) { showToast('View policy: ' + id, 'info'); }
function requestPreAuth(id) { showToast('Request pre-auth: ' + id, 'info'); }
function viewPreAuth(policyId, preAuthId) { showToast('View pre-auth', 'info'); }
function viewClaim(policyId, claimId) { showToast('View claim', 'info'); }
function viewPO(id) { showToast('View PO: ' + id, 'info'); }
function approvePO(id) { showToast('Approve PO: ' + id, 'success'); }
function viewGRN(id) { showToast('View GRN: ' + id, 'info'); }
function processQC(id) { showToast('Process QC: ' + id, 'info'); }
function postToInventory(id) { showToast('Post to inventory: ' + id, 'success'); }
function viewVendor(id) { showToast('View vendor: ' + id, 'info'); }
function editVendor(id) { showToast('Edit vendor: ' + id, 'info'); }
function viewEMR(id) { showToast('View EMR: ' + id, 'info'); }
function addProgressNote(id) { showToast('Add progress note: ' + id, 'info'); }
function viewDischargeSummary(id) { showToast('View discharge summary: ' + id, 'info'); }
function printDischargeSummary(id) { showToast('Print discharge summary: ' + id, 'info'); }

// Filter functions
function filterPrescriptions() {
    loadPharmacyPrescriptions();
}

function searchBatches() {
    loadBatchInventory();
}

function filterBatches() {
    loadBatchInventory();
}

function filterPolicies() {
    loadInsurancePolicies();
}

function filterClaims() {
    loadInsuranceClaims();
}

function filterPurchaseOrders() {
    loadPurchaseOrders();
}

function filterGRNs() {
    loadGRNs();
}

function filterVendors() {
    loadVendors();
}

function filterDischargeSummaries() {
    loadDischargeSummaries();
}
