<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message from {{ config('app.name') }}</title>
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
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
            color: #333;
            padding: 40px 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.2em;
            margin-bottom: 10px;
            color: #2c3e50;
        }

        .content {
            padding: 40px 30px;
        }

        .message-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 30px;
            margin: 30px 0;
            border-left: 4px solid #ff9a9e;
        }

        .message-box .message-content {
            font-size: 1.1em;
            line-height: 1.8;
            color: #2c3e50;
        }

        .signature {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-top: 30px;
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
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📧 Message from {{ config('app.name') }}</h1>
            <p>Important communication for {{ $user->name }}</p>
        </div>

        <div class="content">
            <p>Dear <strong>{{ $user->name }}</strong>,</p>

            <div class="message-box">
                <div class="message-content">
                    {!! nl2br(e($customMessage)) !!}
                </div>
            </div>

            <div class="signature">
                <p><strong>{{ config('app.name') }} Team</strong></p>
                <p style="font-size: 0.9em; opacity: 0.9;">Thank you for your attention to this message</p>
            </div>
        </div>

        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
            <p>This email was sent from an automated system.</p>
        </div>
    </div>
</body>
</html>
