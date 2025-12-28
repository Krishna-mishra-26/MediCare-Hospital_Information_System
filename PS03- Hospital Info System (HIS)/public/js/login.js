// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            
            // Simple validation (demo purposes)
            if (username && password) {
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                submitBtn.disabled = true;

                api.login(username, password)
                    .then(data => {
                        if (data.success) {
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('currentUser', JSON.stringify(data.user));
                            window.location.href = 'dashboard.html';
                        } else {
                            alert(data.error || 'Login failed');
                            submitBtn.innerHTML = 'Login';
                            submitBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert('An error occurred');
                        submitBtn.innerHTML = 'Login';
                        submitBtn.disabled = false;
                    });
            } else {
                alert('Please fill in all fields');
            }
        });
    }
});
