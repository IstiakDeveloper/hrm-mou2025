export type Signatory = { employee_id: string; name: string; designation: string; organization: string };
export type AdviceEntry = { account_no: string; bank_name: string; bank_branch: string; pins: string[]; names: string[]; amount: number };
export type BankAdvice = {
    id: number;
    year: number;
    month: number;
    reference: string;
    reference_prefix: string;
    reference_year: string;
    reference_number: string;
    salary_month: string;
    issue_date: string;
    total: string;
    in_words: string;
    details: Record<string, string>;
    signatories: Signatory[];
    entries: AdviceEntry[];
    include_account_list: boolean;
};

export const adviceBase = '/payroll/reports/bank-advice';

export function adviceDate(value: string): string {
    return value.slice(0, 10).split('-').reverse().join('/');
}
