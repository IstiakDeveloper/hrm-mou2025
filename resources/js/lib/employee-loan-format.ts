/** Employee loan amounts are whole numbers — no decimal places in display. */
import { formatTakaWhole, formatTakaWithSymbol } from '@/lib/taka-format';

export function fmtLoanAmount(n: number | string | null | undefined): string {
    return formatTakaWhole(n);
}

/** Amortized EMI — two decimal places for display only. */
export function fmtLoanEmiExact(n: number | string | null | undefined): string {
    return formatTakaWithSymbol(n, 2);
}

export function roundLoanAmount(n: number | string | null | undefined): number {
    const v = Math.round(Number(n ?? 0));
    return Number.isFinite(v) ? v : 0;
}

/** Fields used to identify a loan in select / combo labels. */
export type LoanSelectIdentity = {
    loan_number: string;
    loan_type_label?: string | null;
    policy_name?: string | null;
    policy_code?: string | null;
};

/**
 * Human-readable loan identity: type + policy code/name (not just LN-…).
 * e.g. "PF Loan · PFS-01" or "Motorcycle Loan · Staff M/C"
 */
export function loanSelectName(loan: LoanSelectIdentity): string {
    const type = (loan.loan_type_label ?? '').trim();
    const policy = (loan.policy_name ?? '').trim();
    const code = (loan.policy_code ?? '').trim();

    if (type && code) {
        return `${type} · ${code}`;
    }
    if (type && policy) {
        return `${type} · ${policy}`;
    }
    if (type) {
        return type;
    }
    if (code) {
        return code;
    }
    if (policy) {
        return policy;
    }

    return loan.loan_number;
}

type LoanSelectLabelLoan = LoanSelectIdentity & {
    status?: string | null;
    outstanding_balance?: number | null;
    pending_installments?: number | null;
    employee_label?: string | null;
    note?: string | null;
};

type LoanSelectLabelOptions = {
    includeEmployee?: boolean;
    includeStatus?: boolean;
    includeOutstanding?: boolean;
    includePending?: boolean;
};

/**
 * Dropdown label: type/code first, then loan number + optional status/balance.
 * e.g. "PF Loan · PFS-01 — LN-202606-0019 — active — out 67,162"
 */
export function formatLoanSelectLabel(loan: LoanSelectLabelLoan, options: LoanSelectLabelOptions = {}): string {
    const {
        includeEmployee = false,
        includeStatus = false,
        includeOutstanding = true,
        includePending = false,
    } = options;

    const parts: string[] = [];

    if (includeEmployee && loan.employee_label) {
        parts.push(loan.employee_label);
    }

    const name = loanSelectName(loan);
    parts.push(name);

    if (name !== loan.loan_number && loan.loan_number) {
        parts.push(loan.loan_number);
    }

    if (loan.note) {
        parts.push(loan.note);
    } else {
        if (includeStatus && loan.status) {
            parts.push(loan.status);
        }
        if (includeOutstanding && loan.outstanding_balance != null) {
            parts.push(`out ${fmtLoanAmount(loan.outstanding_balance)}`);
        }
        if (includePending && loan.pending_installments != null) {
            parts.push(`${loan.pending_installments} pending`);
        }
    }

    return parts.join(' — ');
}

export function loanSelectKeywords(loan: LoanSelectIdentity & { employee_label?: string | null; status?: string | null }): string {
    return [
        loan.loan_number,
        loan.loan_type_label,
        loan.policy_name,
        loan.policy_code,
        loan.employee_label,
        loan.status,
    ]
        .filter(Boolean)
        .join(' ');
}
