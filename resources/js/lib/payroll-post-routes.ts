export type PayrollPostContext = 'bonus' | 'salary';

export function payrollPostContextFromSalaryType(salaryType: string): PayrollPostContext | 'arrear' {
    const normalized = salaryType.toLowerCase();
    if (normalized === 'bonus') return 'bonus';
    if (normalized === 'arrear') return 'arrear';
    return 'salary';
}

export function payrollPostRoutes(context: PayrollPostContext) {
    const prefix = context === 'bonus' ? 'bonus-post' : 'salary-post';

    return {
        index: () => route(`${prefix}.index`),
        period: (year: number, month: number, status?: 'processed' | 'posted') =>
            route(`${prefix}.period`, { year, month, ...(status ? { status } : {}) }),
        finalizePeriod: (year: number, month: number) => route(`${prefix}.period.finalize`, { year, month }),
        cancelPeriod: (year: number, month: number) => route(`${prefix}.period.cancel`, { year, month }),
        show: (id: number) => route(`${prefix}.show`, id),
        updatePayslips: (id: number) => route(`${prefix}.update-payslips`, id),
        post: (id: number) => route(`${prefix}.post`, id),
        cancel: (id: number) => route(`${prefix}.cancel`, id),
    };
}

export function payrollPostLabels(context: PayrollPostContext) {
    if (context === 'bonus') {
        return {
            listTitle: 'Finalize bonus',
            reviewTitle: 'Review bonus',
            periodReviewTitle: 'Review bonus by period',
            listDescription: 'Review calculated bonus by period. Finalize only when amounts are confirmed.',
            reviewDescriptionSuffix: ' · Adjust amounts, then finalize to lock the period',
            backLabel: 'Back to bonus post',
            saveSuccess: 'Bonus amounts updated.',
            postSuccess: 'Bonus posted successfully. This period is now locked.',
            finalizeButton: 'Finalize bonus',
            finalizeAllButton: 'Finalize all branches',
            cancelPeriodButton: 'Cancel period',
            cancelBranchButton: 'Cancel branch',
            postingButton: 'Posting bonus…',
            finalizingAllButton: 'Finalizing all…',
            emptyPending: 'Nothing waiting to post. Run Bonus Calculation first, or clear filters if you already posted.',
            emptyPosted: 'No posted bonus for the current filters yet.',
            readySection: 'Ready to finalize',
            readyDescription: 'One row per period. Expand branches, review employees, then finalize.',
            postedSection: 'Posted bonus',
        };
    }

    return {
        listTitle: 'Finalize payroll',
        reviewTitle: 'Review payroll',
        periodReviewTitle: 'Review payroll by period',
        listDescription: 'Review calculated payroll by period. Finalize only when amounts are confirmed.',
        reviewDescriptionSuffix: ' · Adjust amounts, then finalize to lock the period',
        backLabel: 'Back',
        saveSuccess: 'Payslip amounts updated.',
        postSuccess: 'Salary posted successfully. This period is now locked.',
        finalizeButton: 'Finalize payroll',
        finalizeAllButton: 'Finalize all branches',
        cancelPeriodButton: 'Cancel period',
        cancelBranchButton: 'Cancel branch',
        postingButton: 'Posting…',
        finalizingAllButton: 'Finalizing all…',
        emptyPending: 'Nothing waiting to post. Run Salary Process first, or clear filters if you already posted.',
        emptyPosted: 'No posted payroll for the current filters yet.',
        readySection: 'Ready to finalize',
        readyDescription: 'One row per period. Expand branches, review employees, then finalize.',
        postedSection: 'Posted payroll',
    };
}
