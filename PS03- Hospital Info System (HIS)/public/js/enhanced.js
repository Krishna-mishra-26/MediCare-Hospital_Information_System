// Enhanced Features for Hospital Information System
// Toast Notification System
class ToastNotification {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type} toast-enter`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-times-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.remove('toast-enter'), 10);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

const toast = new ToastNotification();

// Real-time Clock
function updateClock() {
    const clockElement = document.getElementById('realTimeClock');
    if (clockElement) {
        const now = new Date();
        const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        };
        clockElement.textContent = now.toLocaleTimeString('en-US', options);
    }
}

// Notification System
class NotificationSystem {
    constructor() {
        this.notifications = this.loadNotifications();
        this.setupNotificationButton();
    }

    loadNotifications() {
        const stored = localStorage.getItem('notifications');
        return stored ? JSON.parse(stored) : [
            {
                id: 1,
                title: 'New Patient Admission',
                message: 'Patient Ramesh Joshi admitted to General Ward',
                time: '5 minutes ago',
                unread: true,
                type: 'info'
            },
            {
                id: 2,
                title: 'Critical Alert',
                message: 'ICU Bed 01: Patient vitals unstable',
                time: '10 minutes ago',
                unread: true,
                type: 'danger'
            },
            {
                id: 3,
                title: 'Low Stock Alert',
                message: '5 medicines are running low on stock',
                time: '30 minutes ago',
                unread: true,
                type: 'warning'
            },
            {
                id: 4,
                title: 'Insurance Claim Approved',
                message: 'Claim #CLM002 has been approved',
                time: '1 hour ago',
                unread: false,
                type: 'success'
            }
        ];
    }

    saveNotifications() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    addNotification(title, message, type = 'info') {
        const notification = {
            id: Date.now(),
            title,
            message,
            time: 'Just now',
            unread: true,
            type
        };
        this.notifications.unshift(notification);
        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
    }

    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.unread = false;
            this.saveNotifications();
            this.updateBadge();
        }
    }

    updateBadge() {
        const badge = document.querySelector('.nav-icon .badge');
        const unreadCount = this.notifications.filter(n => n.unread).length;
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    setupNotificationButton() {
        const notifBtn = document.getElementById('notificationBtn');
        if (notifBtn) {
            // Create dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'notification-dropdown';
            dropdown.id = 'notificationDropdown';
            
            notifBtn.parentElement.style.position = 'relative';
            notifBtn.parentElement.appendChild(dropdown);
            
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
                this.renderNotifications();
            });
            
            document.addEventListener('click', () => {
                dropdown.classList.remove('active');
            });
            
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    renderNotifications() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;
        
        const unreadCount = this.notifications.filter(n => n.unread).length;
        
        dropdown.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <button class="btn-text" onclick="notificationSystem.markAllAsRead()">Mark all as read</button>
            </div>
            <div class="notification-list">
                ${this.notifications.length === 0 ? 
                    '<div class="notification-item"><p>No notifications</p></div>' :
                    this.notifications.map(n => `
                        <div class="notification-item ${n.unread ? 'unread' : ''}" onclick="notificationSystem.markAsRead(${n.id})">
                            <div class="notification-title">
                                <i class="fas fa-${this.getIcon(n.type)}"></i>
                                ${n.title}
                            </div>
                            <div class="notification-message">${n.message}</div>
                            <div class="notification-time">${n.time}</div>
                        </div>
                    `).join('')
                }
            </div>
        `;
        
        this.updateBadge();
    }

    getIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'exclamation-circle'
        };
        return icons[type] || 'bell';
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.unread = false);
        this.saveNotifications();
        this.renderNotifications();
    }
}

let notificationSystem;

// Search Functionality
class SearchSystem {
    constructor() {
        this.setupSearch();
    }

    setupSearch() {
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            const resultsDiv = document.createElement('div');
            resultsDiv.className = 'search-results';
            searchInput.parentElement.appendChild(resultsDiv);
            
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value, resultsDiv);
            });
            
            searchInput.addEventListener('focus', (e) => {
                if (e.target.value) {
                    this.performSearch(e.target.value, resultsDiv);
                }
            });
            
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target)) {
                    resultsDiv.classList.remove('active');
                }
            });
        }
    }

    performSearch(query, resultsDiv) {
        if (!query || query.length < 2) {
            resultsDiv.classList.remove('active');
            return;
        }
        
        const allData = {
            ...JSON.parse(localStorage.getItem('opdPatients') || '[]').reduce((acc, p) => ({...acc, [p.id]: {...p, type: 'OPD Patient'}}), {}),
            ...JSON.parse(localStorage.getItem('ipdPatients') || '[]').reduce((acc, p) => ({...acc, [p.id]: {...p, type: 'IPD Patient'}}), {}),
        };
        
        const results = Object.values(allData).filter(item => 
            item.name?.toLowerCase().includes(query.toLowerCase()) ||
            item.id?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="search-result-item">No results found</div>';
        } else {
            resultsDiv.innerHTML = results.map(item => `
                <div class="search-result-item" onclick="viewPatientFromSearch('${item.id}', '${item.type}')">
                    <strong>${item.name}</strong>
                    <small>${item.type} - ${item.id}</small>
                </div>
            `).join('');
        }
        
        resultsDiv.classList.add('active');
    }
}

