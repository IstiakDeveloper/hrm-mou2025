import React from 'react';
import { Link } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BulkEmailButton: React.FC = () => {
    return (
        <Link href={route('admin.users.bulk-email.form')} className="w-full sm:w-auto">
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
                <Mail className="mr-1.5 h-4 w-4" />
                Bulk email
            </Button>
        </Link>
    );
};

export default BulkEmailButton;
