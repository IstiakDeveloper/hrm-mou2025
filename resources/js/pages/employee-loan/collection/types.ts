export type LoanOption = {
    id: number;
    loan_number: string;
    employee_id: number;
    employee_label: string;
    loan_type_label?: string | null;
    policy_name: string | null;
    policy_code?: string | null;
    outstanding_balance: number;
    installment_amount: number;
    pending_installments: number;
    pending_installment_amounts?: number[];
    disbursement_date: string | null;
};

/** Effective cash collection after rebates / balance adjustments. */
export function estimateInstallmentCollectionAmount(loan: LoanOption, installmentCount: number): number {
    const count = Math.max(1, installmentCount);
    const amounts = (loan.pending_installment_amounts?.length
        ? loan.pending_installment_amounts
        : Array.from({ length: Math.min(count, loan.pending_installments) }, () => loan.installment_amount)
    ).slice(0, count);

    let remaining = loan.outstanding_balance;
    let total = 0;

    for (const scheduled of amounts) {
        if (remaining <= 0) {
            break;
        }
        const due = Math.min(scheduled, remaining);
        total += due;
        remaining -= due;
    }

    return Math.round(total * 100) / 100;
}

export type BatchSummary = {
    id: number;
    batch_number: string;
    collection_type: string;
    collection_type_label: string;
    collection_date: string | null;
    reference_no: string | null;
    item_count: number;
    total_amount: number;
    created_by: string | null;
    created_at: string | null;
    is_rolled_back: boolean;
    can_rollback: boolean;
};

export { fmtLoanAmount as fmt } from '@/lib/employee-loan-format';
