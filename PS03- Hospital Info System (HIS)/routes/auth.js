const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getMe, 
    updateDetails,
    updatePassword,
    getUsers,
    updateUser,
    deleteUser,
    getRoles
} = require('../controllers/auth');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.get('/roles', protect, getRoles);

// Admin only routes
router.get('/users', protect, restrictTo('admin'), getUsers);
router.put('/users/:id', protect, restrictTo('admin'), updateUser);
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

module.exports = router;