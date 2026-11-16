<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Account Information</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }

        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.2em;
            margin-bottom: 10px;
        }

        .content {
            padding: 40px 30px;
        }

        .account-details {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #4facfe;
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #dee2e6;
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-label {
            font-weight: 600;
            color: #495057;
        }

        .detail-value {
            color: #4facfe;
            font-weight: 500;
        }

        .footer {
            background: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
        }

        @media (max-width: 600px) {
            .email-container {
                margin: 20px;
            }

            .header, .content {
                padding: 25px 20px;
            }

            .detail-row {
                flex-direction: column;
                align-items: flex-start;
            }

            .detail-value {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📊 Account Information</h1>
            <p>Your current account details</p>
        </div>

        <div class="content">
            <p>Hello <strong>{{ $user->name }}</strong>,</p>

            <p>Here's a summary of your current account information:</p>

            <div class="account-details">
                <div class="detail-row">
                    <span class="detail-label">👤 Full Name: </span>
                    <span class="detail-value">{{ $user->name }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🔤 Username (login): </span>
                    <span class="detail-value">{{ $user->username }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">✉️ Email Address: </span>
                    <span class="detail-value">{{ $user->email }}</span>
                </div>
                @if($employee && $employee->employee_id)
                <div class="detail-row">
                    <span class="detail-label">🆔 Employee ID: </span>
                    <span class="detail-value">{{ $employee->employee_id }}</span>
                </div>
                @endif
                @if($roleNames)
                <div class="detail-row">
                    <span class="detail-label">🎯 Assigned Roles: </span>
                    <span class="detail-value">{{ $roleNames }}</span>
                </div>
                @endif
                <div class="detail-row">
                    <span class="detail-label">🔑 Password: </span>
                    <span class="detail-value">12345678</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🌐 Portal Access: </span>
                    <span class="detail-value"><a href="{{ $siteUrl }}" style="color: #4facfe; text-decoration: none;">{{ $siteUrl }}</a></span>
                </div>
            </div>

            <p>If you notice any discrepancies or need to update any information, please contact our support team immediately.</p>

            <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>{{ config('app.name') }} Team</strong>
            </p>
        </div>

        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
            <p>This email was sent from an automated system.</p>
        </div>
    </div>
</body>
</html>
