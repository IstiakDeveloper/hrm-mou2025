<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{ config('app.name') }}</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }

        .header p {
            font-size: 1.2em;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }

        .content {
            padding: 40px 30px;
        }

        .welcome-message {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
        }

        .welcome-message h2 {
            font-size: 1.8em;
            margin-bottom: 15px;
        }

        .info-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #667eea;
        }

        .info-card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.3em;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            font-weight: 600;
            color: #495057;
        }

        .info-value {
            color: #667eea;
            font-weight: 500;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 25px 0;
            transition: transform 0.2s;
        }

        .footer {
            background: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
        }

        .footer p {
            margin-bottom: 10px;
        }

        @media (max-width: 600px) {
            .email-container {
                margin: 20px;
                border-radius: 8px;
            }

            .header, .content {
                padding: 25px 20px;
            }

            .header h1 {
                font-size: 2em;
            }

            .info-row {
                flex-direction: column;
                align-items: flex-start;
            }

            .info-value {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Welcome!</h1>
            <p>We're excited to have you join our team</p>
        </div>

        <div class="content">
            <p>Dear <strong>{{ $user->name }}</strong>,</p>

            <div class="welcome-message">
                <h2>🎉 Welcome to {{ config('app.name') }}!</h2>
                <p>Your account has been successfully created and you're now part of our amazing team.</p>
            </div>

            <p>We're thrilled to have you on board! You now have access to our platform with the following details:</p>

            <div class="info-card">
                <h3>📋 Your Account Details</h3>
                <div class="info-row">
                    <span class="info-label">Full Name: </span>
                    <span class="info-value">{{ $user->name }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Username (login): </span>
                    <span class="info-value">{{ $user->username }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email Address: </span>
                    <span class="info-value">{{ $user->email }}</span>
                </div>
                @if($employee && $employee->employee_id)
                <div class="info-row">
                    <span class="info-label">Employee ID: </span>
                    <span class="info-value">{{ $employee->employee_id }}</span>
                </div>
                @endif
                @if($roleNames)
                <div class="info-row">
                    <span class="info-label">Assigned Roles: </span>
                    <span class="info-value">{{ $roleNames }}</span>
                </div>
                @endif

                <div class="info-row">
                    <span class="info-label">Password: </span>
                    <span class="info-value">12345678</span>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="{{ $siteUrl }}" class="cta-button">
                    🚀 Access Your Account
                </a>
            </div>

            <p>If you have any questions or need assistance getting started, please don't hesitate to reach out to our support team.</p>

            <p>We look forward to working with you!</p>

            <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>{{ config('app.name') }} Team</strong>
            </p>
        </div>

        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
            <p>This email was sent from an automated system. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
