export const DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE = 'savings';
export const DEFAULT_EMPLOYEE_BANK_BRANCH_NAME = 'Naogaon Sadar';
export const EMPLOYEE_BANK_ACCOUNT_TYPE_LABEL = 'Savings';

export type EmployeeBankFormFields = {
    bank_name: string;
    branch_name: string;
    account_no: string;
    account_type: string;
    bank_address: string;
    remark: string;
};

export function emptyEmployeeBankFormFields(): EmployeeBankFormFields {
    return {
        bank_name: '',
        branch_name: DEFAULT_EMPLOYEE_BANK_BRANCH_NAME,
        account_no: '',
        account_type: DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE,
        bank_address: '',
        remark: '',
    };
}

export function normalizeEmployeeBankFormFields(
    bank: Partial<EmployeeBankFormFields> | null | undefined,
): EmployeeBankFormFields {
    const base = bank ?? {};

    return {
        bank_name: base.bank_name ?? '',
        branch_name: DEFAULT_EMPLOYEE_BANK_BRANCH_NAME,
        account_no: base.account_no ?? '',
        account_type: DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE,
        bank_address: base.bank_address ?? '',
        remark: base.remark ?? '',
    };
}
