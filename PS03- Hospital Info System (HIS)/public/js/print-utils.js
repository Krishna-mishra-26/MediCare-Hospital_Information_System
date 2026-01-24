// ========================================================================
// HOSPITAL INFORMATION SYSTEM - PROFESSIONAL PRINT UTILITIES
// Official Medical Document Printing Functions
// ========================================================================

const PrintUtils = {
    // Hospital Configuration - Customize these for your hospital
    hospitalConfig: {
        name: 'MediCare Plus Hospital',
        tagline: 'Excellence in Healthcare Since 1985',
        address: '123 Healthcare Avenue, Medical District',
        city: 'Mumbai, Maharashtra 400001',
        phone: '+91 22 1234 5678',
        emergency: '+91 22 1234 5679',
        email: 'info@medicareplus.com',
        website: 'www.medicareplus.com',
        regNo: 'MH/HOS/2020/12345',
        accreditation: 'NABH Accredited',
        logo: '🏥' // Can be replaced with actual logo URL
    },

    // Generate Hospital Header HTML
    generateHeader(documentType = '') {
        const config = this.hospitalConfig;
        return `
            <div class="print-header">
                <div class="hospital-logo">
                    <div class="logo-icon">${config.logo}</div>
                    <div>
                        <h1 class="hospital-name">${config.name}</h1>
                        <p class="hospital-tagline">${config.tagline}</p>
                    </div>
                </div>
                <div class="hospital-address">
                    <span>${config.address}</span>
                    <span>${config.city}</span>
                </div>
                <div class="hospital-contact">
                    <span>📞 ${config.phone}</span>
                    <span>🚨 Emergency: ${config.emergency}</span>
                    <span>✉️ ${config.email}</span>
                </div>
                <div class="hospital-reg">
                    Registration No: ${config.regNo} | ${config.accreditation} | ${config.website}
                </div>
            </div>
        `;
    },

    // Generate Footer with Signatures
    generateFooter(doctorName = '', doctorTitle = '', doctorReg = '', showDisclaimer = true) {
        const disclaimer = showDisclaimer ? `
            <div class="print-disclaimer">
                <h6>Disclaimer</h6>
                <p>This document is computer generated and is valid without signature for informational purposes. 
                For official records, a signed copy must be obtained from the hospital administration. 
                The hospital reserves the right to verify the authenticity of this document.</p>
            </div>
        ` : '';

        return `
            <div class="print-footer">
                ${disclaimer}
                <div class="signature-section ${doctorName ? '' : 'single'}">
                    ${doctorName ? `
                        <div class="signature-box">
                            <div class="signature-line">
                                <div class="signature-name">${doctorName}</div>
                                <div class="signature-title">${doctorTitle || 'Attending Physician'}</div>
                                ${doctorReg ? `<div class="signature-reg">Reg. No: ${doctorReg}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    <div class="signature-box">
                        <div class="signature-line">
                            <div class="signature-name">Authorized Signatory</div>
                            <div class="signature-title">${this.hospitalConfig.name}</div>
                        </div>
                    </div>
                </div>
                <div class="text-center text-muted" style="margin-top: 20px; font-size: 8pt;">
                    Printed on: ${new Date().toLocaleString()} | Document ID: ${this.generateDocId()}
                </div>
            </div>
        `;
    },

    // Generate unique document ID
    generateDocId() {
        return 'DOC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    },

    // Convert number to words (for bills)
    numberToWords(num) {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if (num === 0) return 'Zero';
        if (num < 0) return 'Minus ' + this.numberToWords(-num);

        let words = '';
        
        if (Math.floor(num / 10000000) > 0) {
            words += this.numberToWords(Math.floor(num / 10000000)) + ' Crore ';
            num %= 10000000;
        }
        if (Math.floor(num / 100000) > 0) {
            words += this.numberToWords(Math.floor(num / 100000)) + ' Lakh ';
            num %= 100000;
        }
        if (Math.floor(num / 1000) > 0) {
            words += this.numberToWords(Math.floor(num / 1000)) + ' Thousand ';
            num %= 1000;
        }
        if (Math.floor(num / 100) > 0) {
            words += this.numberToWords(Math.floor(num / 100)) + ' Hundred ';
            num %= 100;
        }
        if (num > 0) {
            if (num < 20) {
                words += ones[num];
            } else {
                words += tens[Math.floor(num / 10)];
                if (num % 10 > 0) words += '-' + ones[num % 10];
            }
        }
        return words.trim();
    },

    // Open print window with document
    openPrintWindow(content, title = 'Hospital Document') {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title} - ${this.hospitalConfig.name}</title>
                <meta charset="UTF-8">
                <link rel="stylesheet" href="/css/print.css">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
                    body {
                        font-family: 'Georgia', 'Times New Roman', serif;
                        margin: 0;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    @media print {
                        body { background: white; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="print-document">
                    ${content}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    // ============================================================
    // PRESCRIPTION PRINT
    // ============================================================
    printPrescription(prescription) {
        const rx = prescription;
        const medicinesList = rx.medicines?.map((m, i) => `
            <div class="print-medicine-item">
                <div class="medicine-name">${i + 1}. ${m.name}</div>
                <div class="medicine-details">
                    <span><strong>Dosage:</strong> ${m.dosage || 'As directed'}</span>
                    <span><strong>Frequency:</strong> ${m.frequency || 'As needed'}</span>
                    <span><strong>Duration:</strong> ${m.duration || 'As prescribed'}</span>
                </div>
            </div>
        `).join('') || '<p class="text-muted">No medicines prescribed</p>';

        const content = `
            ${this.generateHeader('PRESCRIPTION')}
            
            <div class="print-title">PRESCRIPTION</div>
            
            <div class="print-info-bar">
                <div class="print-info-item">
                    <span class="label">Prescription ID:</span>
                    <span class="value">${rx._id?.substr(-8).toUpperCase() || 'N/A'}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Date:</span>
                    <span class="value">${new Date(rx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
            </div>
            
            <div class="print-patient-box">
                <h4>Patient Information</h4>
                <div class="print-patient-grid">
                    <div class="print-patient-row">
                        <span class="label">Patient Name:</span>
                        <span class="value">${rx.patientName || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Patient ID:</span>
                        <span class="value">${rx.patientId || rx.patient || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Age/Gender:</span>
                        <span class="value">${rx.age || '-'} / ${rx.gender || '-'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Diagnosis:</span>
                        <span class="value">${rx.diagnosis || 'As per examination'}</span>
                    </div>
                </div>
            </div>
            
            <div style="margin: 25px 0;">
                <span class="rx-symbol">℞</span>
                <div class="print-medicine-list">
                    ${medicinesList}
                </div>
            </div>
            
            ${rx.instructions ? `
                <div class="print-instructions">
                    <h5>Special Instructions</h5>
                    <p>${rx.instructions}</p>
                </div>
            ` : ''}
            
            ${this.generateFooter(rx.doctor, 'Consulting Physician', rx.doctorReg)}
        `;

        this.openPrintWindow(content, `Prescription - ${rx.patientName}`);
    },

    // ============================================================
    // BILL / INVOICE PRINT
    // ============================================================
    printBill(bill) {
        const itemsRows = bill.items?.map((item, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${item.description || item.name || 'Item'}</td>
                <td class="text-right">${item.quantity || 1}</td>
                <td class="text-right">${this.formatCurrency(item.rate || item.price || 0)}</td>
                <td class="text-right">${this.formatCurrency(item.amount || (item.quantity * item.rate) || 0)}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center">No items</td></tr>';

        const subtotal = bill.subtotal || bill.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
        const tax = bill.tax || 0;
        const discount = bill.discount || 0;
        const total = bill.total || (subtotal + tax - discount);
        const amountInWords = this.numberToWords(Math.floor(total)) + ' Rupees Only';

        const paymentStatusClass = bill.paymentStatus?.toLowerCase() === 'paid' ? 'paid' : 'pending';
        const paymentBoxClass = bill.paymentStatus?.toLowerCase() === 'paid' ? '' : 'pending';

        const content = `
            ${this.generateHeader('INVOICE')}
            
            <div class="print-title">TAX INVOICE</div>
            
            <div class="print-bill-header">
                <div class="print-patient-box" style="flex: 1; margin-right: 20px;">
                    <h4>Bill To</h4>
                    <div class="print-patient-grid single-column">
                        <div class="print-patient-row">
                            <span class="label">Patient Name:</span>
                            <span class="value">${bill.patientName || 'N/A'}</span>
                        </div>
                        <div class="print-patient-row">
                            <span class="label">Patient ID:</span>
                            <span class="value">${bill.patientId || bill.patient || 'N/A'}</span>
                        </div>
                        <div class="print-patient-row">
                            <span class="label">Contact:</span>
                            <span class="value">${bill.contact || bill.phone || 'N/A'}</span>
                        </div>
                        <div class="print-patient-row">
                            <span class="label">Address:</span>
                            <span class="value">${bill.address || 'On File'}</span>
                        </div>
                    </div>
                </div>
                <div class="bill-number-box">
                    <div class="bill-number">Invoice #${bill.billNumber || bill._id?.substr(-6).toUpperCase()}</div>
                    <div class="bill-date">Date: ${new Date(bill.createdAt || bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div class="bill-date">Due Date: ${new Date(bill.dueDate || Date.now() + 7*24*60*60*1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
            </div>
            
            <table class="print-bill-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th>Description</th>
                        <th style="width: 60px;">Qty</th>
                        <th style="width: 100px;">Rate</th>
                        <th style="width: 100px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
                <tfoot>
                    <tr class="subtotal">
                        <td colspan="4" class="text-right">Subtotal:</td>
                        <td class="text-right">${this.formatCurrency(subtotal)}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="text-right">Tax (GST):</td>
                        <td class="text-right">${this.formatCurrency(tax)}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="text-right">Discount:</td>
                        <td class="text-right">- ${this.formatCurrency(discount)}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4" class="text-right"><strong>TOTAL:</strong></td>
                        <td class="text-right"><strong>${this.formatCurrency(total)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="amount-in-words">
                <strong>Amount in Words:</strong> ${amountInWords}
            </div>
            
            <div class="payment-info-box ${paymentBoxClass}">
                <div>
                    <strong>Payment Method:</strong> ${bill.paymentMethod || 'Cash/Card/UPI'}
                </div>
                <div class="payment-status ${paymentStatusClass}">
                    ${bill.paymentStatus?.toUpperCase() || 'PENDING'}
                    ${bill.paymentStatus?.toLowerCase() === 'paid' ? ' ✓' : ''}
                </div>
            </div>
            
            ${bill.paymentStatus?.toLowerCase() === 'paid' ? `
                <div style="text-align: right; margin: 15px 0;">
                    <span class="official-stamp paid">PAID</span>
                </div>
            ` : ''}
            
            ${this.generateFooter('', '', '', true)}
            
            <div class="print-disclaimer" style="margin-top: 20px;">
                <h6>Terms & Conditions</h6>
                <p>1. Payment is due within 7 days of invoice date. 2. Please quote invoice number for all correspondence. 
                3. All disputes are subject to Mumbai jurisdiction. 4. E&OE - Errors and Omissions Excepted.</p>
            </div>
        `;

        this.openPrintWindow(content, `Invoice - ${bill.billNumber || bill._id}`);
    },

    // ============================================================
    // LAB TEST REPORT PRINT
    // ============================================================
    printLabReport(labTest) {
        const resultsRows = labTest.results?.map(r => {
            const isAbnormal = r.flag === 'High' || r.flag === 'Low' || r.isAbnormal;
            return `
                <tr>
                    <td>${r.testName || r.name}</td>
                    <td class="${isAbnormal ? 'result-abnormal' : 'result-normal'}">${r.result || r.value} ${r.unit || ''}</td>
                    <td class="reference-range">${r.referenceRange || r.normalRange || '-'}</td>
                    <td>${r.flag || (isAbnormal ? '⚠️' : '✓')}</td>
                </tr>
            `;
        }).join('') || `
            <tr>
                <td>${labTest.testName || labTest.type}</td>
                <td class="result-normal">${labTest.result || 'Pending'}</td>
                <td class="reference-range">${labTest.referenceRange || '-'}</td>
                <td>${labTest.status || '-'}</td>
            </tr>
        `;

        const content = `
            ${this.generateHeader('LAB REPORT')}
            
            <div class="print-title">LABORATORY TEST REPORT</div>
            
            <div class="print-info-bar">
                <div class="print-info-item">
                    <span class="label">Lab ID:</span>
                    <span class="value">${labTest.labId || labTest._id?.substr(-8).toUpperCase()}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Sample Date:</span>
                    <span class="value">${new Date(labTest.sampleDate || labTest.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Report Date:</span>
                    <span class="value">${new Date(labTest.reportDate || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
            </div>
            
            <div class="print-patient-box">
                <h4>Patient Information</h4>
                <div class="print-patient-grid">
                    <div class="print-patient-row">
                        <span class="label">Patient Name:</span>
                        <span class="value">${labTest.patientName || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Patient ID:</span>
                        <span class="value">${labTest.patientId || labTest.patient || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Age/Gender:</span>
                        <span class="value">${labTest.age || '-'} / ${labTest.gender || '-'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Referred By:</span>
                        <span class="value">Dr. ${labTest.referredBy || labTest.doctor || 'Self'}</span>
                    </div>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <h4 style="color: #2c5282; margin-bottom: 10px;">
                    ${labTest.testName || labTest.type || 'Laboratory Test'} Results
                </h4>
                <table class="print-lab-table">
                    <thead>
                        <tr>
                            <th>Test Parameter</th>
                            <th>Result</th>
                            <th>Reference Range</th>
                            <th>Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultsRows}
                    </tbody>
                </table>
            </div>
            
            ${labTest.interpretation || labTest.notes ? `
                <div class="lab-interpretation">
                    <h5>Interpretation / Notes</h5>
                    <p>${labTest.interpretation || labTest.notes}</p>
                </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 9pt;">
                <div>
                    <strong>Sample Type:</strong> ${labTest.sampleType || 'Blood'}<br>
                    <strong>Collection Time:</strong> ${labTest.collectionTime || 'Morning'}
                </div>
                <div>
                    <strong>Method:</strong> ${labTest.method || 'Standard'}<br>
                    <strong>Equipment:</strong> ${labTest.equipment || 'Automated Analyzer'}
                </div>
            </div>
            
            ${this.generateFooter(labTest.pathologist || 'Dr. Lab Pathologist', 'Consultant Pathologist', labTest.pathologistReg)}
            
            <div class="print-disclaimer">
                <p>⚠️ Test results should be correlated clinically. Values outside reference range may not necessarily indicate disease. 
                Please consult your physician for proper interpretation.</p>
            </div>
        `;

        this.openPrintWindow(content, `Lab Report - ${labTest.patientName}`);
    },

    // ============================================================
    // IMAGING / RADIOLOGY REPORT PRINT
    // ============================================================
    printImagingReport(imaging) {
        const content = `
            ${this.generateHeader('RADIOLOGY REPORT')}
            
            <div class="print-title">RADIOLOGY / IMAGING REPORT</div>
            
            <div class="print-info-bar">
                <div class="print-info-item">
                    <span class="label">Study ID:</span>
                    <span class="value">${imaging.studyId || imaging._id?.substr(-8).toUpperCase()}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Study Date:</span>
                    <span class="value">${new Date(imaging.studyDate || imaging.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Report Date:</span>
                    <span class="value">${new Date(imaging.reportDate || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
            </div>
            
            <div class="print-patient-box">
                <h4>Patient Information</h4>
                <div class="print-patient-grid">
                    <div class="print-patient-row">
                        <span class="label">Patient Name:</span>
                        <span class="value">${imaging.patientName || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Patient ID:</span>
                        <span class="value">${imaging.patientId || imaging.patient || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Age/Gender:</span>
                        <span class="value">${imaging.age || '-'} / ${imaging.gender || '-'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Referred By:</span>
                        <span class="value">Dr. ${imaging.referredBy || imaging.doctor || 'Self'}</span>
                    </div>
                </div>
            </div>
            
            <div class="imaging-details-box">
                <h5>Study Information</h5>
                <div class="print-patient-grid">
                    <div class="print-patient-row">
                        <span class="label">Modality:</span>
                        <span class="value">${imaging.type || imaging.modality || 'X-Ray'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Body Part:</span>
                        <span class="value">${imaging.bodyPart || imaging.region || 'As specified'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Clinical History:</span>
                        <span class="value">${imaging.clinicalHistory || imaging.indication || 'As mentioned'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Contrast:</span>
                        <span class="value">${imaging.contrast || 'None'}</span>
                    </div>
                </div>
            </div>
            
            <div class="findings-box">
                <h5>Findings</h5>
                <p>${imaging.findings || imaging.result || 'Findings documented by radiologist.'}</p>
            </div>
            
            <div class="impression-box">
                <h5 style="margin: 0 0 8px 0; color: #2e7d32;">Impression</h5>
                <p style="margin: 0; font-weight: bold;">${imaging.impression || imaging.diagnosis || 'As per findings above.'}</p>
            </div>
            
            ${imaging.recommendations ? `
                <div class="print-instructions">
                    <h5>Recommendations</h5>
                    <p>${imaging.recommendations}</p>
                </div>
            ` : ''}
            
            ${this.generateFooter(imaging.radiologist || 'Dr. Radiologist', 'Consultant Radiologist', imaging.radiologistReg)}
            
            <div class="print-disclaimer">
                <p>This report is based on the imaging study performed. Clinical correlation is recommended. 
                Images are available in PACS/Digital archive for reference.</p>
            </div>
        `;

        this.openPrintWindow(content, `Imaging Report - ${imaging.patientName}`);
    },

    // ============================================================
    // SURGERY / OPERATION REPORT PRINT
    // ============================================================
    printSurgeryReport(surgery) {
        const content = `
            ${this.generateHeader('OPERATIVE REPORT')}
            
            <div class="print-title">OPERATIVE / SURGICAL REPORT</div>
            
            <div class="print-info-bar">
                <div class="print-info-item">
                    <span class="label">Surgery ID:</span>
                    <span class="value">${surgery.surgeryId || surgery._id?.substr(-8).toUpperCase()}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Date:</span>
                    <span class="value">${new Date(surgery.date || surgery.scheduledDate || surgery.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Status:</span>
                    <span class="value">${surgery.status || 'Completed'}</span>
                </div>
            </div>
            
            <div class="print-patient-box">
                <h4>Patient Information</h4>
                <div class="print-patient-grid">
                    <div class="print-patient-row">
                        <span class="label">Patient Name:</span>
                        <span class="value">${surgery.patientName || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Patient ID:</span>
                        <span class="value">${surgery.patientId || surgery.patient || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Age/Gender:</span>
                        <span class="value">${surgery.age || '-'} / ${surgery.gender || '-'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Blood Group:</span>
                        <span class="value">${surgery.bloodGroup || 'On File'}</span>
                    </div>
                </div>
            </div>
            
            <div class="surgery-info-grid">
                <div class="surgery-info-card">
                    <h5>Surgery Details</h5>
                    <p><strong>Procedure:</strong> ${surgery.procedure || surgery.surgeryType || surgery.type || 'N/A'}</p>
                    <p><strong>Operation Theatre:</strong> ${surgery.operatingRoom || surgery.otRoom || 'OT-1'}</p>
                    <p><strong>Anesthesia:</strong> ${surgery.anesthesia || surgery.anesthesiaType || 'General'}</p>
                </div>
                <div class="surgery-info-card">
                    <h5>Surgical Team</h5>
                    <p><strong>Lead Surgeon:</strong> Dr. ${surgery.surgeon || surgery.doctor || 'N/A'}</p>
                    <p><strong>Assistant:</strong> ${surgery.assistant || 'As assigned'}</p>
                    <p><strong>Anesthetist:</strong> Dr. ${surgery.anesthetist || 'On duty'}</p>
                </div>
            </div>
            
            <div class="surgery-timeline">
                <h5 style="margin: 0 0 15px 0; color: #1a5f7a;">Surgery Timeline</h5>
                <div class="timeline-item">
                    <span class="timeline-time">Start</span>
                    <span>${surgery.startTime || surgery.time || 'As scheduled'}</span>
                </div>
                <div class="timeline-item">
                    <span class="timeline-time">Duration</span>
                    <span>${surgery.duration || 'As per procedure'}</span>
                </div>
                <div class="timeline-item">
                    <span class="timeline-time">End</span>
                    <span>${surgery.endTime || 'Completed successfully'}</span>
                </div>
            </div>
            
            ${surgery.preOpDiagnosis || surgery.diagnosis ? `
                <div class="findings-box">
                    <h5>Pre-Operative Diagnosis</h5>
                    <p>${surgery.preOpDiagnosis || surgery.diagnosis}</p>
                </div>
            ` : ''}
            
            ${surgery.findings || surgery.operativeFindings ? `
                <div class="findings-box">
                    <h5>Operative Findings</h5>
                    <p>${surgery.findings || surgery.operativeFindings}</p>
                </div>
            ` : ''}
            
            ${surgery.postOpInstructions || surgery.notes ? `
                <div class="print-instructions">
                    <h5>Post-Operative Instructions</h5>
                    <p>${surgery.postOpInstructions || surgery.notes}</p>
                </div>
            ` : ''}
            
            ${this.generateFooter(surgery.surgeon || surgery.doctor, 'Lead Surgeon', surgery.surgeonReg)}
        `;

        this.openPrintWindow(content, `Surgery Report - ${surgery.patientName}`);
    },

    // ============================================================
    // PATIENT DETAILS / SUMMARY PRINT
    // ============================================================
    printPatientSummary(patient) {
        const content = `
            ${this.generateHeader('PATIENT SUMMARY')}
            
            <div class="print-title">PATIENT INFORMATION SUMMARY</div>
            
            <div class="print-info-bar">
                <div class="print-info-item">
                    <span class="label">Patient ID:</span>
                    <span class="value">${patient.patientId || patient._id || 'N/A'}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Registration Date:</span>
                    <span class="value">${new Date(patient.registrationDate || patient.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Status:</span>
                    <span class="value">${patient.status || 'Active'}</span>
                </div>
            </div>
            
            <div class="print-patient-box">
                <h4>Personal Information</h4>
                <div class="print-patient-grid">
                    <div class="print-patient-row">
                        <span class="label">Full Name:</span>
                        <span class="value">${patient.name || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Age:</span>
                        <span class="value">${patient.age || '-'} Years</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Gender:</span>
                        <span class="value">${patient.gender || '-'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Blood Group:</span>
                        <span class="value">${patient.bloodGroup || 'Not recorded'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Contact:</span>
                        <span class="value">${patient.contact || patient.phone || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Email:</span>
                        <span class="value">${patient.email || 'N/A'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Address:</span>
                        <span class="value">${patient.address || 'On File'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Emergency Contact:</span>
                        <span class="value">${patient.emergencyContact || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="print-patient-box" style="background: #e8f5e9;">
                <h4 style="color: #2e7d32;">Medical Information</h4>
                <div class="print-patient-grid single-column">
                    <div class="print-patient-row">
                        <span class="label">Diagnosis:</span>
                        <span class="value">${patient.diagnosis || 'As per medical records'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Allergies:</span>
                        <span class="value" style="color: ${patient.allergies ? '#c62828' : '#666'};">${patient.allergies || 'None known'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Medical History:</span>
                        <span class="value">${patient.medicalHistory || 'No significant history'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Current Medications:</span>
                        <span class="value">${patient.currentMedications || 'As prescribed'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Treating Doctor:</span>
                        <span class="value">Dr. ${patient.doctor || patient.assignedDoctor || 'On Assignment'}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Department:</span>
                        <span class="value">${patient.department || 'General'}</span>
                    </div>
                </div>
            </div>
            
            ${patient.type === 'IPD' || patient.ward ? `
                <div class="print-patient-box" style="background: #e3f2fd;">
                    <h4 style="color: #1565c0;">Admission Details</h4>
                    <div class="print-patient-grid">
                        <div class="print-patient-row">
                            <span class="label">Ward:</span>
                            <span class="value">${patient.ward || 'General Ward'}</span>
                        </div>
                        <div class="print-patient-row">
                            <span class="label">Bed No:</span>
                            <span class="value">${patient.bedNumber || patient.bed || 'Assigned'}</span>
                        </div>
                        <div class="print-patient-row">
                            <span class="label">Admission Date:</span>
                            <span class="value">${patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                        <div class="print-patient-row">
                            <span class="label">Expected Discharge:</span>
                            <span class="value">${patient.expectedDischarge ? new Date(patient.expectedDischarge).toLocaleDateString('en-IN') : 'TBD'}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${patient.insurance ? `
                <div class="print-patient-box" style="background: #fff3e0;">
                    <h4 style="color: #e65100;">Insurance Information</h4>
                    <div class="print-patient-grid">
                        <div class="print-patient-row">
                            <span class="label">Provider:</span>
                            <span class="value">${patient.insuranceProvider || patient.insurance || 'N/A'}</span>
                        </div>
                        <div class="print-patient-row">
                            <span class="label">Policy No:</span>
                            <span class="value">${patient.policyNumber || 'On File'}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${this.generateFooter()}
        `;

        this.openPrintWindow(content, `Patient Summary - ${patient.name}`);
    },

    // ============================================================
    // GENERAL SECTION PRINT (Dashboard sections)
    // ============================================================
    printSection(sectionTitle, sectionContent) {
        const content = `
            ${this.generateHeader('REPORT')}
            
            <div class="print-title">${sectionTitle.toUpperCase()} REPORT</div>
            
            <div class="print-info-bar">
                <div class="print-info-item">
                    <span class="label">Generated:</span>
                    <span class="value">${new Date().toLocaleString('en-IN')}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Report Type:</span>
                    <span class="value">${sectionTitle}</span>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                ${sectionContent}
            </div>
            
            ${this.generateFooter()}
        `;

        this.openPrintWindow(content, `${sectionTitle} Report`);
    },

    // ============================================================
    // DISCHARGE SUMMARY PRINT
    // ============================================================
    printDischargeSummary(patient) {
        const content = `
            ${this.generateHeader('DISCHARGE SUMMARY')}
            
            <div class="print-title">DISCHARGE SUMMARY</div>
            
            <div class="print-info-bar">
                <div class="print-info-item">
                    <span class="label">Patient ID:</span>
                    <span class="value">${patient.patientId || patient._id}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Admission:</span>
                    <span class="value">${patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
                <div class="print-info-item">
                    <span class="label">Discharge:</span>
                    <span class="value">${new Date().toLocaleDateString('en-IN')}</span>
                </div>
            </div>
            
            <div class="print-patient-box">
                <h4>Patient Information</h4>
                <div class="print-patient-grid">
                    <div class="print-patient-row">
                        <span class="label">Name:</span>
                        <span class="value">${patient.name}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Age/Gender:</span>
                        <span class="value">${patient.age} / ${patient.gender}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Contact:</span>
                        <span class="value">${patient.contact || patient.phone}</span>
                    </div>
                    <div class="print-patient-row">
                        <span class="label">Ward/Bed:</span>
                        <span class="value">${patient.ward || '-'} / ${patient.bed || patient.bedNumber || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="findings-box">
                <h5>Diagnosis</h5>
                <p>${patient.diagnosis || 'As per medical records'}</p>
            </div>
            
            <div class="findings-box">
                <h5>Treatment Summary</h5>
                <p>${patient.treatmentSummary || patient.treatment || 'Treatment provided as per medical protocols.'}</p>
            </div>
            
            <div class="findings-box">
                <h5>Condition at Discharge</h5>
                <p>${patient.conditionAtDischarge || 'Stable and improved'}</p>
            </div>
            
            <div class="print-instructions">
                <h5>Discharge Instructions</h5>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Follow prescribed medications regularly</li>
                    <li>Follow-up appointment: ${patient.followUpDate || 'As advised'}</li>
                    <li>Diet: ${patient.dietAdvice || 'As advised by dietitian'}</li>
                    <li>Activity: ${patient.activityAdvice || 'Normal activities as tolerated'}</li>
                    <li>Warning signs to watch: ${patient.warningSignsSigns || 'Fever, severe pain, bleeding'}</li>
                </ul>
            </div>
            
            ${patient.prescribedMedications ? `
                <div style="margin: 20px 0;">
                    <h5 style="color: #1a5f7a;">Medications at Discharge</h5>
                    <p>${patient.prescribedMedications}</p>
                </div>
            ` : ''}
            
            ${this.generateFooter(patient.doctor || patient.assignedDoctor, 'Attending Physician')}
            
            <div style="text-align: center; margin-top: 20px;">
                <span class="official-stamp">DISCHARGED</span>
            </div>
        `;

        this.openPrintWindow(content, `Discharge Summary - ${patient.name}`);
    }
};

// Make it globally available
window.PrintUtils = PrintUtils;
