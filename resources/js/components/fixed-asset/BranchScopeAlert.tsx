import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function BranchScopeAlert({ branchScoped }: { branchScoped?: boolean }) {
    if (!branchScoped) {
        return null;
    }

    return (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertTitle>Branch limit</AlertTitle>
            <AlertDescription>You only see data for your branch.</AlertDescription>
        </Alert>
    );
}
