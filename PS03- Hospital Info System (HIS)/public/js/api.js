// Dynamically set API URL based on current host
const API_URL = window.location.origin + '/api';

const api = {
    // Auth
    login: async (username, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return response.json();
    },

    register: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return response.json();
    },

    // Patients
    getPatients: async () => {
        const response = await fetch(`${API_URL}/patients`);
        return response.json();
    },

    createPatient: async (patientData) => {
        const response = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData)
        });
        return response.json();
    },

    // Dashboard
    getStats: async () => {
        const response = await fetch(`${API_URL}/dashboard/stats`);
        return response.json();
    },

    // Surgeries
    getSurgeries: async () => {
        const response = await fetch(`${API_URL}/surgeries`);
        return response.json();
    },

    createSurgery: async (surgeryData) => {
        const response = await fetch(`${API_URL}/surgeries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(surgeryData)
        });
        return response.json();
    },

    // Lab Tests
    getLabTests: async () => {
        const response = await fetch(`${API_URL}/labs`);
        return response.json();
    },

    createLabTest: async (testData) => {
        const response = await fetch(`${API_URL}/labs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        return response.json();
    },

    // Imaging
    getImagingOrders: async () => {
        const response = await fetch(`${API_URL}/imaging`);
        return response.json();
    },

    createImagingOrder: async (orderData) => {
        const response = await fetch(`${API_URL}/imaging`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        return response.json();
    },

    // Prescriptions
    getPrescriptions: async () => {
        const response = await fetch(`${API_URL}/prescriptions`);
        return response.json();
    },

    createPrescription: async (prescriptionData) => {
        const response = await fetch(`${API_URL}/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prescriptionData)
        });
        return response.json();
    },

    // Bills
    getBills: async () => {
        const response = await fetch(`${API_URL}/bills`);
        return response.json();
    },

    createBill: async (billData) => {
        const response = await fetch(`${API_URL}/bills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData)
        });
        return response.json();
    },

    // Beds & Wards
    getWards: async () => {
        const response = await fetch(`${API_URL}/beds/wards`);
        return response.json();
    },

    createWard: async (wardData) => {
        const response = await fetch(`${API_URL}/beds/wards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wardData)
        });
        return response.json();
    },

    updateWard: async (wardId, wardData) => {
        const response = await fetch(`${API_URL}/beds/wards/${wardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wardData)
        });
        return response.json();
    },

    deleteWard: async (wardId) => {
        const response = await fetch(`${API_URL}/beds/wards/${wardId}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    getBedStats: async () => {
        const response = await fetch(`${API_URL}/beds/stats`);
        return response.json();
    },

    updateBed: async (wardId, bedId, bedData) => {
        const response = await fetch(`${API_URL}/beds/${wardId}/${bedId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bedData)
        });
        return response.json();
    },

    assignPatientToBed: async (wardId, bedId, patientData) => {
        const response = await fetch(`${API_URL}/beds/${wardId}/${bedId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData)
        });
        return response.json();
    },

    dischargeBedPatient: async (wardId, bedId) => {
        const response = await fetch(`${API_URL}/beds/${wardId}/${bedId}/discharge`, {
            method: 'POST'
        });
        return response.json();
    },

    transferBedPatient: async (fromBedId, toBedId) => {
        const response = await fetch(`${API_URL}/beds/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromBedId, toBedId })
        });
        return response.json();
    },

    addBedsToWard: async (wardId, bedData) => {
        const response = await fetch(`${API_URL}/beds/wards/${wardId}/beds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bedData)
        });
        return response.json();
    },

    deleteBed: async (wardId, bedId) => {
        const response = await fetch(`${API_URL}/beds/${wardId}/${bedId}`, {
            method: 'DELETE'
        });
        return response.json();
    }
};