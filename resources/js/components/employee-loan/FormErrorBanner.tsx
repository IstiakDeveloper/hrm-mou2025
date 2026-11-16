import React from 'react';

export function FormErrorBanner({ errors }: { errors: Record<string, string | undefined> }) {
    const messages = Object.values(errors).filter((message): message is string => Boolean(message));

    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {messages.map((message) => (
                <p key={message}>{message}</p>
            ))}
        </div>
    );
}
