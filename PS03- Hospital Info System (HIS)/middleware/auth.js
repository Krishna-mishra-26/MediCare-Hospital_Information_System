const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'hospital-his-secret-key-2024';

// Role Hierarchy and Permissions
const ROLE_PERMISSIONS = {
    admin: {
        level: 100,
        modules: ['all'],
        actions: ['create', 'read', 'update', 'delete', 'approve', 'manage']
    },
    doctor: {
        level: 80,
        modules: ['patients', 'emr', 'opd', 'ipd', 'emergency', 'ot', 'lab', 'radiology', 'pharmacy', 'prescriptions', 'appointments', 'triage', 'beds', 'insurance'],
        actions: ['create', 'read', 'update'],
        restrictions: {
            patients: ['read', 'update'],
            lab: ['create', 'read'], // Can order tests
            radiology: ['create', 'read'], // Can order imaging
            pharmacy: ['read'],
            prescriptions: ['create', 'read', 'update'],
            emr: ['create', 'read', 'update'],
            appointments: ['read', 'update'],
            triage: ['read', 'update'],
            insurance: ['read']
        }
    },
    nurse: {
        level: 60,
        modules: ['patients', 'opd', 'ipd', 'emergency', 'triage', 'beds', 'lab', 'pharmacy', 'emr'],
        actions: ['read', 'update'],
        restrictions: {
            patients: ['read', 'update'], // Can update vitals
            triage: ['create', 'read', 'update'],
            beds: ['read', 'update'],
            lab: ['read', 'update'], // Can collect samples
            pharmacy: ['read'], // View prescriptions
            emr: ['read', 'update'] // Can add nursing notes
        }
    },
    receptionist: {
        level: 40,
        modules: ['patients', 'opd', 'appointments', 'billing', 'insurance', 'beds'],
        actions: ['create', 'read', 'update'],
        restrictions: {
            patients: ['create', 'read', 'update'],
            appointments: ['create', 'read', 'update', 'delete'],
            billing: ['create', 'read', 'update'],
            insurance: ['read', 'update'],
            beds: ['read']
        }
    },
    pharmacist: {
        level: 50,
        modules: ['pharmacy', 'prescriptions', 'inventory', 'patients'],
        actions: ['read', 'update'],
        restrictions: {
            pharmacy: ['read', 'update'],
            prescriptions: ['read', 'update'], // Can dispense
            inventory: ['create', 'read', 'update'],
            patients: ['read']
        }
    },
    lab_technician: {
        level: 50,
        modules: ['lab', 'patients'],
        actions: ['read', 'update'],
        restrictions: {
            lab: ['read', 'update'], // Can update results
            patients: ['read']
        }
    },
    radiologist: {
        level: 70,
        modules: ['radiology', 'patients', 'emr'],
        actions: ['read', 'update'],
        restrictions: {
            radiology: ['read', 'update'], // Can add reports
            patients: ['read'],
            emr: ['read']
        }
    },
    radiology_technician: {
        level: 50,
        modules: ['radiology', 'patients'],
        actions: ['read', 'update'],
        restrictions: {
            radiology: ['read', 'update'], // Can upload images, update status
            patients: ['read']
        }
    },
    billing_clerk: {
        level: 40,
        modules: ['billing', 'patients', 'insurance'],
        actions: ['create', 'read', 'update'],
        restrictions: {
            billing: ['create', 'read', 'update'],
            patients: ['read'],
            insurance: ['read', 'update']
        }
    },
    inventory_manager: {
        level: 50,
        modules: ['inventory', 'pharmacy'],
        actions: ['create', 'read', 'update', 'delete', 'approve'],
        restrictions: {
            inventory: ['create', 'read', 'update', 'delete', 'approve'],
            pharmacy: ['read', 'update']
        }
    },
    insurance_coordinator: {
        level: 50,
        modules: ['insurance', 'patients', 'billing'],
        actions: ['create', 'read', 'update'],
        restrictions: {
            insurance: ['create', 'read', 'update'],
            patients: ['read'],
            billing: ['read']
        }
    }
};

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id, 
            username: user.username, 
            role: user.role,
            department: user.department 
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );
};

// Verify JWT Token Middleware
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Not authorized to access this route' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Add role permissions to request
        req.userPermissions = ROLE_PERMISSIONS[req.user.role] || ROLE_PERMISSIONS.receptionist;
        next();
    } catch (err) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token is invalid or expired' 
        });
    }
};

// Check if user has access to module
const authorizeModule = (...modules) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authenticated' 
            });
        }

        const userPerms = ROLE_PERMISSIONS[req.user.role];
        if (!userPerms) {
            return res.status(403).json({ 
                success: false, 
                error: 'Role not recognized' 
            });
        }

        // Admin has access to everything
        if (userPerms.modules.includes('all')) {
            return next();
        }

        // Check if user has access to any of the specified modules
        const hasAccess = modules.some(module => userPerms.modules.includes(module));
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                error: `Access denied. Your role (${req.user.role}) does not have permission to access this module.` 
            });
        }

        next();
    };
};

// Check specific action permission within a module
const authorizeAction = (module, action) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authenticated' 
            });
        }

        const userPerms = ROLE_PERMISSIONS[req.user.role];
        if (!userPerms) {
            return res.status(403).json({ 
                success: false, 
                error: 'Role not recognized' 
            });
        }

        // Admin has all permissions
        if (userPerms.modules.includes('all')) {
            return next();
        }

        // Check module access
        if (!userPerms.modules.includes(module)) {
            return res.status(403).json({ 
                success: false, 
                error: `Access denied to ${module} module` 
            });
        }

        // Check specific action permission
        const moduleRestrictions = userPerms.restrictions?.[module];
        const allowedActions = moduleRestrictions || userPerms.actions;
        
        if (!allowedActions.includes(action)) {
            return res.status(403).json({ 
                success: false, 
                error: `You don't have permission to ${action} in ${module}` 
            });
        }

        next();
    };
};

// Restrict to specific roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authenticated' 
            });
        }

        if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: `This action is restricted to: ${roles.join(', ')}` 
            });
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            req.userPermissions = ROLE_PERMISSIONS[req.user?.role];
        } catch (err) {
            // Token invalid but continue without user
        }
    }

    next();
};

// Get permissions for a role (for frontend)
const getPermissionsForRole = (role) => {
    return ROLE_PERMISSIONS[role] || null;
};

module.exports = {
    generateToken,
    protect,
    authorizeModule,
    authorizeAction,
    restrictTo,
    optionalAuth,
    getPermissionsForRole,
    ROLE_PERMISSIONS,
    JWT_SECRET
};
