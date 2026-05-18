export type PayrollPostContext = 'bonus' | 'salary';

export function payrollPostRoutes(context: PayrollPostContext) {
    const prefix = context === 'bonus' ? 'bonus-post' : 'salary-post';

    return {
        index: () => route(`${prefix}.index`),
        show: (id: number) => route(`${prefix}.show`, id),
        updatePayslips: (id: number) => route(`${prefix}.update-payslips`, id),
        post: (id: number) => route(`${prefix}.post`, id),
    };
}

export function payrollPostLabels(context: PayrollPostContext) {
    if (context === 'bonus') {
        return {
            listTitle: 'Finalize bonus',
            reviewTitle: 'Review bonus',
            listDescription: 'Review calculated bonus, then post to lock the period.',
            reviewDescriptionSuffix: ' · Edit bonus amounts before finalize',
            backLabel: 'Back to bonus post',
            saveSuccess: 'Bonus amounts updated.',
            postSuccess: 'Bonus posted successfully. This period is now locked.',
            finalizeButton: 'Finalize bonus',
            postingButton: 'Posting bonus…',
            emptyPending: 'Nothing waiting to post. Run Bonus Calculation first, or clear filters if you already posted.',
            emptyPosted: 'No posted bonus for the current filters yet.',
            readySection: 'Ready to post',
            readyDescription: 'Calculated bonus waiting for finalization.',
            postedSection: 'Posted bonus',
        };
    }

    return {
        listTitle: 'Finalize payroll',
        reviewTitle: 'Review payroll',
        listDescription: 'Review calculated payroll, then post to lock the period. Posted runs stay listed below for viewing.',
        reviewDescriptionSuffix: ' · Edit component amounts before finalize',
        backLabel: 'Back',
        saveSuccess: 'Payslip amounts updated.',
        postSuccess: 'Salary posted successfully. This period is now locked.',
        finalizeButton: 'Finalize payroll',
        postingButton: 'Posting…',
        emptyPending: 'Nothing waiting to post. Run Salary Process first, or clear filters if you already posted.',
        emptyPosted: 'No posted payroll for the current filters yet.',
        readySection: 'Ready to post',
        readyDescription: 'Calculated payroll waiting for finalization.',
        postedSection: 'Posted payroll',
    };
}
