// Dynamically set API URL based on current host
const API_URL = window.location.origin + '/api';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000;

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Get auth headers
const getAuthHeaders = () => {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Handle auth errors - redirect to login if token expired
const handleAuthError = (response) => {
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
        return { success: false, error: 'Session expired. Please login again.' };
    }
    if (response.status === 403) {
        return { success: false, error: 'Access denied. You do not have permission for this action.' };
    }
    return null;
};

// Helper function for fetch with timeout and error handling
const fetchWithTimeout = async (url, options = {}, requireAuth = true) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
        // Add auth headers if required
        if (requireAuth) {
            options.headers = { ...getAuthHeaders(), ...options.headers };
        } else if (!options.headers) {
            options.headers = { 'Content-Type': 'application/json' };
        }
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        // Handle auth errors
        const authError = handleAuthError(response);
        if (authError) return authError;
        
        // Handle HTTP errors
        if (!response.ok && response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            return { success: false, error: 'Request timed out. Please try again.' };
        }
        
        if (!navigator.onLine) {
            return { success: false, error: 'No internet connection. Please check your network.' };
        }
        
        return { success: false, error: error.message || 'An error occurred. Please try again.' };
    }
};

const api = {
    // ==================== AUTH ====================
    login: async (username, password) => {
        return fetchWithTimeout(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }, false); // No auth required for login
    },

    register: async (userData) => {
        return fetchWithTimeout(`${API_URL}/auth/register`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    getMe: async () => {
        return fetchWithTimeout(`${API_URL}/auth/me`);
    },

    updateDetails: async (userData) => {
        return fetchWithTimeout(`${API_URL}/auth/updatedetails`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    updatePassword: async (passwordData) => {
        return fetchWithTimeout(`${API_URL}/auth/updatepassword`, {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    },

    getUsers: async () => {
        return fetchWithTimeout(`${API_URL}/auth/users`);
    },

    updateUser: async (userId, userData) => {
        return fetchWithTimeout(`${API_URL}/auth/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    deleteUser: async (userId) => {
        return fetchWithTimeout(`${API_URL}/auth/users/${userId}`, {
            method: 'DELETE'
        });
    },

    getRoles: async () => {
        return fetchWithTimeout(`${API_URL}/auth/roles`);
    },

    // ==================== PATIENTS ====================
    getPatients: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/patients${query ? '?' + query : ''}`);
    },

    getPatient: async (patientId) => {
        return fetchWithTimeout(`${API_URL}/patients/${patientId}`);
    },

    getPatientByUHID: async (uhid) => {
        return fetchWithTimeout(`${API_URL}/patients/uhid/${uhid}`);
    },

    createPatient: async (patientData) => {
        return fetchWithTimeout(`${API_URL}/patients`, {
            method: 'POST',
            body: JSON.stringify(patientData)
        });
    },

    updatePatient: async (patientId, patientData) => {
        return fetchWithTimeout(`${API_URL}/patients/${patientId}`, {
            method: 'PUT',
            body: JSON.stringify(patientData)
        });
    },

    deletePatient: async (patientId) => {
        return fetchWithTimeout(`${API_URL}/patients/${patientId}`, {
            method: 'DELETE'
        });
    },

    findDuplicatePatients: async (searchData) => {
        return fetchWithTimeout(`${API_URL}/patients/find-duplicates`, {
            method: 'POST',
            body: JSON.stringify(searchData)
        });
    },

    mergePatients: async (mergeData) => {
        return fetchWithTimeout(`${API_URL}/patients/merge`, {
            method: 'POST',
            body: JSON.stringify(mergeData)
        });
    },

    updateVitals: async (patientId, vitalsData) => {
        return fetchWithTimeout(`${API_URL}/patients/${patientId}/vitals`, {
            method: 'PUT',
            body: JSON.stringify(vitalsData)
        });
    },

    addAllergy: async (patientId, allergyData) => {
        return fetchWithTimeout(`${API_URL}/patients/${patientId}/allergies`, {
            method: 'POST',
            body: JSON.stringify(allergyData)
        });
    },

    dischargePatient: async (patientId, dischargeData) => {
        return fetchWithTimeout(`${API_URL}/patients/${patientId}/discharge`, {
            method: 'POST',
            body: JSON.stringify(dischargeData)
        });
    },

    getPatientStats: async () => {
        return fetchWithTimeout(`${API_URL}/patients/stats/overview`);
    },

    // ==================== DASHBOARD ====================
    getStats: async () => {
        return fetchWithTimeout(`${API_URL}/dashboard/stats`);
    },

    getDashboardModuleStats: async (module) => {
        return fetchWithTimeout(`${API_URL}/dashboard/${module}`);
    },

    // ==================== SURGERIES ====================
    getSurgeries: async () => {
        return fetchWithTimeout(`${API_URL}/surgeries`);
    },

    getSurgery: async (surgeryId) => {
        return fetchWithTimeout(`${API_URL}/surgeries/${surgeryId}`);
    },

    createSurgery: async (surgeryData) => {
        return fetchWithTimeout(`${API_URL}/surgeries`, {
            method: 'POST',
            body: JSON.stringify(surgeryData)
        });
    },

    updateSurgery: async (surgeryId, surgeryData) => {
        return fetchWithTimeout(`${API_URL}/surgeries/${surgeryId}`, {
            method: 'PUT',
            body: JSON.stringify(surgeryData)
        });
    },

    // ==================== LAB TESTS ====================
    getLabTests: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/labs${query ? '?' + query : ''}`);
    },

    getLabTest: async (testId) => {
        return fetchWithTimeout(`${API_URL}/labs/${testId}`);
    },

    createLabTest: async (testData) => {
        return fetchWithTimeout(`${API_URL}/labs`, {
            method: 'POST',
            body: JSON.stringify(testData)
        });
    },

    updateLabTest: async (testId, testData) => {
        return fetchWithTimeout(`${API_URL}/labs/${testId}`, {
            method: 'PUT',
            body: JSON.stringify(testData)
        });
    },

    collectLabSample: async (testId, sampleData) => {
        return fetchWithTimeout(`${API_URL}/labs/${testId}/collect`, {
            method: 'PUT',
            body: JSON.stringify(sampleData)
        });
    },

    processLabSample: async (testId) => {
        return fetchWithTimeout(`${API_URL}/labs/${testId}/process`, {
            method: 'PUT'
        });
    },

    enterLabResults: async (testId, resultsData) => {
        return fetchWithTimeout(`${API_URL}/labs/${testId}/results`, {
            method: 'PUT',
            body: JSON.stringify(resultsData)
        });
    },

    verifyLabResults: async (testId, verificationData) => {
        return fetchWithTimeout(`${API_URL}/labs/${testId}/verify`, {
            method: 'PUT',
            body: JSON.stringify(verificationData)
        });
    },

    getPendingCollections: async () => {
        return fetchWithTimeout(`${API_URL}/labs/pending/collections`);
    },

    getPendingVerifications: async () => {
        return fetchWithTimeout(`${API_URL}/labs/pending/verifications`);
    },

    getLabStats: async () => {
        return fetchWithTimeout(`${API_URL}/labs/stats/overview`);
    },

    // ==================== IMAGING ====================
    getImagingOrders: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/imaging${query ? '?' + query : ''}`);
    },

    getImagingOrder: async (orderId) => {
        return fetchWithTimeout(`${API_URL}/imaging/${orderId}`);
    },

    createImagingOrder: async (orderData) => {
        return fetchWithTimeout(`${API_URL}/imaging`, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    updateImagingOrder: async (orderId, orderData) => {
        return fetchWithTimeout(`${API_URL}/imaging/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify(orderData)
        });
    },

    startImaging: async (orderId) => {
        return fetchWithTimeout(`${API_URL}/imaging/${orderId}/start`, {
            method: 'PUT'
        });
    },

    completeImaging: async (orderId, completionData) => {
        return fetchWithTimeout(`${API_URL}/imaging/${orderId}/complete`, {
            method: 'PUT',
            body: JSON.stringify(completionData)
        });
    },

    addImagingReport: async (orderId, reportData) => {
        return fetchWithTimeout(`${API_URL}/imaging/${orderId}/report`, {
            method: 'PUT',
            body: JSON.stringify(reportData)
        });
    },

    getPendingImagingReports: async () => {
        return fetchWithTimeout(`${API_URL}/imaging/pending/reports`);
    },

    getImagingWorklist: async () => {
        return fetchWithTimeout(`${API_URL}/imaging/worklist`);
    },

    getImagingStats: async () => {
        return fetchWithTimeout(`${API_URL}/imaging/stats/overview`);
    },

    // ==================== PRESCRIPTIONS ====================
    getPrescriptions: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/prescriptions${query ? '?' + query : ''}`);
    },

    getPrescription: async (prescriptionId) => {
        return fetchWithTimeout(`${API_URL}/prescriptions/${prescriptionId}`);
    },

    createPrescription: async (prescriptionData) => {
        return fetchWithTimeout(`${API_URL}/prescriptions`, {
            method: 'POST',
            body: JSON.stringify(prescriptionData)
        });
    },

    updatePrescription: async (prescriptionId, prescriptionData) => {
        return fetchWithTimeout(`${API_URL}/prescriptions/${prescriptionId}`, {
            method: 'PUT',
            body: JSON.stringify(prescriptionData)
        });
    },

    dispensePrescription: async (prescriptionId, dispensingData) => {
        return fetchWithTimeout(`${API_URL}/prescriptions/${prescriptionId}/dispense`, {
            method: 'PUT',
            body: JSON.stringify(dispensingData)
        });
    },

    getPendingPrescriptions: async () => {
        return fetchWithTimeout(`${API_URL}/prescriptions/pending`);
    },

    // ==================== BILLS ====================
    getBills: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/bills${query ? '?' + query : ''}`);
    },

    getBill: async (billId) => {
        return fetchWithTimeout(`${API_URL}/bills/${billId}`);
    },

    createBill: async (billData) => {
        return fetchWithTimeout(`${API_URL}/bills`, {
            method: 'POST',
            body: JSON.stringify(billData)
        });
    },

    updateBill: async (billId, billData) => {
        return fetchWithTimeout(`${API_URL}/bills/${billId}`, {
            method: 'PUT',
            body: JSON.stringify(billData)
        });
    },

    addPayment: async (billId, paymentData) => {
        return fetchWithTimeout(`${API_URL}/bills/${billId}/payment`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    },

    getBillingStats: async () => {
        return fetchWithTimeout(`${API_URL}/bills/stats/overview`);
    },

    // ==================== BEDS & WARDS ====================
    getWards: async () => {
        return fetchWithTimeout(`${API_URL}/beds/wards`);
    },

    getWard: async (wardId) => {
        return fetchWithTimeout(`${API_URL}/beds/wards/${wardId}`);
    },

    createWard: async (wardData) => {
        return fetchWithTimeout(`${API_URL}/beds/wards`, {
            method: 'POST',
            body: JSON.stringify(wardData)
        });
    },

    updateWard: async (wardId, wardData) => {
        return fetchWithTimeout(`${API_URL}/beds/wards/${wardId}`, {
            method: 'PUT',
            body: JSON.stringify(wardData)
        });
    },

    deleteWard: async (wardId) => {
        return fetchWithTimeout(`${API_URL}/beds/wards/${wardId}`, {
            method: 'DELETE'
        });
    },

    getBedStats: async () => {
        return fetchWithTimeout(`${API_URL}/beds/stats`);
    },

    updateBed: async (wardId, bedId, bedData) => {
        return fetchWithTimeout(`${API_URL}/beds/${wardId}/${bedId}`, {
            method: 'PUT',
            body: JSON.stringify(bedData)
        });
    },

    assignPatientToBed: async (wardId, bedId, patientData) => {
        return fetchWithTimeout(`${API_URL}/beds/${wardId}/${bedId}/assign`, {
            method: 'POST',
            body: JSON.stringify(patientData)
        });
    },

    dischargeBedPatient: async (wardId, bedId) => {
        return fetchWithTimeout(`${API_URL}/beds/${wardId}/${bedId}/discharge`, {
            method: 'POST'
        });
    },

    transferBedPatient: async (fromBedId, toBedId) => {
        return fetchWithTimeout(`${API_URL}/beds/transfer`, {
            method: 'POST',
            body: JSON.stringify({ fromBedId, toBedId })
        });
    },

    addBedsToWard: async (wardId, bedData) => {
        return fetchWithTimeout(`${API_URL}/beds/wards/${wardId}/beds`, {
            method: 'POST',
            body: JSON.stringify(bedData)
        });
    },

    deleteBed: async (wardId, bedId) => {
        return fetchWithTimeout(`${API_URL}/beds/${wardId}/${bedId}`, {
            method: 'DELETE'
        });
    },

    // ==================== EMR ====================
    getEMRRecords: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/emr${query ? '?' + query : ''}`);
    },

    getEMRRecord: async (emrId) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}`);
    },

    getPatientEMR: async (patientId) => {
        return fetchWithTimeout(`${API_URL}/emr/patient/${patientId}`);
    },

    createEMRRecord: async (emrData) => {
        return fetchWithTimeout(`${API_URL}/emr`, {
            method: 'POST',
            body: JSON.stringify(emrData)
        });
    },

    updateEMRRecord: async (emrId, emrData) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}`, {
            method: 'PUT',
            body: JSON.stringify(emrData)
        });
    },

    addProgressNote: async (emrId, noteData) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}/progress-notes`, {
            method: 'POST',
            body: JSON.stringify(noteData)
        });
    },

    addDiagnosis: async (emrId, diagnosisData) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}/diagnosis`, {
            method: 'POST',
            body: JSON.stringify(diagnosisData)
        });
    },

    addEMRAllergy: async (emrId, allergyData) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}/allergies`, {
            method: 'POST',
            body: JSON.stringify(allergyData)
        });
    },

    addConsent: async (emrId, consentData) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}/consents`, {
            method: 'POST',
            body: JSON.stringify(consentData)
        });
    },

    generateDischargeSummary: async (emrId, summaryData) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}/discharge-summary`, {
            method: 'POST',
            body: JSON.stringify(summaryData)
        });
    },

    getEMRHistory: async (emrId) => {
        return fetchWithTimeout(`${API_URL}/emr/${emrId}/history`);
    },

    // Legacy support - use getPatientEMR instead
    addClinicalNote: async (patientId, noteData) => {
        // First get patient's EMR, then add note to it
        return fetchWithTimeout(`${API_URL}/emr/${patientId}/notes`, {
            method: 'POST',
            body: JSON.stringify(noteData)
        });
    },

    getPatientHistory: async (patientId) => {
        return fetchWithTimeout(`${API_URL}/emr/patient/${patientId}`);
    },

    // ==================== APPOINTMENTS ====================
    getAppointments: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/appointments${query ? '?' + query : ''}`);
    },

    getAppointment: async (appointmentId) => {
        return fetchWithTimeout(`${API_URL}/appointments/${appointmentId}`);
    },

    createAppointment: async (appointmentData) => {
        return fetchWithTimeout(`${API_URL}/appointments`, {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    },

    updateAppointment: async (appointmentId, appointmentData) => {
        return fetchWithTimeout(`${API_URL}/appointments/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify(appointmentData)
        });
    },

    checkInAppointment: async (appointmentId) => {
        return fetchWithTimeout(`${API_URL}/appointments/${appointmentId}/check-in`, {
            method: 'POST'
        });
    },

    startConsultation: async (appointmentId) => {
        return fetchWithTimeout(`${API_URL}/appointments/${appointmentId}/start-consultation`, {
            method: 'POST'
        });
    },

    completeConsultation: async (appointmentId, consultationData) => {
        return fetchWithTimeout(`${API_URL}/appointments/${appointmentId}/complete-consultation`, {
            method: 'POST',
            body: JSON.stringify(consultationData)
        });
    },

    cancelAppointment: async (appointmentId, cancellationData) => {
        return fetchWithTimeout(`${API_URL}/appointments/${appointmentId}/cancel`, {
            method: 'POST',
            body: JSON.stringify(cancellationData)
        });
    },

    rescheduleAppointment: async (appointmentId, rescheduleData) => {
        return fetchWithTimeout(`${API_URL}/appointments/${appointmentId}/reschedule`, {
            method: 'POST',
            body: JSON.stringify(rescheduleData)
        });
    },

    getAvailableSlots: async (params) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/appointments/slots/available?${query}`);
    },

    getQueueStatus: async (department) => {
        return fetchWithTimeout(`${API_URL}/appointments/queue/status?department=${department}`);
    },

    getDoctorSchedule: async (doctorId, date) => {
        const query = date ? `?date=${date}` : '';
        return fetchWithTimeout(`${API_URL}/appointments/doctor/${doctorId}/schedule${query}`);
    },

    getTodayAppointmentsSummary: async () => {
        return fetchWithTimeout(`${API_URL}/appointments/today-summary`);
    },

    // ==================== TRIAGE ====================
    getTriageRecords: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/triage${query ? '?' + query : ''}`);
    },

    getTriageRecord: async (triageId) => {
        return fetchWithTimeout(`${API_URL}/triage/${triageId}`);
    },

    createTriageRecord: async (triageData) => {
        return fetchWithTimeout(`${API_URL}/triage`, {
            method: 'POST',
            body: JSON.stringify(triageData)
        });
    },

    updateTriageRecord: async (triageId, triageData) => {
        return fetchWithTimeout(`${API_URL}/triage/${triageId}`, {
            method: 'PUT',
            body: JSON.stringify(triageData)
        });
    },

    completeTriage: async (triageId, completionData) => {
        return fetchWithTimeout(`${API_URL}/triage/${triageId}/complete`, {
            method: 'POST',
            body: JSON.stringify(completionData)
        });
    },

    retriagePatient: async (triageId, retriageData) => {
        return fetchWithTimeout(`${API_URL}/triage/${triageId}/re-triage`, {
            method: 'POST',
            body: JSON.stringify(retriageData)
        });
    },

    getTriageQueue: async () => {
        return fetchWithTimeout(`${API_URL}/triage/queue/emergency`);
    },

    getMLCCases: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/triage/mlc/cases${query ? '?' + query : ''}`);
    },

    getTriageStats: async () => {
        return fetchWithTimeout(`${API_URL}/triage/stats/summary`);
    },

    // Legacy support
    performTriage: async (patientId, triageData) => {
        return fetchWithTimeout(`${API_URL}/triage`, {
            method: 'POST',
            body: JSON.stringify({ patient: patientId, ...triageData })
        });
    },

    // ==================== PHARMACY ====================
    // Drug management
    getDrugs: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs${query ? '?' + query : ''}`);
    },

    getDrug: async (drugId) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs/${drugId}`);
    },

    createDrug: async (drugData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs`, {
            method: 'POST',
            body: JSON.stringify(drugData)
        });
    },

    updateDrug: async (drugId, drugData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs/${drugId}`, {
            method: 'PUT',
            body: JSON.stringify(drugData)
        });
    },

    recallDrug: async (drugId, recallData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs/${drugId}/recall`, {
            method: 'POST',
            body: JSON.stringify(recallData)
        });
    },

    // Batch management
    getBatches: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/pharmacy/batches${query ? '?' + query : ''}`);
    },

    getExpiringBatches: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/pharmacy/batches/expiring${query ? '?' + query : ''}`);
    },

    adjustBatchStock: async (batchId, adjustmentData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/batches/${batchId}/adjust`, {
            method: 'POST',
            body: JSON.stringify(adjustmentData)
        });
    },

    // Prescriptions
    getPharmacyPrescriptions: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/pharmacy/prescriptions${query ? '?' + query : ''}`);
    },

    dispensePharmacyPrescription: async (prescriptionId, dispensingData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/prescriptions/${prescriptionId}/dispense`, {
            method: 'POST',
            body: JSON.stringify(dispensingData)
        });
    },

    // Safety checks
    checkAllergies: async (patientId, drugIds) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/check-allergies`, {
            method: 'POST',
            body: JSON.stringify({ patientId, drugIds })
        });
    },

    checkDrugInteractions: async (drugIds) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/check-interactions`, {
            method: 'POST',
            body: JSON.stringify({ drugIds })
        });
    },

    // Stock issues
    getStockIssues: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/pharmacy/stock-issues${query ? '?' + query : ''}`);
    },

    createStockIssue: async (issueData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/stock-issues`, {
            method: 'POST',
            body: JSON.stringify(issueData)
        });
    },

    processStockReturn: async (issueId, returnData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/stock-issues/${issueId}/return`, {
            method: 'POST',
            body: JSON.stringify(returnData)
        });
    },

    getPharmacyStats: async () => {
        return fetchWithTimeout(`${API_URL}/pharmacy/stats`);
    },

    // Legacy support
    getPharmacyInventory: async () => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs`);
    },

    dispenseMedication: async (prescriptionId, dispensingData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/prescriptions/${prescriptionId}/dispense`, {
            method: 'POST',
            body: JSON.stringify(dispensingData)
        });
    },

    // ==================== INVENTORY ====================
    // Vendors
    getVendors: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/inventory/vendors${query ? '?' + query : ''}`);
    },

    getVendor: async (vendorId) => {
        return fetchWithTimeout(`${API_URL}/inventory/vendors/${vendorId}`);
    },

    createVendor: async (vendorData) => {
        return fetchWithTimeout(`${API_URL}/inventory/vendors`, {
            method: 'POST',
            body: JSON.stringify(vendorData)
        });
    },

    updateVendor: async (vendorId, vendorData) => {
        return fetchWithTimeout(`${API_URL}/inventory/vendors/${vendorId}`, {
            method: 'PUT',
            body: JSON.stringify(vendorData)
        });
    },

    blacklistVendor: async (vendorId, blacklistData) => {
        return fetchWithTimeout(`${API_URL}/inventory/vendors/${vendorId}/blacklist`, {
            method: 'POST',
            body: JSON.stringify(blacklistData)
        });
    },

    // Purchase Orders
    getPurchaseOrders: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders${query ? '?' + query : ''}`);
    },

    getPurchaseOrder: async (poId) => {
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders/${poId}`);
    },

    createPurchaseOrder: async (poData) => {
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders`, {
            method: 'POST',
            body: JSON.stringify(poData)
        });
    },

    updatePurchaseOrder: async (poId, poData) => {
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders/${poId}`, {
            method: 'PUT',
            body: JSON.stringify(poData)
        });
    },

    submitPurchaseOrder: async (poId, submitData) => {
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders/${poId}/submit`, {
            method: 'POST',
            body: JSON.stringify(submitData)
        });
    },

    approvePurchaseOrder: async (poId, approvalData) => {
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders/${poId}/approve`, {
            method: 'POST',
            body: JSON.stringify(approvalData)
        });
    },

    rejectPurchaseOrder: async (poId, rejectionData) => {
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders/${poId}/reject`, {
            method: 'POST',
            body: JSON.stringify(rejectionData)
        });
    },

    cancelPurchaseOrder: async (poId, cancellationData) => {
        return fetchWithTimeout(`${API_URL}/inventory/purchase-orders/${poId}/cancel`, {
            method: 'POST',
            body: JSON.stringify(cancellationData)
        });
    },

    // GRNs
    getGRNs: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/inventory/grns${query ? '?' + query : ''}`);
    },

    getGRN: async (grnId) => {
        return fetchWithTimeout(`${API_URL}/inventory/grns/${grnId}`);
    },

    createGRN: async (grnData) => {
        return fetchWithTimeout(`${API_URL}/inventory/grns`, {
            method: 'POST',
            body: JSON.stringify(grnData)
        });
    },

    completeQualityCheck: async (grnId, qcData) => {
        return fetchWithTimeout(`${API_URL}/inventory/grns/${grnId}/quality-check`, {
            method: 'POST',
            body: JSON.stringify(qcData)
        });
    },

    postGRNToInventory: async (grnId, postData) => {
        return fetchWithTimeout(`${API_URL}/inventory/grns/${grnId}/post-to-inventory`, {
            method: 'POST',
            body: JSON.stringify(postData)
        });
    },

    // Reports and Stats
    getInventoryStats: async () => {
        return fetchWithTimeout(`${API_URL}/inventory/stats`);
    },

    getLowStockReport: async () => {
        return fetchWithTimeout(`${API_URL}/inventory/reports/low-stock`);
    },

    getExpiryReport: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/inventory/reports/expiry${query ? '?' + query : ''}`);
    },

    getStockMovementReport: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/inventory/reports/movement${query ? '?' + query : ''}`);
    },

    // Legacy support
    getInventoryItems: async (params = {}) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs`);
    },

    createInventoryItem: async (itemData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs`, {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    },

    updateInventoryItem: async (itemId, itemData) => {
        return fetchWithTimeout(`${API_URL}/pharmacy/drugs/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(itemData)
        });
    },

    getLowStockAlerts: async () => {
        return fetchWithTimeout(`${API_URL}/inventory/reports/low-stock`);
    },

    // ==================== INSURANCE ====================
    // Policies
    getInsurancePolicies: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/insurance${query ? '?' + query : ''}`);
    },

    getInsurancePolicy: async (policyId) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}`);
    },

    getPatientInsurance: async (patientId) => {
        return fetchWithTimeout(`${API_URL}/insurance/patient/${patientId}`);
    },

    createInsurancePolicy: async (policyData) => {
        return fetchWithTimeout(`${API_URL}/insurance`, {
            method: 'POST',
            body: JSON.stringify(policyData)
        });
    },

    updateInsurancePolicy: async (policyId, policyData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}`, {
            method: 'PUT',
            body: JSON.stringify(policyData)
        });
    },

    verifyInsuranceEligibility: async (policyId, verificationData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/verify`, {
            method: 'POST',
            body: JSON.stringify(verificationData)
        });
    },

    // Pre-Authorization
    requestPreAuth: async (policyId, preAuthData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/pre-auth`, {
            method: 'POST',
            body: JSON.stringify(preAuthData)
        });
    },

    updatePreAuth: async (policyId, preAuthId, updateData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/pre-auth/${preAuthId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    },

    enhancePreAuth: async (policyId, preAuthId, enhanceData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/pre-auth/${preAuthId}/enhance`, {
            method: 'POST',
            body: JSON.stringify(enhanceData)
        });
    },

    // Claims
    submitInsuranceClaim: async (policyId, claimData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/claims`, {
            method: 'POST',
            body: JSON.stringify(claimData)
        });
    },

    updateInsuranceClaim: async (policyId, claimId, updateData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/claims/${claimId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    },

    respondToClaimQuery: async (policyId, claimId, responseData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/claims/${claimId}/respond-query`, {
            method: 'POST',
            body: JSON.stringify(responseData)
        });
    },

    recordClaimSettlement: async (policyId, claimId, settlementData) => {
        return fetchWithTimeout(`${API_URL}/insurance/${policyId}/claims/${claimId}/settlement`, {
            method: 'POST',
            body: JSON.stringify(settlementData)
        });
    },

    // Reports and Stats
    getInsuranceStats: async () => {
        return fetchWithTimeout(`${API_URL}/insurance/stats/summary`);
    },

    getClaimAgingReport: async () => {
        return fetchWithTimeout(`${API_URL}/insurance/reports/aging`);
    },

    getTPAWiseReport: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/insurance/reports/tpa-wise${query ? '?' + query : ''}`);
    },

    // Legacy support
    getInsuranceClaims: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithTimeout(`${API_URL}/insurance${query ? '?' + query : ''}`);
    },

    createInsuranceClaim: async (claimData) => {
        // Need policy ID for new API structure
        if (claimData.policyId) {
            return fetchWithTimeout(`${API_URL}/insurance/${claimData.policyId}/claims`, {
                method: 'POST',
                body: JSON.stringify(claimData)
            });
        }
        return { success: false, error: 'Policy ID required for claim submission' };
    },

    submitPreAuth: async (preAuthData) => {
        if (preAuthData.policyId) {
            return fetchWithTimeout(`${API_URL}/insurance/${preAuthData.policyId}/pre-auth`, {
                method: 'POST',
                body: JSON.stringify(preAuthData)
            });
        }
        return { success: false, error: 'Policy ID required for pre-auth' };
    },

    verifyInsurance: async (insuranceData) => {
        if (insuranceData.policyId) {
            return fetchWithTimeout(`${API_URL}/insurance/${insuranceData.policyId}/verify`, {
                method: 'POST',
                body: JSON.stringify(insuranceData)
            });
        }
        return { success: false, error: 'Policy ID required for verification' };
    },

    updateClaimStatus: async (claimId, statusData) => {
        // Need policy ID for new API structure
        if (statusData.policyId) {
            return fetchWithTimeout(`${API_URL}/insurance/${statusData.policyId}/claims/${claimId}`, {
                method: 'PUT',
                body: JSON.stringify(statusData)
            });
        }
        return { success: false, error: 'Policy ID required for status update' };
    },

    // ==================== HEALTH CHECK ====================
    healthCheck: async () => {
        return fetchWithTimeout(`${API_URL}/health`, {}, false);
    }
};