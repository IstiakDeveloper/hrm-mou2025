<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Employee Information Form</title>
    <style>
        @page {
            size: A4;
            margin: 12mm;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #000;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #333;
            padding-bottom: 8px;
        }
        .header h1 {
            font-size: 18px;
            margin: 0 0 3px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .header p {
            margin: 2px 0;
            font-size: 9px;
            color: #555;
        }
        .form-section {
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #f0f0f0;
            padding: 5px 8px;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            border-left: 3px solid #333;
            margin-bottom: 8px;
        }
        .form-row {
            display: table;
            width: 100%;
            margin-bottom: 6px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .form-row:last-child {
            border-bottom: none;
        }
        .form-label {
            display: table-cell;
            width: 35%;
            font-weight: bold;
            padding-right: 10px;
            vertical-align: top;
            padding-top: 3px;
        }
        .form-value {
            display: table-cell;
            width: 65%;
            border-bottom: 1px solid #000;
            min-height: 18px;
            padding: 2px 5px;
        }
        .form-value-tall {
            min-height: 30px;
        }
        .two-column {
            width: 48%;
            display: inline-block;
            vertical-align: top;
        }
        .two-column:first-child {
            margin-right: 3%;
        }
        .checkbox-group {
            display: inline-block;
            margin-right: 20px;
        }
        .checkbox {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #000;
            margin-right: 5px;
            vertical-align: middle;
        }
        .photo-box {
            width: 110px;
            height: 130px;
            border: 2px solid #333;
            float: right;
            margin: 5px;
            text-align: center;
            padding-top: 55px;
            color: #999;
            font-size: 9px;
        }
        .signature-section {
            margin-top: 20px;
            page-break-inside: avoid;
        }
        .signature-box {
            width: 45%;
            display: inline-block;
            vertical-align: top;
            margin-top: 15px;
        }
        .signature-box:first-child {
            margin-right: 8%;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
            text-align: center;
            font-size: 9px;
        }
        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 9px;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
        }
        table td {
            padding: 5px;
            border: 1px solid #ddd;
        }
        .instructions {
            background-color: #f9f9f9;
            padding: 6px;
            margin-bottom: 10px;
            border-left: 3px solid #666;
            font-size: 9px;
            color: #555;
        }
        @media print {
            .no-print {
                display: none;
            }
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>Employee Information Form</h1>
        <p>Human Resource Management System</p>
        <p>Please fill out this form completely and legibly in BLOCK LETTERS</p>
    </div>

    <div class="instructions no-print">
        <strong>Instructions:</strong> Please print this form and fill it out by hand. Use black or blue ink only. Attach recent passport-size photograph in the designated box.
    </div>

    <!-- Photo Box -->
    <div class="photo-box">
        AFFIX<br>RECENT<br>PHOTOGRAPH<br>HERE
    </div>

    <!-- Personal Information Section -->
    <div class="form-section">
        <div class="section-title">1. Personal Information</div>

        <div class="form-row">
            <div class="form-label">Employee ID:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">First Name:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Last Name:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Gender:</div>
            <div class="form-value">
                <span class="checkbox-group">
                    <span class="checkbox"></span> Male
                </span>
                <span class="checkbox-group">
                    <span class="checkbox"></span> Female
                </span>
                <span class="checkbox-group">
                    <span class="checkbox"></span> Other
                </span>
            </div>
        </div>

        <div class="form-row">
            <div class="form-label">Date of Birth:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Blood Group:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">National ID (NID):</div>
            <div class="form-value"></div>
        </div>
    </div>

    <!-- Contact Information Section -->
    <div class="form-section">
        <div class="section-title">2. Contact Information</div>

        <div class="form-row">
            <div class="form-label">Email Address:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Phone Number:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Emergency Contact:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Present Address:</div>
            <div class="form-value form-value-tall"></div>
        </div>
    </div>

    <!-- Employment Details Section -->
    <div class="form-section">
        <div class="section-title">3. Employment Details</div>

        <div class="form-row">
            <div class="form-label">Joining Date:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Department:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Designation:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Branch:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Reporting To (Manager):</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Employment Status:</div>
            <div class="form-value">
                <span class="checkbox-group">
                    <span class="checkbox"></span> Active
                </span>
                <span class="checkbox-group">
                    <span class="checkbox"></span> Inactive
                </span>
                <span class="checkbox-group">
                    <span class="checkbox"></span> On Leave
                </span>
                <span class="checkbox-group">
                    <span class="checkbox"></span> Terminated
                </span>
            </div>
        </div>
    </div>

    <!-- Salary & Banking Information Section -->
    <div class="form-section">
        <div class="section-title">4. Salary & Banking Information</div>

        <div class="form-row">
            <div class="form-label">Basic Salary:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Bank Name:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Bank Account Number:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Branch Name:</div>
            <div class="form-value"></div>
        </div>

        <div class="form-row">
            <div class="form-label">Routing Number:</div>
            <div class="form-value"></div>
        </div>
    </div>

    <!-- Declaration & Signature Section -->
    <div class="signature-section">
        <div class="section-title">5. Declaration</div>
        <p style="margin: 8px 0; font-size: 9px; line-height: 1.4;">
            I hereby declare that the information provided above is true and correct to the best of my knowledge.
            I understand that any false information may lead to termination of my employment.
        </p>

        <div class="signature-box">
            <div class="signature-line">
                Employee's Signature
            </div>
            <div style="margin-top: 8px; text-align: center; font-size: 9px;">
                Date: _____________________
            </div>
        </div>

        <div class="signature-box">
            <div class="signature-line">
                HR Manager's Signature
            </div>
            <div style="margin-top: 8px; text-align: center; font-size: 9px;">
                Date: _____________________
            </div>
        </div>
    </div>

    <div style="clear: both;"></div>

    <div class="footer no-print">
        Generated on {{ now()->format('F d, Y') }} | Human Resource Management System
    </div>

</body>
</html>
