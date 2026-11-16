<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Movement Request Approved</title>
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
            background-color: #4CAF50;
            color: white;
            padding: 15px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            padding: 20px;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 5px 5px;
        }
        .label {
            font-weight: bold;
            display: inline-block;
            width: 120px;
        }
        .detail-row {
            margin-bottom: 10px;
        }
        .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Movement Request Approved</h2>
    </div>

    <div class="content">
        <p>Dear {{ $employeeName }},</p>

        <p>Your movement request has been approved. Below are the details:</p>

        <div class="detail-row">
            <span class="label">Type:</span> {{ ucfirst($movement->movement_type) }} Movement
        </div>

        <div class="detail-row">
            <span class="label">From:</span> {{ $fromDate }}
        </div>

        <div class="detail-row">
            <span class="label">To:</span> {{ $toDate }}
        </div>

        <div class="detail-row">
            <span class="label">Purpose:</span> {{ $movement->purpose }}
        </div>

        <div class="detail-row">
            <span class="label">Destination:</span> {{ $movement->destination }}
        </div>

        @if($movement->remarks)
        <div class="detail-row">
            <span class="label">Remarks:</span> {{ $movement->remarks }}
        </div>
        @endif

        @if($approver)
        <div class="detail-row">
            <span class="label">Approved By:</span> {{ $approver->name }}
        </div>
        @endif

        <div style="text-align: center; margin-top: 30px;">
            <a href="{{ $viewUrl }}" class="button">View Movement Details</a>
        </div>

        <p style="margin-top: 30px;">
            Thank you,<br>
            {{ config('app.name') }}
        </p>
    </div>

    <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
    </div>
</body>
</html>
