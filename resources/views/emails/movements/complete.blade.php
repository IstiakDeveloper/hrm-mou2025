<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            text-align: center;
        }
        .content {
            padding: 20px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Movement Completed</h2>
        </div>

        <div class="content">
            <p>Hello,</p>

            <p><strong>{{ $employeeName }}</strong> has returned from their {{ $movementType }} movement.</p>

            <table>
                <tr>
                    <th>Employee</th>
                    <td>{{ $employeeName }}</td>
                </tr>
                <tr>
                    <th>Movement Type</th>
                    <td>{{ ucfirst($movementType) }}</td>
                </tr>
                <tr>
                    <th>From</th>
                    <td>{{ $fromDate }}</td>
                </tr>
                <tr>
                    <th>To (Planned)</th>
                    <td>{{ $toDate }}</td>
                </tr>
                <tr>
                    <th>Actual Return</th>
                    <td><strong>{{ $returnDate }}</strong></td>
                </tr>
                <tr>
                    <th>Purpose</th>
                    <td>{{ $purpose }}</td>
                </tr>
                <tr>
                    <th>Destination</th>
                    <td>{{ $destination }}</td>
                </tr>
            </table>

            <p>This movement has been marked as completed in the system.</p>
        </div>

        <div class="footer">
            <p>This is an automated email from your HR Management System.</p>
        </div>
    </div>
</body>
</html>