function viewPatientFromSearch(id, type) {
    toast.show(`Viewing ${type}: ${id}`, 'info');
    document.querySelector('.search-results').classList.remove('active');
}

// Auto-save functionality
class AutoSave {
    constructor() {
        this.setupAutoSave();
    }

    setupAutoSave() {
        // Save data every 30 seconds
        setInterval(() => {
            this.saveAllData();
        }, 30000);
    }

    saveAllData() {
        console.log('Auto-saving data...');
        // Data is already saved in localStorage, just sync if needed
    }
}

// Export/Print Functionality
function exportToCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.show(`Exported ${filename} successfully!`, 'success');
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ];
    
    return csvRows.join('\n');
}

function printReport(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Report</title>');
    printWindow.document.write('<link rel="stylesheet" href="css/style.css">');
    printWindow.document.write('</head><body>');
    printWindow.document.write(section.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    
    toast.show('Report sent to printer', 'success');
}

// Real-time Metrics Update
function updateMetrics() {
    // Simulate real-time updates
    const metrics = {
        totalPatients: Math.floor(1200 + Math.random() * 100),
        bedOccupancy: Math.floor(75 + Math.random() * 15),
        appointments: Math.floor(150 + Math.random() * 20),
        revenue: (8 + Math.random() * 2).toFixed(1)
    };
    
    // Update UI if elements exist
    const elements = {
        totalPatients: document.querySelector('.metric-card:nth-child(1) .metric-value'),
        bedOccupancy: document.querySelector('.metric-card:nth-child(2) .metric-value'),
        appointments: document.querySelector('.metric-card:nth-child(3) .metric-value'),
        revenue: document.querySelector('.metric-card:nth-child(4) .metric-value')
    };
    
    if (elements.totalPatients) elements.totalPatients.textContent = metrics.totalPatients;
    if (elements.bedOccupancy) elements.bedOccupancy.textContent = metrics.bedOccupancy + '%';
    if (elements.appointments) elements.appointments.textContent = metrics.appointments;
    if (elements.revenue) elements.revenue.textContent = '₹' + metrics.revenue + 'L';
}

// Enhanced Modal with Animations
function showEnhancedModal(title, content, size = 'medium') {
    const modalContainer = document.getElementById('modalContainer');
    const sizeClass = size === 'large' ? 'modal-large' : size === 'small' ? 'modal-small' : '';
    
    modalContainer.innerHTML = `
        <div class="modal active modal-fade-in">
            <div class="modal-content ${sizeClass}">
                <div class="modal-header">
                    <h2><i class="fas fa-clipboard-list"></i> ${title}</h2>
                    <button class="close-modal" onclick="closeEnhancedModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeEnhancedModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.classList.add('modal-fade-out');
        setTimeout(() => {
            document.getElementById('modalContainer').innerHTML = '';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search-box input')?.focus();
    }
    
    // ESC to close modal
    if (e.key === 'Escape') {
        closeEnhancedModal();
        closeModal();
    }
});

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for main dashboard to load
    setTimeout(() => {
        notificationSystem = new NotificationSystem();
        new SearchSystem();
        new AutoSave();
        
        // Start real-time clock
        if (document.getElementById('realTimeClock')) {
            updateClock();
            setInterval(updateClock, 1000);
        }
        
        // Update metrics periodically
        setInterval(updateMetrics, 5000);
        
        // Show welcome toast
        setTimeout(() => {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (user) {
                toast.show(`Welcome back, ${user.username}!`, 'success');
            }
        }, 500);
    }, 100);
});

// Data validation helpers
function validateForm(formData, rules) {
    const errors = [];
    
    for (const [field, rule] of Object.entries(rules)) {
        const value = formData.get(field);
        
        if (rule.required && !value) {
            errors.push(`${field} is required`);
        }
        
        if (rule.minLength && value && value.length < rule.minLength) {
            errors.push(`${field} must be at least ${rule.minLength} characters`);
        }
        
        if (rule.pattern && value && !rule.pattern.test(value)) {
            errors.push(`${field} format is invalid`);
        }
    }
    
    return errors;
}

// Smooth scroll to section
function smoothScrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
