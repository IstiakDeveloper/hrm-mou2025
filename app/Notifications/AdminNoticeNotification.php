<?php

namespace App\Notifications;

use App\Models\AdminNotice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Storage;

class AdminNoticeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public AdminNotice $notice,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        $email = $notifiable->email ?? null;
        if (is_string($email) && $email !== '') {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->notice->title)
            ->view('emails.admin-notice', [
                'notice' => $this->notice,
                'recipient' => $notifiable,
            ]);

        if ($this->notice->attachment_path) {
            $absolute = Storage::disk('public')->path($this->notice->attachment_path);
            if (is_file($absolute)) {
                $mail->attach($absolute, [
                    'as' => $this->notice->attachment_original_name ?: basename($this->notice->attachment_path),
                ]);
            }
        }

        return $mail;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $attachmentUrl = null;
        if ($this->notice->attachment_path) {
            $attachmentUrl = Storage::disk('public')->url($this->notice->attachment_path);
        }

        return [
            'admin_notice_id' => $this->notice->id,
            'title' => $this->notice->title,
            'message' => $this->notice->message,
            'type' => $this->notice->type,
            'link' => $this->notice->link,
            'attachment_url' => $attachmentUrl,
            'attachment_name' => $this->notice->attachment_original_name,
        ];
    }
}
