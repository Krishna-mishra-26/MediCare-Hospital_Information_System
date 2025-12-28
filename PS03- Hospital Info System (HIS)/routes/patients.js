const express = require('express');
const router = express.Router();
const { getPatients, createPatient, updatePatient, deletePatient } = require('../controllers/patients');

router.route('/')
    .get(getPatients)
    .post(createPatient);

router.route('/:id')
    .put(updatePatient)
    .delete(deletePatient);

module.exports = router;