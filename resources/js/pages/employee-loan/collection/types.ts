export type LoanOption = {
    id: number;
    loan_number: string;
    employee_id: number;
    employee_label: string;
    policy_name: string | null;
    outstanding_balance: number;
    installment_amount: number;
    pending_installments: number;
    disbursement_date: string | null;
};

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
