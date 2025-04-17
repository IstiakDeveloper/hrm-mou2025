<!DOCTYPE html>
<html>
<head>
    <title>Welcome to {{ config('app.name') }}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #f9f9f9;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            padding: 20px;
        }
        .header {
            background: #007bff;
            color: white;
            padding: 15px;
            text-align: center;
            border-radius: 5px 5px 0 0;
            margin: -20px -20px 20px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 14px;
            color: #777;
        }
        .button {
            display: inline-block;
            background: #007bff;
            color: white !important;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .info-box {
            background: #e9f7fe;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        table td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        table td:first-child {
            font-weight: bold;
            width: 40%;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Welcome to {{ config('app.name') }}</h2>
        </div>

        <p>Dear {{ $user->name }},</p>

        <p>Welcome to {{ config('app.name') }}! Your account has been created successfully. Below are your login details and important information:</p>

        <div class="info-box">
            <h3>Your Account Information</h3>
            <table>
                <tr>
                    <td>Full Name:</td>
                    <td>{{ $user->name }}</td>
                </tr>
                <tr>
                    <td>Email Address:</td>
                    <td>{{ $user->email }}</td>
                </tr>
                <tr>
                    <td>Role(s):</td>
                    <td>{{ $roleNames }}</td>
                </tr>
                <tr>
                    <td>Password:</td>
                    <td>{{ $password }} <small>(temporary)</small></td>
                </tr>
            </table>
        </div>

        <h3>Getting Started</h3>
        <p>Please follow these steps to access your account:</p>
        <ol>
            <li>Visit our site: <a href="{{ $siteUrl }}">{{ $siteUrl }}</a></li>
            <li>Enter your email address: {{ $user->email }}</li>
            <li>Enter the temporary password provided above</li>
            <li>After logging in, please change your password immediately</li>
        </ol>

        <p>To change your password, follow these steps:</p>
        <ol>
            <li>Click on your profile icon in the top right corner</li>
            <li>Select "Profile Settings" or "Account Settings"</li>
            <li>Navigate to the "Security" or "Password" section</li>
            <li>Enter your current password and then your new password</li>
            <li>Click "Save" or "Update Password"</li>
        </ol>

        <p><a href="{{ $siteUrl }}" class="button">Login to Your Account</a></p>

        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

        <p>Thank you for joining us!</p>

        <p>Best regards,<br>
        The {{ config('app.name') }} Team</p>

        <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
