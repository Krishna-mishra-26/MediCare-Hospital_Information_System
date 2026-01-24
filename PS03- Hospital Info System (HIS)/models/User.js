const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // Allow null but unique if present
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Don't return password by default
    },
    fullName: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: [
            'admin',
            'doctor',
            'nurse',
            'receptionist',
            'pharmacist',
            'lab_technician',
            'radiologist',
            'radiology_technician',
            'billing_clerk',
            'inventory_manager',
            'insurance_coordinator'
        ],
        default: 'receptionist'
    },
    department: {
        type: String,
        enum: [
            'Administration',
            'Emergency',
            'OPD',
            'IPD',
            'Surgery',
            'Radiology',
            'Laboratory',
            'Pharmacy',
            'Billing',
            'Inventory',
            'Insurance',
            'ICU',
            'Pediatrics',
            'Gynecology',
            'Orthopedics',
            'Cardiology',
            'Neurology',
            'General Medicine'
        ]
    },
    employeeId: {
        type: String,
        unique: true,
        sparse: true
    },
    phone: {
        type: String
    },
    specialization: {
        type: String // For doctors
    },
    qualification: {
        type: String
    },
    licenseNumber: {
        type: String // Medical license for doctors/nurses
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    permissions: {
        // Custom permissions override
        modules: [String],
        actions: [String]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
UserSchema.pre('save', function() {
    this.updatedAt = new Date();
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
UserSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
UserSchema.methods.incrementLoginAttempts = async function() {
    // Reset if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    
    // Increment attempts
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 failed attempts for 15 minutes
    if (this.loginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

// Reset login attempts on successful login
UserSchema.methods.resetLoginAttempts = async function() {
    return this.updateOne({
        $set: { loginAttempts: 0, lastLogin: new Date() },
        $unset: { lockUntil: 1 }
    });
};

// Virtual for display name
UserSchema.virtual('displayName').get(function() {
    return this.fullName || this.username;
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);