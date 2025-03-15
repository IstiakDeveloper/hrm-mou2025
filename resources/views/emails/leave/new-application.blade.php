<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Leave Application</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-bottom: 3px solid #4f46e5;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #4f46e5;
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 20px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .employee-name {
            font-weight: bold;
            color: #4f46e5;
        }
        .details {
            margin: 20px 0;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
        }
        .details h2 {
            margin-top: 0;
            font-size: 18px;
            color: #4f46e5;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        .details table {
            width: 100%;
            border-collapse: collapse;
        }
        .details table td {
            padding: 8px 0;
        }
        .details table td:first-child {
            font-weight: bold;
            width: 40%;
        }
        .button {
            display: inline-block;
            background-color: #4f46e5;
            color: white;
            text-decoration: none;
            padding: 12px 20px;
            border-radius: 5px;
            margin-top: 20px;
            font-weight: bold;
        }
        .button:hover {
            background-color: #4338ca;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>New Leave Application Requires Your Approval</h1>
    </div>
    
    <div class="content">
        <p>Dear {{ $recipient->name }},</p>
        
        <p>A new leave application has been submitted by <span class="employee-name">{{ $employee->first_name }} {{ $employee->last_name }}</span> that requires your approval.</p>
        
        <div class="details">
            <h2>Leave Application Details</h2>
            <table>
                <tr>
                    <td>Leave Type:</td>
                    <td>{{ $leaveType->name }}</td>
                </tr>
                <tr>
                    <td>From:</td>
                    <td>{{ date('M d, Y', strtotime($leaveApplication->start_date)) }}</td>
                </tr>
                <tr>
                    <td>To:</td>
                    <td>{{ date('M d, Y', strtotime($leaveApplication->end_date)) }}</td>
                </tr>
                <tr>
                    <td>Total Days:</td>
                    <td>{{ $leaveApplication->days }} days</td>
                </tr>
                <tr>
                    <td>Reason:</td>
                    <td>{{ $leaveApplication->reason }}</td>
                </tr>
                @if($employee->department)
                <tr>
                    <td>Department:</td>
                    <td>{{ $employee->department->name }}</td>
                </tr>
                @endif
                @if($employee->designation)
                <tr>
                    <td>Designation:</td>
                    <td>{{ $employee->designation->name }}</td>
                </tr>
                @endif
                <tr>
                    <td>Applied On:</td>
                    <td>{{ date('M d, Y H:i', strtotime($leaveApplication->applied_at)) }}</td>
                </tr>
            </table>
        </div>
        
        <center>
            <a href="{{ $approveUrl }}" class="button">View Request</a>
        </center>
        
        <div class="footer">
            <p>This is an automated message from {{ config('app.name') }}. Please do not reply to this email.</p>
            <p>If you have any questions, please contact the HR department.</p>
        </div>
    </div>
</body>
</html>