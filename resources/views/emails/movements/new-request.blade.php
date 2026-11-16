<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Movement Request</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #ddd;
        }
        .content {
            padding: 20px;
        }
        .button {
            display: inline-block;
            background-color: #3490dc;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>New Movement Request Requires Your Approval</h1>
    </div>
    
    <div class="content">
        <p>Dear {{ $recipient->name }},</p>
        
        <p>A new movement request has been submitted by <strong>{{ $employee->name_en ?? $employee->full_name_en }}</strong> that requires your approval.</p>
        
        <h2>Movement Details</h2>
        <ul>
            <li><strong>Type:</strong> {{ ucfirst($movement->movement_type) }}</li>
            <li><strong>From:</strong> {{ date('M d, Y H:i', strtotime($movement->from_datetime)) }}</li>
            <li><strong>To:</strong> {{ date('M d, Y H:i', strtotime($movement->to_datetime)) }}</li>
            <li><strong>Destination:</strong> {{ $movement->destination }}</li>
            <li><strong>Purpose:</strong> {{ $movement->purpose }}</li>
        </ul>
        
        <a href="{{ $approveUrl }}" class="button">View Request</a>
        
        <div class="footer">
            <p>Thank you,<br>
            {{ config('app.name') }}</p>
        </div>
    </div>
</body>
</html>