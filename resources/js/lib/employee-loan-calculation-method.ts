export const LEGACY_FLAT_PF_CUTOFF = '2025-01-01';

export function isLegacyFlatPfLoan(
    disbursementDate: string | null | undefined,
    policyLoanType: string | null | undefined,
): boolean {
    if (!disbursementDate || policyLoanType !== 'pf_loan') {
        return false;
    }

    return disbursementDate < LEGACY_FLAT_PF_CUTOFF;
}

export function isModernLoanDisbursement(disbursementDate: string | null | undefined): boolean {
    if (!disbursementDate) {
        return false;
    }

    return disbursementDate >= LEGACY_FLAT_PF_CUTOFF;
}

type CalculationMethodItem = { value: string; label: string };

export function calculationMethodItemsForLoan(
    disbursementDate: string | null | undefined,
    policyLoanType: string | null | undefined,
): CalculationMethodItem[] {
    if (isLegacyFlatPfLoan(disbursementDate, policyLoanType)) {
        return [{ value: 'flat', label: 'Flat (legacy)' }];
    }

    return [{ value: 'reducing', label: 'Reducing' }];
}

export function normalizeCalculationMethodForLoan(
    method: string | null | undefined,
    disbursementDate: string | null | undefined,
    policyLoanType: string | null | undefined,
): string | null {
    const trimmed = method?.trim() ?? '';

    if (isLegacyFlatPfLoan(disbursementDate, policyLoanType)) {
        return 'flat';
    }

    if (isModernLoanDisbursement(disbursementDate) && trimmed === 'flat') {
        return 'reducing';
    }

    return trimmed === 'reducing' || trimmed === 'flat' ? trimmed : null;
}
