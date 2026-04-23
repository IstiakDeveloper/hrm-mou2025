<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $notice->title }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 24px; }
        h1 { font-size: 20px; margin: 0 0 16px; color: #111; }
        .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; }
        .btn { display: inline-block; margin-top: 16px; padding: 10px 18px; background: #16a34a; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .muted { color: #6b7280; font-size: 13px; margin-top: 24px; }
    </style>
</head>
<body>
    <p>Hello {{ $recipient->name }},</p>
    <h1>{{ $notice->title }}</h1>
    <div class="box">{{ $notice->message }}</div>
    @if(!empty($notice->link))
        <p><a class="btn" href="{{ $notice->link }}" target="_blank" rel="noopener noreferrer">Open link</a></p>
    @endif
    @if(!empty($notice->attachment_path))
        <p style="margin-top:16px;">
            A file is attached to this email
            @if(!empty($notice->attachment_original_name))
                ({{ $notice->attachment_original_name }})
            @endif
            .
        </p>
    @endif
    <p class="muted">This message was sent from {{ config('app.name') }}.</p>
</body>
</html>
