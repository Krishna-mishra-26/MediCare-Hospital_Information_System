// Login functionality with RBAC support
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token is still valid
        verifyToken(token);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.toLowerCase().trim();
            const password = document.getElementById('password').value;
            
            // Simple validation
            if (!username || !password) {
                showLoginError('Please fill in all fields');
                return;
            }
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;

            api.login(username, password)
                .then(data => {
                    if (data.success) {
                        // Store auth data
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('currentUser', JSON.stringify(data.user)); // backward compatibility
                        
                        // Show success message
                        showLoginSuccess(`Welcome, ${data.user.fullName || data.user.username}!`);
                        
                        // Redirect after brief delay
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 500);
                    } else {
                        showLoginError(data.error || 'Login failed. Please check your credentials.');
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                })
                .catch(err => {
                    console.error('Login error:', err);
                    showLoginError(err.message || 'An error occurred. Please try again.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                });
        });
    }

    // Update login form to show available demo accounts
    updateDemoCredentials();
});

// Verify existing token
async function verifyToken(token) {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // Token is valid, redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
        }
    } catch (err) {
        console.log('Token verification failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
    }
}

// Show error message
function showLoginError(message) {
    let errorEl = document.querySelector('.login-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'login-error';
        const form = document.getElementById('loginForm');
        form.insertBefore(errorEl, form.firstChild);
    }
    errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorEl.style.display = 'flex';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Show success message
function showLoginSuccess(message) {
    let successEl = document.querySelector('.login-success');
    if (!successEl) {
        successEl = document.createElement('div');
        successEl.className = 'login-success';
        const form = document.getElementById('loginForm');
        form.insertBefore(successEl, form.firstChild);
    }
    successEl.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successEl.style.display = 'flex';
}

// Update demo credentials display
function updateDemoCredentials() {
    const credentialsEl = document.querySelector('.demo-credentials');
    if (credentialsEl) {
        credentialsEl.innerHTML = `
            <h4><i class="fas fa-key"></i> Demo Accounts</h4>
            <div class="credentials-grid">
                <div class="cred-item" onclick="fillCredentials('admin', 'admin123')">
                    <span class="role-badge admin">Admin</span>
                    <span>admin / admin123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('dr.sharma', 'doctor123')">
                    <span class="role-badge doctor">Doctor</span>
                    <span>dr.sharma / doctor123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('nurse.priya', 'nurse123')">
                    <span class="role-badge nurse">Nurse</span>
                    <span>nurse.priya / nurse123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('reception', 'reception123')">
                    <span class="role-badge reception">Reception</span>
                    <span>reception / reception123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('pharmacy', 'pharmacy123')">
                    <span class="role-badge pharmacy">Pharmacist</span>
                    <span>pharmacy / pharmacy123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('lab.tech', 'lab123')">
                    <span class="role-badge lab">Lab Tech</span>
                    <span>lab.tech / lab123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('radiologist', 'radio123')">
                    <span class="role-badge radiology">Radiologist</span>
                    <span>radiologist / radio123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('radio.tech', 'radio123')">
                    <span class="role-badge radiology">Radio Tech</span>
                    <span>radio.tech / radio123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('billing', 'billing123')">
                    <span class="role-badge billing">Billing</span>
                    <span>billing / billing123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('inventory', 'inventory123')">
                    <span class="role-badge inventory">Inventory</span>
                    <span>inventory / inventory123</span>
                </div>
                <div class="cred-item" onclick="fillCredentials('insurance', 'insurance123')">
                    <span class="role-badge insurance">Insurance</span>
                    <span>insurance / insurance123</span>
                </div>
            </div>
        `;
    }
}

// Fill credentials helper
function fillCredentials(username, password) {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    // Add visual feedback
    document.getElementById('username').classList.add('filled');
    document.getElementById('password').classList.add('filled');
    setTimeout(() => {
        document.getElementById('username').classList.remove('filled');
        document.getElementById('password').classList.remove('filled');
    }, 300);
}
