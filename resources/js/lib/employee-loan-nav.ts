import type { LucideIcon } from 'lucide-react';
import {
    Banknote,
    CheckCircle,
    HandCoins,
    History,
    List,
    Plus,
    Scale,
    Send,
    Users,
    Wallet,
} from 'lucide-react';

export const EMPLOYEE_LOAN_SECTION_ID = 'employee-loan' as const;

export type EmployeeLoanNavItem = {
    title: string;
    path: string;
    permission?: string;
    description?: string;
};

export type EmployeeLoanNavGroup = {
    id: 'setup' | 'process' | 'register' | 'collection';
    title: string;
    icon: LucideIcon;
    defaultPath: string;
    items: EmployeeLoanNavItem[];
};

/** Sidebar — three parents: Setup, Process, Register */
export const EMPLOYEE_LOAN_NAV_GROUPS: EmployeeLoanNavGroup[] = [
    {
        id: 'setup',
        title: 'Setup',
        icon: Scale,
        defaultPath: '/loan-policies',
        items: [
            { title: 'Loan Policies', path: '/loan-policies', description: 'Loan types, limits, rate & tenure' },
            { title: 'Loan Committee', path: '/loan-committees', description: 'Approval committee members' },
        ],
    },
    {
        id: 'process',
        title: 'Process',
        icon: Send,
        defaultPath: '/loan-applications',
        items: [
            { title: 'New Application', path: '/loan-applications/create', permission: 'payroll.create', description: 'Start a new loan request' },
            { title: 'Application List', path: '/loan-applications', description: 'All loan applications' },
            { title: 'Loan Approval', path: '/loan-approval', permission: 'payroll.edit', description: 'Approve or reject applications' },
            { title: 'Loan Disburse', path: '/loan-disburse', permission: 'payroll.create', description: 'Disburse approved applications → active loan' },
        ],
    },
    {
        id: 'register',
        title: 'Register',
        icon: HandCoins,
        defaultPath: '/employee-loans',
        items: [
            { title: 'Loan Register', path: '/employee-loans', description: 'Active loans, schedules & ledger' },
            { title: 'Loan Migration', path: '/loan-migration', permission: 'payroll.create', description: 'Bulk import pre-system loans at closing date' },
            { title: 'Loan Rollback', path: '/loan-rollback', permission: 'payroll.edit', description: 'Undo disbursement or migration before payroll deduction' },
            { title: 'Loan Transfer', path: '/loan-transfer', permission: 'payroll.edit', description: 'Transfer active loan from one employee to another' },
        ],
    },
    {
        id: 'collection',
        title: 'Collection',
        icon: Banknote,
        defaultPath: '/loan-collection',
        items: [
            { title: 'Collection List', path: '/loan-collection', description: 'All loan collections & batches' },
            { title: 'Single Collection', path: '/loan-collection/single', permission: 'payroll.edit', description: 'Collect one loan installment off-payroll' },
            { title: 'Batch Collection', path: '/loan-collection/batch', permission: 'payroll.edit', description: 'Collect multiple loans in one batch' },
            { title: 'Advance Collection', path: '/loan-collection/advance', permission: 'payroll.edit', description: 'Collect future installments in advance' },
            { title: 'Loan Waive', path: '/loan-collection/waive', permission: 'payroll.edit', description: 'Waive pending installments' },
            { title: 'Loan Rebate', path: '/loan-collection/rebate', permission: 'payroll.edit', description: 'Rebate / discount on outstanding balance' },
            { title: 'Collection Rollback', path: '/loan-collection/rollback', permission: 'payroll.edit', description: 'Undo collection, waive or rebate batch' },
        ],
    },
];

export type EmployeeLoanLayoutSection = {
    label: string;
    items: { id: string; label: string; href: string }[];
};

/** Horizontal tabs inside Employee Loan pages — grouped for clarity */
export const EMPLOYEE_LOAN_LAYOUT_SECTIONS: EmployeeLoanLayoutSection[] = [
    {
        label: 'Setup',
        items: [
            { id: 'policies', label: 'Policies', href: '/loan-policies' },
            { id: 'committees', label: 'Committee', href: '/loan-committees' },
        ],
    },
    {
        label: 'Workflow',
        items: [
            { id: 'applications', label: 'New Application', href: '/loan-applications/create' },
            { id: 'applications-list', label: 'Applications', href: '/loan-applications' },
            { id: 'approval', label: 'Approval', href: '/loan-approval' },
            { id: 'disburse', label: 'Disburse', href: '/loan-disburse' },
        ],
    },
    {
        label: 'Records',
        items: [
            { id: 'register', label: 'Loan Register', href: '/employee-loans' },
            { id: 'migration', label: 'Migration', href: '/loan-migration' },
            { id: 'rollback', label: 'Rollback', href: '/loan-rollback' },
            { id: 'transfer', label: 'Transfer', href: '/loan-transfer' },
        ],
    },
    {
        label: 'Collection',
        items: [
            { id: 'collection', label: 'List', href: '/loan-collection' },
            { id: 'collection-single', label: 'Single', href: '/loan-collection/single' },
            { id: 'collection-batch', label: 'Batch', href: '/loan-collection/batch' },
            { id: 'collection-advance', label: 'Advance', href: '/loan-collection/advance' },
            { id: 'collection-waive', label: 'Waive', href: '/loan-collection/waive' },
            { id: 'collection-rebate', label: 'Rebate', href: '/loan-collection/rebate' },
            { id: 'collection-rollback', label: 'Coll. Rollback', href: '/loan-collection/rollback' },
        ],
    },
];

export function employeeLoanPath(path: string): string {
    const [base, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('section', EMPLOYEE_LOAN_SECTION_ID);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

export const EMPLOYEE_LOAN_DASHBOARD_SHORTCUTS = {
    workflow: [
        { title: 'New Application', href: '/loan-applications/create', icon: Plus, step: '1' },
        { title: 'Loan Approval', href: '/loan-approval', icon: CheckCircle, step: '2' },
        { title: 'Loan Disburse', href: '/loan-disburse', icon: Wallet, step: '3' },
        { title: 'Loan Register', href: '/employee-loans', icon: List, step: '4' },
    ],
    setup: [
        { title: 'Loan Policies', href: '/loan-policies', icon: Scale },
        { title: 'Loan Committee', href: '/loan-committees', icon: Users },
    ],
    other: [{ title: 'Loan Migration', href: '/loan-migration', icon: History }],
} as const;

export const EMPLOYEE_LOAN_WORKFLOW_STEPS = [
    { step: 1, title: 'Application', description: 'Employee applies with policy & amount', path: '/loan-applications/create' },
    { step: 2, title: 'Approval', description: 'Committee / HR approves or rejects', path: '/loan-approval' },
    { step: 3, title: 'Disburse', description: 'Approved application becomes active loan', path: '/loan-disburse' },
    { step: 4, title: 'Payroll', description: 'Installments auto-deduct on salary post', path: '/employee-loans' },
] as const;
