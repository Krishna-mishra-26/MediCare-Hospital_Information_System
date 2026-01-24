const User = require('../models/User');
const { generateToken, getPermissionsForRole, ROLE_PERMISSIONS } = require('../middleware/auth');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (in production should be admin-only)
exports.register = async (req, res) => {
    try {
        const { 
            username, 
            password, 
            email,
            fullName,
            role, 
            department,
            employeeId,
            phone,
            specialization,
            qualification,
            licenseNumber
        } = req.body;

        // Check if username already exists
        const existingUser = await User.findOne({ 
            $or: [
                { username: username.toLowerCase() },
                { email: email ? email.toLowerCase() : undefined }
            ].filter(Boolean)
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username or email already exists' 
            });
        }

        // Create user
        const user = await User.create({
            username: username.toLowerCase(),
            password,
            email,
            fullName,
            role: role || 'receptionist',
            department,
            employeeId,
            phone,
            specialization,
            qualification,
            licenseNumber
        });

        sendTokenResponse(user, 201, res);
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate username & password
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide username and password' 
            });
        }

        // Check for user
        const user = await User.findOne({ 
            username: username.toLowerCase() 
        }).select('+password');

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // Check if account is locked
        if (user.isLocked()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(423).json({ 
                success: false, 
                error: `Account locked. Try again in ${remainingTime} minutes.` 
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ 
                success: false, 
                error: 'Account is deactivated. Contact administrator.' 
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            await user.incrementLoginAttempts();
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        sendTokenResponse(user, 200, res);
    } catch (err) {
        console.error('Login error:', err);
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const permissions = getPermissionsForRole(user.role);

        res.status(200).json({ 
            success: true, 
            data: {
                ...user.toObject(),
                permissions
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
    try {
        const fieldsToUpdate = {
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            department: req.body.department
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(key => 
            fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
        );

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.matchPassword(req.body.currentPassword);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                error: 'Current password is incorrect' 
            });
        }

        user.password = req.body.newPassword;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const { role, department, isActive } = req.query;
        const filter = {};

        if (role) filter.role = role;
        if (department) filter.department = department;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({ 
            success: true, 
            count: users.length,
            data: users 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update user (admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const { role, department, isActive, permissions } = req.body;
        
        const updates = {};
        if (role) updates.role = role;
        if (department) updates.department = department;
        if (isActive !== undefined) updates.isActive = isActive;
        if (permissions) updates.permissions = permissions;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Emit user updated event
        const socketHandler = req.app.get('socketHandler');
        if (socketHandler) {
            socketHandler.emitToUser(user._id, 'permissionsUpdated', {
                role: user.role,
                permissions: getPermissionsForRole(user.role)
            });
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get available roles and their permissions
// @route   GET /api/auth/roles
// @access  Private
exports.getRoles = async (req, res) => {
    try {
        const roles = Object.keys(ROLE_PERMISSIONS).map(role => ({
            name: role,
            ...ROLE_PERMISSIONS[role]
        }));

        res.status(200).json({ success: true, data: roles });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token with role included
    const token = generateToken(user);
    
    // Get permissions for the user's role
    const permissions = getPermissionsForRole(user.role);

    const options = {
        expires: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                department: user.department,
                permissions
            }
        });
};