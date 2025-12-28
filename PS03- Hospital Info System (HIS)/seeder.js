const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Surgery = require('./models/Surgery');
const LabTest = require('./models/LabTest');
const Imaging = require('./models/Imaging');
const Prescription = require('./models/Prescription');
const Bill = require('./models/Bill');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to DB
connectDB();

const importData = async () => {
    try {
        // Clear existing data
        await User.deleteMany();
        await Patient.deleteMany();
        await Surgery.deleteMany();
        await LabTest.deleteMany();
        await Imaging.deleteMany();
        await Prescription.deleteMany();
        await Bill.deleteMany();

        console.log('Cleared existing data...');

        // Create Admin User and Medical Staff
        const users = await User.create([
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'dr.sharma', password: 'doctor123', role: 'doctor' },
            { username: 'dr.patel', password: 'doctor123', role: 'doctor' },
            { username: 'dr.reddy', password: 'doctor123', role: 'doctor' },
            { username: 'nurse.priya', password: 'nurse123', role: 'nurse' },
            { username: 'reception', password: 'reception123', role: 'receptionist' },
            { username: 'pharmacy', password: 'pharmacy123', role: 'pharmacist' }
        ]);
        console.log('Created users...');

        // REAL WORLD PATIENTS
        const patients = await Patient.create([
            // OPD Patients
            {
                patientId: 'MCP-OPD-001',
                name: 'Ramesh Kumar Sharma',
                age: 52,
                gender: 'Male',
                contact: '9876543210',
                email: 'ramesh.sharma@gmail.com',
                address: '45, Gandhi Nagar, Sector 12, Mumbai - 400012',
                bloodGroup: 'B+',
                type: 'OPD',
                department: 'Cardiology',
                doctor: 'Dr. Rajesh Sharma',
                diagnosis: 'Hypertensive heart disease',
                status: 'Consulting'
            },
            {
                patientId: 'MCP-OPD-002',
                name: 'Sunita Devi Patel',
                age: 45,
                gender: 'Female',
                contact: '9823456789',
                address: '78, Shivaji Park, Andheri West, Mumbai - 400058',
                bloodGroup: 'O+',
                type: 'OPD',
                department: 'Orthopedics',
                doctor: 'Dr. Sunil Reddy',
                diagnosis: 'Bilateral knee osteoarthritis',
                status: 'Waiting'
            },
            {
                patientId: 'MCP-OPD-003',
                name: 'Amit Verma',
                age: 34,
                gender: 'Male',
                contact: '9912345678',
                address: '23, Nehru Road, Dadar, Mumbai - 400014',
                bloodGroup: 'A+',
                type: 'OPD',
                department: 'Dermatology',
                doctor: 'Dr. Priya Mehta',
                diagnosis: 'Contact dermatitis',
                status: 'Completed'
            },
            {
                patientId: 'MCP-OPD-004',
                name: 'Kavita Joshi',
                age: 28,
                gender: 'Female',
                contact: '9854321098',
                address: '56, Marine Drive, Colaba, Mumbai - 400001',
                bloodGroup: 'AB+',
                type: 'OPD',
                department: 'Gynecology',
                doctor: 'Dr. Anjali Deshmukh',
                diagnosis: 'Routine prenatal checkup - 20 weeks',
                status: 'Waiting'
            },
            {
                patientId: 'MCP-OPD-005',
                name: 'Suresh Nair',
                age: 61,
                gender: 'Male',
                contact: '9765432109',
                address: '89, Hill Road, Bandra West, Mumbai - 400050',
                bloodGroup: 'O-',
                type: 'OPD',
                department: 'Neurology',
                doctor: 'Dr. Vikram Patel',
                diagnosis: 'Chronic migraine',
                status: 'Waiting'
            },
            // IPD Patients
            {
                patientId: 'MCP-IPD-001',
                name: 'Priya Gupta',
                age: 29,
                gender: 'Female',
                contact: '9845612378',
                address: '112, Pali Hill, Bandra, Mumbai - 400050',
                bloodGroup: 'A-',
                type: 'IPD',
                department: 'Obstetrics',
                doctor: 'Dr. Anjali Deshmukh',
                ward: 'Maternity',
                bed: 'MAT-101',
                admissionDate: new Date('2025-12-25'),
                diagnosis: 'Full term pregnancy - LSCS scheduled',
                status: 'Active'
            },
            {
                patientId: 'MCP-IPD-002',
                name: 'Mohan Lal Singh',
                age: 58,
                gender: 'Male',
                contact: '9732145698',
                address: '45, Juhu Beach Road, Juhu, Mumbai - 400049',
                bloodGroup: 'B-',
                type: 'IPD',
                department: 'Cardiology',
                doctor: 'Dr. Rajesh Sharma',
                ward: 'CCU',
                bed: 'CCU-05',
                admissionDate: new Date('2025-12-24'),
                diagnosis: 'Acute MI - Post Angioplasty',
                status: 'Active'
            },
            {
                patientId: 'MCP-IPD-003',
                name: 'Rajendra Prasad',
                age: 67,
                gender: 'Male',
                contact: '9654321087',
                address: '78, Linking Road, Santacruz, Mumbai - 400054',
                bloodGroup: 'O+',
                type: 'IPD',
                department: 'Orthopedics',
                doctor: 'Dr. Sunil Reddy',
                ward: 'Orthopedic',
                bed: 'ORTH-203',
                admissionDate: new Date('2025-12-26'),
                diagnosis: 'Right Hip Fracture - THR scheduled',
                status: 'Active'
            },
            {
                patientId: 'MCP-IPD-004',
                name: 'Lakshmi Iyer',
                age: 42,
                gender: 'Female',
                contact: '9543216789',
                address: '34, Powai Lake View, Powai, Mumbai - 400076',
                bloodGroup: 'AB-',
                type: 'IPD',
                department: 'General Surgery',
                doctor: 'Dr. Amit Kapoor',
                ward: 'Surgical',
                bed: 'SURG-105',
                admissionDate: new Date('2025-12-26'),
                diagnosis: 'Acute Cholecystitis - Lap Chole scheduled',
                status: 'Active'
            },
            // Emergency Patients
            {
                patientId: 'MCP-EMR-001',
                name: 'Vikram Malhotra',
                age: 35,
                gender: 'Male',
                contact: '9876541230',
                address: 'Unknown',
                bloodGroup: 'A+',
                type: 'Emergency',
                department: 'Emergency',
                doctor: 'Dr. Emergency Team',
                severity: 'Critical',
                diagnosis: 'RTA - Multiple trauma',
                status: 'Active'
            },
            {
                patientId: 'MCP-EMR-002',
                name: 'Anjali Mehta',
                age: 55,
                gender: 'Female',
                contact: '9812345670',
                address: '67, Malabar Hill, Mumbai - 400006',
                bloodGroup: 'B+',
                type: 'Emergency',
                department: 'Emergency',
                doctor: 'Dr. Rajesh Sharma',
                severity: 'Urgent',
                diagnosis: 'Severe chest pain - Suspected MI',
                status: 'Active'
            },
            {
                patientId: 'MCP-EMR-003',
                name: 'Rohit Kumar',
                age: 8,
                gender: 'Male',
                contact: '9756432180',
                address: '23, Versova, Andheri West, Mumbai - 400061',
                bloodGroup: 'O+',
                type: 'Emergency',
                department: 'Pediatrics',
                doctor: 'Dr. Priya Mehta',
                severity: 'Urgent',
                diagnosis: 'High fever, pneumonia',
                status: 'Active'
            },
            {
                patientId: 'MCP-EMR-004',
                name: 'Geeta Sharma',
                age: 72,
                gender: 'Female',
                contact: '9632587410',
                address: '45, Worli Sea Face, Worli, Mumbai - 400018',
                bloodGroup: 'A-',
                type: 'Emergency',
                department: 'Neurology',
                doctor: 'Dr. Vikram Patel',
                severity: 'Critical',
                diagnosis: 'Acute Stroke - Right MCA territory',
                status: 'Active'
            }
        ]);
        console.log('Created patients...');

        // SURGERIES
        const surgeries = await Surgery.create([
            {
                patient: patients[5]._id,
                patientName: 'Priya Gupta',
                procedure: 'Lower Segment Cesarean Section (LSCS)',
                surgeon: 'Dr. Anjali Deshmukh',
                anesthesiologist: 'Dr. Arun Kumar',
                anesthesiaType: 'Spinal',
                otRoom: 'OT-2',
                surgeryDate: new Date('2025-12-27'),
                surgeryTime: '09:00 AM',
                estimatedDuration: '1.5 hours',
                preOpDiagnosis: 'Full term pregnancy with previous LSCS',
                status: 'Scheduled',
                priority: 'Elective'
            },
            {
                patient: patients[7]._id,
                patientName: 'Rajendra Prasad',
                procedure: 'Total Hip Replacement (THR)',
                surgeon: 'Dr. Sunil Reddy',
                anesthesiologist: 'Dr. Meena Iyer',
                anesthesiaType: 'Spinal',
                otRoom: 'OT-1',
                surgeryDate: new Date('2025-12-28'),
                surgeryTime: '08:00 AM',
                estimatedDuration: '3 hours',
                preOpDiagnosis: 'Right NOF fracture',
                status: 'Scheduled',
                priority: 'Urgent'
            },
            {
                patient: patients[8]._id,
                patientName: 'Lakshmi Iyer',
                procedure: 'Laparoscopic Cholecystectomy',
                surgeon: 'Dr. Amit Kapoor',
                anesthesiologist: 'Dr. Arun Kumar',
                anesthesiaType: 'General',
                otRoom: 'OT-3',
                surgeryDate: new Date('2025-12-27'),
                surgeryTime: '02:00 PM',
                estimatedDuration: '1 hour',
                preOpDiagnosis: 'Acute Cholecystitis',
                status: 'Scheduled',
                priority: 'Urgent'
            },
            {
                patient: patients[6]._id,
                patientName: 'Mohan Lal Singh',
                procedure: 'Coronary Angioplasty with Stent',
                surgeon: 'Dr. Rajesh Sharma',
                anesthesiologist: 'Dr. Meena Iyer',
                anesthesiaType: 'Local',
                otRoom: 'Cath Lab',
                surgeryDate: new Date('2025-12-24'),
                surgeryTime: '06:00 PM',
                estimatedDuration: '2 hours',
                actualDuration: '2.5 hours',
                preOpDiagnosis: 'STEMI',
                postOpDiagnosis: 'LAD 95% occlusion - Successfully stented',
                surgeryNotes: 'DES placed in LAD. Good flow restored.',
                status: 'Completed',
                priority: 'Emergency'
            }
        ]);
        console.log('Created surgeries...');

        // LAB TESTS
        const labTests = await LabTest.create([
            {
                patient: patients[0]._id,
                patientName: 'Ramesh Kumar Sharma',
                testType: 'Lipid Profile',
                testCategory: 'Biochemistry',
                orderedBy: 'Dr. Rajesh Sharma',
                priority: 'Routine',
                status: 'Completed',
                sampleType: 'Blood',
                results: 'Total Cholesterol: 245 mg/dL (High)\nLDL: 165 mg/dL (High)\nHDL: 38 mg/dL (Low)\nTriglycerides: 210 mg/dL (High)',
                interpretation: 'Abnormal',
                remarks: 'Dyslipidemia - Recommend statin therapy',
                orderDate: new Date('2025-12-26')
            },
            {
                patient: patients[0]._id,
                patientName: 'Ramesh Kumar Sharma',
                testType: 'HbA1c',
                testCategory: 'Biochemistry',
                orderedBy: 'Dr. Rajesh Sharma',
                priority: 'Routine',
                status: 'Completed',
                sampleType: 'Blood',
                results: 'HbA1c: 7.8%',
                interpretation: 'Abnormal',
                remarks: 'Suboptimal diabetes control',
                orderDate: new Date('2025-12-26')
            },
            {
                patient: patients[6]._id,
                patientName: 'Mohan Lal Singh',
                testType: 'Troponin I',
                testCategory: 'Biochemistry',
                orderedBy: 'Dr. Rajesh Sharma',
                priority: 'STAT',
                status: 'Completed',
                sampleType: 'Blood',
                results: 'Troponin I: 2.5 ng/mL (Highly Elevated)',
                interpretation: 'Critical',
                remarks: 'Positive for acute MI',
                orderDate: new Date('2025-12-24')
            },
            {
                patient: patients[6]._id,
                patientName: 'Mohan Lal Singh',
                testType: 'Complete Blood Count',
                testCategory: 'Hematology',
                orderedBy: 'Dr. Rajesh Sharma',
                priority: 'Urgent',
                status: 'Completed',
                sampleType: 'Blood',
                results: 'Hb: 12.8 g/dL\nWBC: 11,200/uL\nPlatelets: 245,000/uL',
                interpretation: 'Normal',
                orderDate: new Date('2025-12-24')
            },
            {
                patient: patients[12]._id,
                patientName: 'Geeta Sharma',
                testType: 'PT/INR',
                testCategory: 'Hematology',
                orderedBy: 'Dr. Vikram Patel',
                priority: 'STAT',
                status: 'Completed',
                sampleType: 'Blood',
                results: 'PT: 28.5 sec\nINR: 3.2',
                interpretation: 'Abnormal',
                remarks: 'High INR - Consider holding anticoagulation',
                orderDate: new Date('2025-12-27')
            },
            {
                patient: patients[11]._id,
                patientName: 'Rohit Kumar',
                testType: 'Complete Blood Count',
                testCategory: 'Hematology',
                orderedBy: 'Dr. Priya Mehta',
                priority: 'Urgent',
                status: 'Completed',
                sampleType: 'Blood',
                results: 'Hb: 11.2 g/dL\nWBC: 18,500/uL (Elevated)\nNeutrophils: 78%',
                interpretation: 'Abnormal',
                remarks: 'Leukocytosis suggestive of bacterial infection',
                orderDate: new Date('2025-12-27')
            },
            {
                patient: patients[5]._id,
                patientName: 'Priya Gupta',
                testType: 'Blood Grouping & Cross Match',
                testCategory: 'Serology',
                orderedBy: 'Dr. Anjali Deshmukh',
                priority: 'Urgent',
                status: 'Completed',
                sampleType: 'Blood',
                results: 'Blood Group: A Negative\n2 units PRBC compatible',
                interpretation: 'Normal',
                orderDate: new Date('2025-12-26')
            },
            {
                patient: patients[8]._id,
                patientName: 'Lakshmi Iyer',
                testType: 'Liver Function Test',
                testCategory: 'Biochemistry',
                orderedBy: 'Dr. Amit Kapoor',
                priority: 'Routine',
                status: 'Pending',
                sampleType: 'Blood',
                orderDate: new Date('2025-12-27')
            }
        ]);
        console.log('Created lab tests...');

        // IMAGING
        const imaging = await Imaging.create([
            {
                patient: patients[0]._id,
                patientName: 'Ramesh Kumar Sharma',
                imagingType: 'X-Ray',
                bodyPart: 'Chest PA View',
                orderedBy: 'Dr. Rajesh Sharma',
                clinicalIndication: 'SOB, rule out cardiomegaly',
                priority: 'Routine',
                status: 'Completed',
                findings: 'Borderline cardiomegaly. Clear lung fields.',
                impression: 'No acute cardiopulmonary disease.',
                reportedBy: 'Dr. Radiologist',
                orderDate: new Date('2025-12-26')
            },
            {
                patient: patients[6]._id,
                patientName: 'Mohan Lal Singh',
                imagingType: 'CT Scan',
                bodyPart: 'Coronary Angiography',
                orderedBy: 'Dr. Rajesh Sharma',
                clinicalIndication: 'Acute MI',
                priority: 'Emergency',
                status: 'Completed',
                contrastUsed: true,
                findings: 'LAD 95% occlusion. LCx 40% stenosis.',
                impression: 'Critical LAD occlusion causing STEMI.',
                orderDate: new Date('2025-12-24')
            },
            {
                patient: patients[12]._id,
                patientName: 'Geeta Sharma',
                imagingType: 'CT Scan',
                bodyPart: 'Brain Non-Contrast',
                orderedBy: 'Dr. Vikram Patel',
                clinicalIndication: 'Acute stroke symptoms',
                priority: 'Emergency',
                status: 'Completed',
                findings: 'Hypodensity in right MCA territory.',
                impression: 'Acute right MCA ischemic stroke.',
                orderDate: new Date('2025-12-27')
            },
            {
                patient: patients[11]._id,
                patientName: 'Rohit Kumar',
                imagingType: 'X-Ray',
                bodyPart: 'Chest PA and Lateral',
                orderedBy: 'Dr. Priya Mehta',
                clinicalIndication: 'Fever, cough, respiratory distress',
                priority: 'Urgent',
                status: 'Completed',
                findings: 'Right lower lobe consolidation with air bronchograms.',
                impression: 'Right lower lobe pneumonia.',
                orderDate: new Date('2025-12-27')
            },
            {
                patient: patients[7]._id,
                patientName: 'Rajendra Prasad',
                imagingType: 'X-Ray',
                bodyPart: 'Right Hip',
                orderedBy: 'Dr. Sunil Reddy',
                clinicalIndication: 'Hip pain post fall',
                priority: 'Urgent',
                status: 'Completed',
                findings: 'Displaced intracapsular fracture right NOF.',
                impression: 'Right NOF fracture - THR recommended.',
                orderDate: new Date('2025-12-26')
            },
            {
                patient: patients[8]._id,
                patientName: 'Lakshmi Iyer',
                imagingType: 'Ultrasound',
                bodyPart: 'Abdomen - Hepatobiliary',
                orderedBy: 'Dr. Amit Kapoor',
                clinicalIndication: 'RUQ pain',
                priority: 'Urgent',
                status: 'Completed',
                findings: 'Distended GB with wall thickening. Multiple calculi.',
                impression: 'Acute calculous cholecystitis.',
                orderDate: new Date('2025-12-26')
            },
            {
                patient: patients[1]._id,
                patientName: 'Sunita Devi Patel',
                imagingType: 'MRI',
                bodyPart: 'Both Knees',
                orderedBy: 'Dr. Sunil Reddy',
                clinicalIndication: 'Chronic knee pain',
                priority: 'Routine',
                status: 'Scheduled',
                orderDate: new Date('2025-12-27')
            }
        ]);
        console.log('Created imaging orders...');

        // PRESCRIPTIONS
        const prescriptions = await Prescription.create([
            {
                patient: patients[0]._id,
                patientName: 'Ramesh Kumar Sharma',
                doctor: 'Dr. Rajesh Sharma',
                medicines: [
                    { name: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at bedtime', duration: '3 months' },
                    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: 'Continuous' },
                    { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Continuous' },
                    { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: 'Continuous' }
                ],
                instructions: 'Low salt, low sugar diet. Regular exercise.',
                status: 'Dispensed'
            },
            {
                patient: patients[6]._id,
                patientName: 'Mohan Lal Singh',
                doctor: 'Dr. Rajesh Sharma',
                medicines: [
                    { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', duration: '1 year' },
                    { name: 'Rosuvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', duration: 'Lifelong' },
                    { name: 'Metoprolol', dosage: '50mg', frequency: 'Once daily', duration: 'Continuous' },
                    { name: 'Ramipril', dosage: '5mg', frequency: 'Once daily', duration: 'Continuous' }
                ],
                instructions: 'Cardiac rehab after discharge. Call if chest pain occurs.',
                status: 'Dispensed'
            },
            {
                patient: patients[11]._id,
                patientName: 'Rohit Kumar',
                doctor: 'Dr. Priya Mehta',
                medicines: [
                    { name: 'Amoxicillin-Clavulanate', dosage: '457mg/5ml', frequency: '10ml TID', duration: '7 days' },
                    { name: 'Paracetamol Syrup', dosage: '250mg/5ml', frequency: 'Q6H if fever', duration: 'PRN' },
                    { name: 'Salbutamol Nebulization', dosage: '2.5mg', frequency: 'Q6H', duration: '3 days' }
                ],
                instructions: 'Plenty of fluids. Steam inhalation.',
                status: 'Dispensed'
            },
            {
                patient: patients[12]._id,
                patientName: 'Geeta Sharma',
                doctor: 'Dr. Vikram Patel',
                medicines: [
                    { name: 'Aspirin', dosage: '325mg stat, then 75mg', frequency: 'Once daily', duration: 'Continuous' },
                    { name: 'Atorvastatin', dosage: '80mg', frequency: 'Once daily', duration: 'Continuous' },
                    { name: 'Enoxaparin', dosage: '40mg SC', frequency: 'Once daily', duration: 'During hospitalization' }
                ],
                instructions: 'STROKE PROTOCOL: NPO until swallow assessment.',
                status: 'Dispensed'
            },
            {
                patient: patients[8]._id,
                patientName: 'Lakshmi Iyer',
                doctor: 'Dr. Amit Kapoor',
                medicines: [
                    { name: 'Ceftriaxone', dosage: '1g IV', frequency: 'Twice daily', duration: 'Pre/Post-op' },
                    { name: 'Metronidazole', dosage: '500mg IV', frequency: 'TID', duration: '5 days' },
                    { name: 'Pantoprazole', dosage: '40mg IV', frequency: 'Once daily', duration: 'During admission' }
                ],
                instructions: 'NPO from midnight. Start liquids after 6 hours post-op.',
                status: 'Pending'
            }
        ]);
        console.log('Created prescriptions...');

        // BILLS
        const bills = await Bill.create([
            {
                patient: patients[5]._id,
                patientName: 'Priya Gupta',
                billNumber: 'BILL000001',
                items: [
                    { description: 'LSCS Surgery Charges', quantity: 1, rate: 35000, amount: 35000 },
                    { description: 'Anesthesia', quantity: 1, rate: 8000, amount: 8000 },
                    { description: 'Room (3 days)', quantity: 3, rate: 3500, amount: 10500 },
                    { description: 'Medicines', quantity: 1, rate: 8500, amount: 8500 }
                ],
                subtotal: 62000,
                tax: 0,
                discount: 6200,
                total: 55800,
                paymentStatus: 'Partial',
                paymentMethod: 'Insurance + Cash'
            },
            {
                patient: patients[6]._id,
                patientName: 'Mohan Lal Singh',
                billNumber: 'BILL000002',
                items: [
                    { description: 'CCU (4 days)', quantity: 4, rate: 12000, amount: 48000 },
                    { description: 'Angioplasty + Stent', quantity: 1, rate: 130000, amount: 130000 },
                    { description: 'Medicines', quantity: 1, rate: 18000, amount: 18000 }
                ],
                subtotal: 196000,
                tax: 0,
                discount: 0,
                total: 196000,
                paymentStatus: 'Unpaid'
            },
            {
                patient: patients[0]._id,
                patientName: 'Ramesh Kumar Sharma',
                billNumber: 'BILL000003',
                items: [
                    { description: 'OPD Consultation', quantity: 1, rate: 800, amount: 800 },
                    { description: 'ECG', quantity: 1, rate: 300, amount: 300 },
                    { description: 'Lipid Profile', quantity: 1, rate: 800, amount: 800 },
                    { description: 'Medicines', quantity: 1, rate: 1200, amount: 1200 }
                ],
                subtotal: 3100,
                tax: 0,
                discount: 0,
                total: 3100,
                paymentStatus: 'Paid',
                paymentMethod: 'Cash'
            },
            {
                patient: patients[11]._id,
                patientName: 'Rohit Kumar',
                billNumber: 'BILL000004',
                items: [
                    { description: 'Emergency Consultation', quantity: 1, rate: 1000, amount: 1000 },
                    { description: 'CBC', quantity: 1, rate: 400, amount: 400 },
                    { description: 'X-Ray', quantity: 1, rate: 350, amount: 350 },
                    { description: 'Medicines', quantity: 1, rate: 1500, amount: 1500 }
                ],
                subtotal: 3250,
                tax: 0,
                discount: 250,
                total: 3000,
                paymentStatus: 'Paid',
                paymentMethod: 'Card'
            },
            {
                patient: patients[12]._id,
                patientName: 'Geeta Sharma',
                billNumber: 'BILL000005',
                items: [
                    { description: 'Stroke Code', quantity: 1, rate: 5000, amount: 5000 },
                    { description: 'CT Brain', quantity: 1, rate: 3500, amount: 3500 },
                    { description: 'tPA', quantity: 1, rate: 85000, amount: 85000 },
                    { description: 'ICU (1 day)', quantity: 1, rate: 15000, amount: 15000 }
                ],
                subtotal: 108500,
                tax: 0,
                discount: 0,
                total: 108500,
                paymentStatus: 'Unpaid'
            }
        ]);
        console.log('Created bills...');

        console.log('\n========================================');
        console.log('DATABASE SEEDED SUCCESSFULLY!');
        console.log('========================================');
        console.log('Users: ' + users.length);
        console.log('Patients: ' + patients.length);
        console.log('Surgeries: ' + surgeries.length);
        console.log('Lab Tests: ' + labTests.length);
        console.log('Imaging: ' + imaging.length);
        console.log('Prescriptions: ' + prescriptions.length);
        console.log('Bills: ' + bills.length);
        console.log('========================================');
        console.log('Login: admin / admin123');
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

importData();
