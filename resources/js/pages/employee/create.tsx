import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import {
    EmployeeSalaryAssignment,
    buildSalaryLinesJson,
    type PayrollGradeOption,
    type PayrollPayscaleOption,
    type PayrollStepOption,
    type SalaryComponentRow,
} from '@/components/employee/EmployeeSalaryAssignment';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/layouts/AdminLayout';
import { csrfJsonPost, csrfJsonPostErrorMessage } from '@/lib/csrf';
import { SERVER_DATE_FMT, toServerYmdDate } from '@/lib/display-date';
import {
    DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE,
    DEFAULT_EMPLOYEE_BANK_BRANCH_NAME,
    EMPLOYEE_BANK_ACCOUNT_TYPE_LABEL,
    emptyEmployeeBankFormFields,
} from '@/lib/employee-bank-defaults';
import {
    emptyChequeFormRow,
    emptyGuarantorFormRow,
    emptyNomineeFormRow,
    type ChequeFormRow,
    type GuarantorFormRow,
    type NomineeFormRow,
} from '@/lib/employee-nominee-guarantor-form';
import {
    EMPLOYEE_V2_CREATE_DRAFT_KEY,
    applyUnifiedNidSmartFields,
    asInputPatch,
    clearEmployeeDraft,
    formatEmployeeDocumentTypeLabel,
    getNidOrSmartCardClientError,
    hasPatchKeys,
    hydrateEmployeeDocumentRowsForForm,
    loadEmployeeDraft,
    mergeSerializableIntoForm,
    newEmployeeDocumentFormRow,
    saveEmployeeDraft,
    toSerializableEmployeeForm,
    type EmployeeDocumentFormRow,
} from '@/lib/employee-v2-form-persist';
import { useLocationCascade, type LocationUnion } from '@/lib/location-cascade';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowLeft,
    Award,
    Briefcase,
    Building2,
    Check,
    DollarSign,
    FileText,
    GraduationCap,
    Package,
    Plus,
    RotateCcw,
    Shield,
    ShieldCheck,
    Sparkles,
    Trash2,
    Upload,
    User,
    Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function SignatureDemoGraphic({ className }: { className?: string }) {
    return (
        <svg
            className={cn('pointer-events-none text-zinc-300', className)}
            viewBox="0 0 200 80"
            fill="none"
            aria-hidden
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        >
            <path d="M20 50 Q40 20 60 50 T100 50 T140 30 T180 40" />
            <path d="M50 45 Q90 30 130 45" />
        </svg>
    );
}

interface Address {
    type: 'present' | 'permanent';
    division: string;
    district: string;
    upazila: string;
    union: string;
    village: string;
    address_details: string;
}

interface Education {
    degree: string;
    institute: string;
    board: string;
    group_name: string;
    subject: string;
    result_type: 'gpa' | 'cgpa' | 'other' | '';
    result_value: string;
}

type Nominee = NomineeFormRow;
type Guarantor = GuarantorFormRow;
type Cheque = ChequeFormRow;

interface Asset {
    serial_no: string;
    asset_no: string;
    asset_name: string;
    provided_qty: string | number;
    asset_price: string | number;
    asset_details: string;
}

interface Experience {
    organization: string;
    from_date: string;
    to_date: string;
    designation: string;
    department: string;
    responsibility: string;
}

interface Training {
    training_title: string;
    institute: string;
    duration: string;
    address: string;
    remarks: string;
}

interface EmployeeCreateFormData {
    current_branch_id: string;
    employee_type_id: string;
    pin: string;
    name_en: string;
    name_bn: string;
    gender: string;
    religion: string;
    marital_status: string;
    spouse_name: string;
    spouse_mobile: string;
    date_of_birth: string;
    blood_group: string;
    joining_date: string;
    confirmation_date: string;
    fathers_name: string;
    fathers_mobile: string;
    mothers_name: string;
    mothers_mobile: string;
    department_id: string;
    joining_designation_id: string;
    last_designation_id: string;
    program_id: string;
    project_id: string;
    payscale_id: string;
    salary_grade_id: string;
    salary_step_id: string;
    basic_salary: string;
    salary_lines_json: string;
    nid: string;
    nid_number: string;
    smart_card_number: string;
    tin_certificate_no: string;
    driving_license_no: string;
    passport_no: string;
    is_project_employee: boolean;
    is_custodian: boolean;
    identification_mark: string;
    email: string;
    mobile_personal: string;
    mobile_official: string;
    photo: File | null;
    signature: File | null;
    addresses: [Address, Address];
    educations: Education[];
    bank: {
        bank_name: string;
        branch_name: string;
        account_no: string;
        account_type: string;
        bank_address: string;
        remark: string;
    };
    nominees: Nominee[];
    guarantors: Guarantor[];
    guarantor_cheques: Cheque[];
    collateral: {
        has_certificate: boolean;
        certificate_levels: string[];
        security_amount: string;
        collateral_interest: string;
        collateral_date: string;
        notes: string;
    };
    collateral_receive_cheques: Cheque[];
    assets: Asset[];
    experiences: Experience[];
    trainings: Training[];
    documents: EmployeeDocumentFormRow[];
}

const safeParseCertificateLevels = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return raw.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};

function emptyFormAddress(type: 'present' | 'permanent'): Address {
    return { type, division: '', district: '', upazila: '', union: '', village: '', address_details: '' };
}

function normalizeEmployeeFormAddresses(raw: unknown): [Address, Address] {
    const list = Array.isArray(raw) ? raw : [];
    const pick = (type: 'present' | 'permanent'): Address => {
        const found = list.find((a) => (a as Address)?.type === type) as Partial<Address> | undefined;
        if (!found) return emptyFormAddress(type);
        return {
            type,
            division: found.division ?? '',
            district: found.district ?? '',
            upazila: found.upazila ?? '',
            union: found.union ?? '',
            village: found.village ?? '',
            address_details: found.address_details ?? '',
        };
    };
    return [pick('present'), pick('permanent')];
}

function buildAddressDetails(a: Address): string {
    const parts = [a.village, a.union, a.upazila, a.district, a.division].filter((s) => s?.trim());
    return parts.length > 0 ? parts.join(', ') : '';
}

function getCreateFormDefaults(): EmployeeCreateFormData {
    return {
        current_branch_id: '',
        employee_type_id: '',
        pin: '',
        name_en: '',
        name_bn: '',
        gender: '',
        religion: '',
        marital_status: '',
        spouse_name: '',
        spouse_mobile: '',
        date_of_birth: '',
        blood_group: '',
        joining_date: format(new Date(), SERVER_DATE_FMT),
        confirmation_date: '',
        fathers_name: '',
        fathers_mobile: '',
        mothers_name: '',
        mothers_mobile: '',
        department_id: '',
        joining_designation_id: '',
        last_designation_id: '',
        program_id: '',
        project_id: '',
        payscale_id: '',
        salary_grade_id: '',
        salary_step_id: '',
        basic_salary: '',
        salary_lines_json: '',
        nid: '',
        nid_number: '',
        smart_card_number: '',
        tin_certificate_no: '',
        driving_license_no: '',
        passport_no: '',
        is_project_employee: false,
        is_custodian: false,
        identification_mark: '',
        email: '',
        mobile_personal: '',
        mobile_official: '',
        photo: null,
        signature: null,
        addresses: [emptyFormAddress('present'), emptyFormAddress('permanent')],
        educations: [],
        bank: emptyEmployeeBankFormFields(),
        nominees: [],
        guarantors: [],
        guarantor_cheques: [],
        collateral: { has_certificate: false, certificate_levels: [], security_amount: '', collateral_interest: '', collateral_date: '', notes: '' },
        collateral_receive_cheques: [],
        assets: [],
        experiences: [],
        trainings: [],
        documents: [],
    };
}

function withHydratedDocuments(form: EmployeeCreateFormData): EmployeeCreateFormData {
    return { ...form, documents: hydrateEmployeeDocumentRowsForForm(form.documents ?? []) };
}

function normalizeFormDates(form: EmployeeCreateFormData): EmployeeCreateFormData {
    const out = { ...form };
    out.date_of_birth = toServerYmdDate(form.date_of_birth);
    out.joining_date = toServerYmdDate(form.joining_date) || format(new Date(), SERVER_DATE_FMT);
    out.confirmation_date = toServerYmdDate(form.confirmation_date);
    out.nominees = (form.nominees ?? []).map((n) => ({ ...n, date_of_birth: toServerYmdDate(n.date_of_birth) }));
    out.collateral = { ...(form.collateral ?? {}), collateral_date: toServerYmdDate(form.collateral?.collateral_date) };
    out.experiences = (form.experiences ?? []).map((ex) => ({
        ...ex,
        from_date: toServerYmdDate(ex.from_date),
        to_date: toServerYmdDate(ex.to_date),
    }));
    out.documents = (form.documents ?? []).map((doc) => ({ ...doc, expiry_date: toServerYmdDate(doc.expiry_date) }));
    return out;
}

function buildInitialCreateForm(oldInput: unknown): EmployeeCreateFormData {
    const defaults = getCreateFormDefaults();
    const fromServer = asInputPatch(oldInput);
    if (hasPatchKeys(fromServer)) {
        return withHydratedDocuments(
            normalizeFormDates(
                applyUnifiedNidSmartFields(
                    mergeSerializableIntoForm(defaults, fromServer) as unknown as Record<string, unknown>,
                ) as EmployeeCreateFormData,
            ),
        );
    }
    const fromDraft = loadEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY);
    if (fromDraft) {
        return withHydratedDocuments(
            normalizeFormDates(
                applyUnifiedNidSmartFields(
                    mergeSerializableIntoForm(defaults, fromDraft as Record<string, unknown>) as unknown as Record<string, unknown>,
                ) as EmployeeCreateFormData,
            ),
        );
    }
    return withHydratedDocuments(applyUnifiedNidSmartFields(defaults as unknown as Record<string, unknown>) as EmployeeCreateFormData);
}

function flattenEmployeeFormErrors(err: Record<string, string | undefined>): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(err)) {
        if (!v || k === 'submit') continue;
        out.push(v);
    }
    return out;
}

const EMPLOYEE_CREATE_TAB_ORDER = [
    'general',
    'education',
    'salary',
    'bank',
    'nominee',
    'guarantor',
    'collateral',
    'asset',
    'experience',
    'training',
    'documents',
] as const;

type EmployeeCreateTabId = (typeof EMPLOYEE_CREATE_TAB_ORDER)[number];

function isEmployeeCreateTabId(v: string): v is EmployeeCreateTabId {
    return (EMPLOYEE_CREATE_TAB_ORDER as readonly string[]).includes(v);
}

function formatProbationPeriodFromDates(joiningDate: string, confirmationDate: string): string {
    const join = joiningDate?.trim();
    const confirm = confirmationDate?.trim();
    if (!join || !confirm) return '';
    const start = new Date(`${join}T00:00:00`);
    const end = new Date(`${confirm}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
    if (end < start) return 'Invalid (confirmation before joining)';
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays === 0) return '0 days';
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) months -= 1;
    if (months > 0) return `${months} month${months === 1 ? '' : 's'} (${totalDays} days)`;
    return `${totalDays} day${totalDays === 1 ? '' : 's'}`;
}

function validateEmployeeCreateTab(tab: EmployeeCreateTabId, data: EmployeeCreateFormData, isSpouseRequired: boolean): string[] {
    const msg: string[] = [];
    switch (tab) {
        case 'general': {
            if (!String(data.current_branch_id ?? '').trim()) msg.push('Branch is required.');
            if (!String(data.employee_type_id ?? '').trim()) msg.push('Employment type is required.');
            if (!String(data.pin ?? '').trim()) msg.push('Employee PIN is required.');
            if (!String(data.name_en ?? '').trim()) msg.push('Employee name (English) is required.');
            if (!String(data.joining_date ?? '').trim()) msg.push('Joining date is required.');
            if (!String(data.department_id ?? '').trim()) msg.push('Department is required.');
            if (!String(data.joining_designation_id ?? '').trim()) msg.push('Designation is required.');
            if (!String(data.mobile_personal ?? '').trim()) msg.push('Personal mobile number is required.');
            if (isSpouseRequired) {
                if (!String(data.spouse_name ?? '').trim()) msg.push('Spouse name is required.');
                if (!String(data.spouse_mobile ?? '').trim()) msg.push('Spouse contact is required.');
            }
            break;
        }
        case 'education': {
            data.educations.forEach((ed, i) => {
                if (!String(ed.degree ?? '').trim()) msg.push(`Education row ${i + 1}: Degree is required.`);
            });
            break;
        }
        case 'nominee': {
            data.nominees.forEach((n, i) => {
                if (!String(n.name ?? '').trim()) msg.push(`Nominee ${i + 1}: Name is required.`);
            });
            break;
        }
        case 'guarantor': {
            data.guarantors.forEach((g, i) => {
                if (!String(g.name ?? '').trim()) msg.push(`Guarantor ${i + 1}: Name is required.`);
            });
            break;
        }
        case 'collateral': {
            const levels = data.collateral?.certificate_levels;
            if (data.collateral?.has_certificate && (!Array.isArray(levels) || levels.length === 0)) {
                msg.push('Select at least one Certificate level (SSC, HSC, etc.).');
            }
            break;
        }
        case 'asset': {
            data.assets.forEach((a, i) => {
                if (!String(a.name_en ?? a.asset_name ?? '').trim()) msg.push(`Asset ${i + 1}: Name is required.`);
            });
            break;
        }
        case 'experience': {
            data.experiences.forEach((ex, i) => {
                if (!String(ex.organization ?? '').trim()) msg.push(`Experience ${i + 1}: Organization is required.`);
            });
            break;
        }
        case 'training': {
            data.trainings.forEach((t, i) => {
                if (!String(t.training_title ?? '').trim()) msg.push(`Training ${i + 1}: Title is required.`);
            });
            break;
        }
        default:
            break;
    }
    return msg;
}

function errorFieldKeyToEmployeeCreateTab(key: string): EmployeeCreateTabId {
    if (['payscale_id', 'salary_grade_id', 'salary_step_id', 'basic_salary'].includes(key)) return 'salary';
    if (key.startsWith('educations')) return 'education';
    if (key.startsWith('bank')) return 'bank';
    if (key.startsWith('nominees')) return 'nominee';
    if (key.startsWith('guarantors') || key.startsWith('guarantor_cheques')) return 'guarantor';
    if (key.startsWith('collateral')) return 'collateral';
    if (key.startsWith('assets')) return 'asset';
    if (key.startsWith('experiences')) return 'experience';
    if (key.startsWith('trainings')) return 'training';
    if (key.startsWith('documents')) return 'documents';
    return 'general';
}

function inferFirstTabFromEmployeeErrors(err: Record<string, string | undefined>): EmployeeCreateTabId | null {
    const keys = Object.keys(err).filter((k) => err[k] && k !== 'submit');
    if (keys.length === 0) return null;
    let best: EmployeeCreateTabId | null = null;
    let bestIdx = Infinity;
    for (const k of keys) {
        const tab = errorFieldKeyToEmployeeCreateTab(k);
        const idx = EMPLOYEE_CREATE_TAB_ORDER.indexOf(tab);
        if (idx >= 0 && idx < bestIdx) {
            bestIdx = idx;
            best = tab;
        }
    }
    return best;
}

const FormField = ({
    label,
    required,
    error,
    children,
    className,
}: {
    label?: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn('space-y-1.5', className)}>
        {label && (
            <Label className="flex items-center gap-0.5 text-xs font-semibold text-zinc-700">
                {label} {required && <span className="font-bold text-emerald-600">*</span>}
            </Label>
        )}
        {children}
        {error && (
            <p className="animate-slide-in mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
            </p>
        )}
    </div>
);

const SectionHeading = ({ children, desc }: { children: string; desc?: string }) => (
    <div className="mb-5 border-b border-zinc-100 pb-3">
        <h3 className="text-sm font-bold tracking-tight text-zinc-900">{children}</h3>
        {desc && <p className="mt-0.5 text-xs text-zinc-400">{desc}</p>}
    </div>
);

interface Department {
    id: number;
    name: string;
}
interface Designation {
    id: number;
    name: string;
}
interface Branch {
    id: number;
    name: string;
    branch_code?: string;
}
interface Employee {
    id: number;
    name: string;
}

interface EmployeeCreateProps {
    departments: Department[];
    designations: Designation[];
    branches: Branch[];
    statuses: string[];
    employeeTypes: { id: number; name: string; probation_months: number }[];
    programs: { id: number; name: string; type: 'core' | 'project' }[];
    projects: { id: number; name: string }[];
    banks: string[];
    relations: string[];
    educationBoards: string[];
    educationDegrees: string[];
    educationGroups: string[];
    locations: any;
    defaultBankName: string;
    documentTypes: string[];
    payscales: PayrollPayscaleOption[];
    payrollGrades: PayrollGradeOption[];
    payrollSteps: PayrollStepOption[];
    activePayscaleId?: number | null;
    oldInput?: Record<string, unknown>;
    errors?: Record<string, string>;
}

export default function EmployeeCreate({
    departments,
    designations,
    branches,
    employeeTypes,
    programs,
    projects,
    banks,
    relations,
    educationBoards,
    educationDegrees = [],
    educationGroups = [],
    locations,
    defaultBankName,
    documentTypes = [],
    payscales = [],
    payrollGrades = [],
    payrollSteps = [],
    activePayscaleId = null,
    oldInput,
    errors: errorsProp = {},
}: EmployeeCreateProps) {
    const initialForm = useMemo(() => buildInitialCreateForm(oldInput), [oldInput]);
    const { data, setData, post, processing, errors: formErrors } = useForm(initialForm);

    const errors = { ...errorsProp, ...formErrors } as Record<string, string | undefined>;
    const submitError = errors['submit'];
    const serverFieldErrors = useMemo(() => flattenEmployeeFormErrors(errors), [errors]);
    const nidOrSmartClientError = useMemo(() => getNidOrSmartCardClientError(data.nid), [data.nid]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            saveEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY, toSerializableEmployeeForm(data as any));
        }, 450);
        return () => window.clearTimeout(handle);
    }, [data]);

    const [activeTab, setActiveTab] = useState<string>('general');
    const [tabStepBlockMessages, setTabStepBlockMessages] = useState<string[] | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const photoFileInputRef = useRef<HTMLInputElement>(null);
    const signatureFileInputRef = useRef<HTMLInputElement>(null);

    const applyPhotoFile = useCallback(
        (file: File | null) => {
            if (!file || !file.type.startsWith('image/')) return;
            setData('photo', file);
            const reader = new FileReader();
            reader.onload = (ev) => setPhotoPreview((ev.target?.result as string) ?? null);
            reader.readAsDataURL(file);
        },
        [setData],
    );

    const applySignatureFile = useCallback(
        (file: File | null) => {
            if (!file || !file.type.startsWith('image/')) return;
            setData('signature', file);
            const reader = new FileReader();
            reader.onload = (ev) => setSignaturePreview((ev.target?.result as string) ?? null);
            reader.readAsDataURL(file);
        },
        [setData],
    );

    const clearPhotoUpload = useCallback(() => {
        setData('photo', null);
        setPhotoPreview(null);
        if (photoFileInputRef.current) photoFileInputRef.current.value = '';
    }, [setData]);

    const clearSignatureUpload = useCallback(() => {
        setData('signature', null);
        setSignaturePreview(null);
        if (signatureFileInputRef.current) signatureFileInputRef.current.value = '';
    }, [setData]);

    const [addVillageModal, setAddVillageModal] = useState<{
        open: boolean;
        target: 'present' | 'permanent';
        name: string;
        error: string;
        saving: boolean;
    }>({ open: false, target: 'present', name: '', error: '', saving: false });
    const [salaryAdditionRows, setSalaryAdditionRows] = useState<SalaryComponentRow[]>([]);
    const [salaryDeductionRows, setSalaryDeductionRows] = useState<SalaryComponentRow[]>([]);
    const [salaryComponentsEditing, setSalaryComponentsEditing] = useState(false);

    useEffect(() => {
        setData('salary_lines_json', buildSalaryLinesJson(salaryAdditionRows, salaryDeductionRows));
    }, [salaryAdditionRows, salaryDeductionRows, setData]);
    const [addUnionModal, setAddUnionModal] = useState<{
        open: boolean;
        target: 'present' | 'permanent';
        name: string;
        error: string;
        saving: boolean;
    }>({ open: false, target: 'present', name: '', error: '', saving: false });
    const blockMainSubmitRef = useRef(false);

    const beginLocationSave = () => {
        blockMainSubmitRef.current = true;
    };

    const endLocationSave = () => {
        window.setTimeout(() => {
            blockMainSubmitRef.current = false;
        }, 600);
    };

    useEffect(() => {
        setData('bank', {
            ...data.bank,
            bank_name: data.bank?.bank_name || defaultBankName,
            branch_name: DEFAULT_EMPLOYEE_BANK_BRANCH_NAME,
            account_type: DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE,
        });
        if (documentTypes.length > 0 && data.documents.length === 0) {
            setData(
                'documents',
                documentTypes.map((type) => newEmployeeDocumentFormRow(type)),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const branchItems: ComboSelectItem<string>[] = useMemo(() => branchComboSelectItems(branches), [branches]);
    const deptItems: ComboSelectItem<string>[] = departments.map((d) => ({ value: String(d.id), label: d.name }));
    const desigItems: ComboSelectItem<string>[] = designations.map((d) => ({ value: String(d.id), label: d.name }));
    const employeeTypeItems: ComboSelectItem<string>[] = employeeTypes.map((t) => ({ value: String(t.id), label: t.name }));
    const programItems: ComboSelectItem<string>[] = programs.map((p) => ({ value: String(p.id), label: p.name }));
    const projectItems: ComboSelectItem<string>[] = projects.map((p) => ({ value: String(p.id), label: p.name }));

    const locationCascade = useLocationCascade();
    const presentDistrict = data.addresses[0]?.district ?? '';
    const presentUpazila = data.addresses[0]?.upazila ?? '';
    const permanentDistrict = data.addresses[1]?.district ?? '';
    const permanentUpazila = data.addresses[1]?.upazila ?? '';

    useEffect(() => {
        if (presentDistrict.trim()) {
            void locationCascade.loadUpazilas(presentDistrict);
        }
    }, [presentDistrict, locationCascade.loadUpazilas]);

    useEffect(() => {
        if (presentUpazila.trim()) {
            void locationCascade.loadUnions(presentUpazila);
        }
    }, [presentUpazila, locationCascade.loadUnions]);

    useEffect(() => {
        if (permanentDistrict.trim()) {
            void locationCascade.loadUpazilas(permanentDistrict);
        }
    }, [permanentDistrict, locationCascade.loadUpazilas]);

    useEffect(() => {
        if (permanentUpazila.trim()) {
            void locationCascade.loadUnions(permanentUpazila);
        }
    }, [permanentUpazila, locationCascade.loadUnions]);

    const divisionItems: ComboSelectItem<string>[] = (locations?.divisions ?? []).map((d: string) => ({ value: d, label: d }));
    const districtItems: ComboSelectItem<string>[] = ((locations?.districts?.[data.addresses[0]?.division] ?? []) as string[]).map((d) => ({
        value: d,
        label: d,
    }));
    const upazilaItems: ComboSelectItem<string>[] = (locationCascade.upazilas[presentDistrict] ?? []).map((u) => ({ value: u, label: u }));
    const [extraVillages, setExtraVillages] = useState<Record<string, string[]>>({});
    const [extraUnions, setExtraUnions] = useState<Record<string, LocationUnion[]>>({});

    const presentUnions = useMemo(() => locationCascade.unions[presentUpazila] ?? [], [locationCascade.unions, presentUpazila]);
    const presentUnionItems: ComboSelectItem<string>[] = useMemo(() => {
        const key = `p:${data.addresses[0]?.upazila || ''}`;
        const extra = extraUnions[key] ?? [];
        const merged = [...presentUnions];
        for (const u of extra) {
            if (!merged.some((m) => m.name === u.name)) merged.push(u);
        }
        return merged.map((u) => ({ value: u.name, label: u.name }));
    }, [presentUnions, extraUnions, data.addresses]);
    const presentSelectedUnion = useMemo(
        () => presentUnions.find((u) => u.name === data.addresses[0]?.union) ?? null,
        [data.addresses, presentUnions],
    );
    const presentVillageItems: ComboSelectItem<string>[] = useMemo(() => {
        const base = presentSelectedUnion?.villages ?? [];
        const key = `p:${data.addresses[0]?.upazila || ''}:${data.addresses[0]?.union || ''}`;
        return Array.from(new Set([...base, ...(extraVillages[key] ?? [])])).map((v) => ({ value: v, label: v }));
    }, [presentSelectedUnion, extraVillages, data.addresses]);

    const permDistrictItems: ComboSelectItem<string>[] = ((locations?.districts?.[data.addresses[1]?.division] ?? []) as string[]).map((d) => ({
        value: d,
        label: d,
    }));
    const permUpazilaItems: ComboSelectItem<string>[] = (locationCascade.upazilas[permanentDistrict] ?? []).map((u) => ({ value: u, label: u }));
    const permUnions = useMemo(() => locationCascade.unions[permanentUpazila] ?? [], [locationCascade.unions, permanentUpazila]);
    const permUnionItems: ComboSelectItem<string>[] = useMemo(() => {
        const key = `r:${data.addresses[1]?.upazila || ''}`;
        const extra = extraUnions[key] ?? [];
        const merged = [...permUnions];
        for (const u of extra) {
            if (!merged.some((m) => m.name === u.name)) merged.push(u);
        }
        return merged.map((u) => ({ value: u.name, label: u.name }));
    }, [permUnions, extraUnions, data.addresses]);
    const permSelectedUnion = useMemo(() => permUnions.find((u) => u.name === data.addresses[1]?.union) ?? null, [data.addresses, permUnions]);
    const permVillageItems: ComboSelectItem<string>[] = useMemo(() => {
        const base = permSelectedUnion?.villages ?? [];
        const key = `r:${data.addresses[1]?.upazila || ''}:${data.addresses[1]?.union || ''}`;
        return Array.from(new Set([...base, ...(extraVillages[key] ?? [])])).map((v) => ({ value: v, label: v }));
    }, [permSelectedUnion, extraVillages, data.addresses]);

    const isSpouseRequired = ['Married', 'Widowed', 'Separated'].includes(data.marital_status);

    const setOpeningDesignation = useCallback(
        (value: string) => {
            setData((prev) => ({ ...prev, joining_designation_id: value, last_designation_id: value }));
        },
        [setData],
    );

    const setLastDesignation = useCallback(
        (value: string) => {
            setData((prev) => {
                if (!prev.joining_designation_id) {
                    return { ...prev, joining_designation_id: value, last_designation_id: value };
                }
                return { ...prev, last_designation_id: value };
            });
        },
        [setData],
    );

    const requestTabChange = useCallback(
        (nextTab: string) => {
            if (!isEmployeeCreateTabId(nextTab)) return;
            const spouseRequired = ['Married', 'Widowed', 'Separated'].includes(data.marital_status);
            const curIdx = Math.max(0, EMPLOYEE_CREATE_TAB_ORDER.indexOf(activeTab as EmployeeCreateTabId));
            const nextIdx = EMPLOYEE_CREATE_TAB_ORDER.indexOf(nextTab);
            if (nextIdx === -1) return;
            if (nextIdx <= curIdx) {
                setActiveTab(nextTab);
                setTabStepBlockMessages(null);
                return;
            }
            for (let i = curIdx; i < nextIdx; i++) {
                const t = EMPLOYEE_CREATE_TAB_ORDER[i];
                const problems = validateEmployeeCreateTab(t, data, spouseRequired);
                if (problems.length > 0) {
                    setActiveTab(t);
                    setTabStepBlockMessages(problems);
                    return;
                }
            }
            setActiveTab(nextTab);
            setTabStepBlockMessages(null);
        },
        [activeTab, data],
    );

    useEffect(() => {
        if (!tabStepBlockMessages?.length) return;
        const spouseRequired = ['Married', 'Widowed', 'Separated'].includes(data.marital_status);
        const still = validateEmployeeCreateTab(activeTab as EmployeeCreateTabId, data, spouseRequired);
        if (still.length === 0) setTabStepBlockMessages(null);
    }, [data, activeTab, tabStepBlockMessages]);

    const selectedEmployeeType = useMemo(() => {
        const id = Number(data.employee_type_id || 0);
        return employeeTypes.find((t) => t.id === id) ?? null;
    }, [data.employee_type_id, employeeTypes]);

    const derivedProbationLabel = useMemo(() => {
        const fromDates = formatProbationPeriodFromDates(data.joining_date, data.confirmation_date);
        if (fromDates) return fromDates;
        const months = selectedEmployeeType?.probation_months ?? 0;
        return months > 0 ? `${months} month${months === 1 ? '' : 's'}` : '';
    }, [data.joining_date, data.confirmation_date, selectedEmployeeType]);

    const derivedAge = useMemo(() => {
        const raw = data.date_of_birth;
        if (!raw) return '';
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return '';
        const today = new Date();
        let years = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years -= 1;
        return years >= 0 ? String(years) : '';
    }, [data.date_of_birth]);

    const [sameAsPermanent, setSameAsPermanent] = useState(false);
    const sameAsPermanentRef = useRef(false);
    sameAsPermanentRef.current = sameAsPermanent;

    const canOpenUnionModal = (target: 'present' | 'permanent') => {
        const idx = target === 'present' ? 0 : 1;
        const a = data.addresses[idx];
        return !!(a?.division && a?.district && a?.upazila);
    };

    const canOpenVillageModal = (target: 'present' | 'permanent') => {
        const idx = target === 'present' ? 0 : 1;
        const a = data.addresses[idx];
        return !!(a?.division && a?.district && a?.upazila && a?.union);
    };

    const persistUnion = async (target: 'present' | 'permanent', nameRaw: string): Promise<{ ok: boolean; error?: string }> => {
        const idx = target === 'present' ? 0 : 1;
        const division = data.addresses[idx]?.division || '';
        const district = data.addresses[idx]?.district || '';
        const upazila = data.addresses[idx]?.upazila || '';
        const name = nameRaw.trim();
        if (!division || !district || !upazila || !name) return { ok: false, error: 'All fields are required.' };
        beginLocationSave();
        try {
            const j = await csrfJsonPost<{ name?: string }>(route('employees.unions.store'), { division, district, upazila, name });
            const createdName = j.name || name;
            const createdUnion: LocationUnion = { name: createdName, type: 'union', villages: [] };
            locationCascade.addUnion(upazila, createdUnion);
            const key = `${target === 'present' ? 'p' : 'r'}:${upazila}`;
            setExtraUnions((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), createdUnion] }));
            if (target === 'present') setPresentAddress({ union: createdName, village: '' });
            else setPermanentAddress({ union: createdName, village: '' });
            return { ok: true };
        } catch (error) {
            return { ok: false, error: csrfJsonPostErrorMessage(error) };
        } finally {
            endLocationSave();
        }
    };

    const persistVillage = async (target: 'present' | 'permanent', nameRaw: string): Promise<{ ok: boolean; error?: string }> => {
        const idx = target === 'present' ? 0 : 1;
        const division = data.addresses[idx]?.division || '';
        const district = data.addresses[idx]?.district || '';
        const upazila = data.addresses[idx]?.upazila || '';
        const union = data.addresses[idx]?.union || '';
        const name = nameRaw.trim();
        if (!division || !district || !upazila || !union || !name) return { ok: false, error: 'All fields are required.' };
        beginLocationSave();
        try {
            const j = await csrfJsonPost<{ name?: string }>(route('employees.villages.store'), { division, district, upazila, union, name });
            const createdName = j.name || name;
            locationCascade.addVillageToUnion(upazila, union, createdName);
            const key = `${target === 'present' ? 'p' : 'r'}:${upazila}:${union}`;
            setExtraVillages((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), createdName] }));
            if (target === 'present') setPresentAddress({ village: createdName });
            else setPermanentAddress({ village: createdName });
            return { ok: true };
        } catch (error) {
            return { ok: false, error: csrfJsonPostErrorMessage(error) };
        } finally {
            endLocationSave();
        }
    };

    const saveUnionModal = async (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!addUnionModal.name.trim() || addUnionModal.saving) return;
        setAddUnionModal((s) => ({ ...s, saving: true, error: '' }));
        const res = await persistUnion(addUnionModal.target, addUnionModal.name);
        if (res.ok) {
            setAddUnionModal({ open: false, target: 'present', name: '', error: '', saving: false });
            return;
        }
        setAddUnionModal((s) => ({ ...s, saving: false, error: res.error || 'Failed to save union.' }));
    };

    const saveVillageModal = async (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!addVillageModal.name.trim() || addVillageModal.saving) return;
        setAddVillageModal((s) => ({ ...s, saving: true, error: '' }));
        const res = await persistVillage(addVillageModal.target, addVillageModal.name);
        if (res.ok) {
            setAddVillageModal({ open: false, target: 'present', name: '', error: '', saving: false });
            return;
        }
        setAddVillageModal((s) => ({ ...s, saving: false, error: res.error || 'Failed to save village.' }));
    };

    const setPresentAddress = (patch: Partial<Address>) => {
        const [present, permanent] = normalizeEmployeeFormAddresses(data.addresses);
        const updated: Address = { ...present, ...patch, type: 'present' };
        updated.address_details = buildAddressDetails(updated);
        setData('addresses', [updated, permanent]);
    };

    const setPermanentAddress = (patch: Partial<Address>) => {
        const [present, permanent] = normalizeEmployeeFormAddresses(data.addresses);
        const updated: Address = { ...permanent, ...patch, type: 'permanent' };
        updated.address_details = buildAddressDetails(updated);
        if (sameAsPermanentRef.current) {
            const synced: Address = { ...present, ...updated, type: 'present' };
            synced.address_details = buildAddressDetails(synced);
            setData('addresses', [synced, updated]);
            return;
        }
        setData('addresses', [present, updated]);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (blockMainSubmitRef.current) return;
        if (addUnionModal.open || addVillageModal.open || addUnionModal.saving || addVillageModal.saving) {
            return;
        }
        setTabStepBlockMessages(null);
        const nidErr = getNidOrSmartCardClientError(data.nid);
        if (nidErr) {
            setActiveTab('general');
            setTabStepBlockMessages([nidErr]);
            return;
        }
        post(route('employees.store'), {
            preserveScroll: true,
            forceFormData: true,
            transform: (formData) => ({
                ...formData,
                sync_salary_components: salaryComponentsEditing ? 1 : 0,
                salary_lines_json: salaryComponentsEditing
                    ? buildSalaryLinesJson(salaryAdditionRows, salaryDeductionRows)
                    : '',
            }),
            onSuccess: () => {
                clearEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY);
                setTabStepBlockMessages(null);
            },
            onError: (errs) => {
                const tab = inferFirstTabFromEmployeeErrors(errs as Record<string, string | undefined>);
                if (tab) setActiveTab(tab);
            },
        });
    };

    const handleClearDraft = () => {
        if (window.confirm('Are you sure you want to discard your draft progress and reset the form to defaults?')) {
            clearEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY);
            const defaults = getCreateFormDefaults();
            setData(defaults);
            clearPhotoUpload();
            clearSignatureUpload();
            setActiveTab('general');
            setTabStepBlockMessages(null);
        }
    };

    const tabLabels: Record<EmployeeCreateTabId, { title: string; desc: string; icon: any }> = {
        general: { title: 'General Info', desc: 'Identity & contact', icon: User },
        education: { title: 'Education', desc: 'Degrees & boards', icon: GraduationCap },
        salary: { title: 'Salary Details', desc: 'Payscale & grade', icon: DollarSign },
        bank: { title: 'Bank Account', desc: 'Payment routing', icon: Building2 },
        nominee: { title: 'Nominees', desc: 'Beneficiaries', icon: Users },
        guarantor: { title: 'Guarantor', desc: 'References & cheques', icon: ShieldCheck },
        collateral: { title: 'Collateral', desc: 'Security documents', icon: Shield },
        asset: { title: 'Assets', desc: 'Company devices', icon: Package },
        experience: { title: 'Experience', desc: 'Employment history', icon: Briefcase },
        training: { title: 'Trainings', desc: 'Courses & skills', icon: Award },
        documents: { title: 'Documents', desc: 'Attachments & scans', icon: FileText },
    };

    const getTabStepState = (tabId: EmployeeCreateTabId) => {
        const isTabActive = activeTab === tabId;
        const clientProblems = validateEmployeeCreateTab(tabId, data, isSpouseRequired);
        const hasServerErrors = Object.keys(errors).some((k) => errors[k] && errorFieldKeyToEmployeeCreateTab(k) === tabId);
        const hasProblems = clientProblems.length > 0 || hasServerErrors;
        const activeIdx = EMPLOYEE_CREATE_TAB_ORDER.indexOf(activeTab as EmployeeCreateTabId);
        const tabIdx = EMPLOYEE_CREATE_TAB_ORDER.indexOf(tabId);
        const isCompleted = tabIdx < activeIdx && !hasProblems;

        return {
            isActive: isTabActive,
            isCompleted,
            isInvalid: hasProblems && tabIdx <= activeIdx,
            hasProblems,
        };
    };

    return (
        <Layout>
            <Head title="Add New Employee" />

            <div className="mx-auto max-w-[1300px] px-4 py-8 sm:px-6 lg:px-8">
                {/* Minimal Header */}
                <div className="mb-8 flex flex-col gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                        <Link
                            href={route('employees.index')}
                            className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-zinc-400 uppercase transition-colors hover:text-emerald-600"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Back to Directory</span>
                        </Link>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">Add New Employee</h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/10 ring-inset">
                                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> New Profile
                            </span>
                        </div>
                        <p className="max-w-2xl text-xs text-zinc-500 sm:text-sm">
                            Fill out the employee profile details across steps. Draft progress is preserved automatically.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200/60 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-500 shadow-sm">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            <span>Draft Auto-saved</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClearDraft}
                            className="flex h-8 items-center gap-1.5 rounded-xl border border-transparent px-2.5 text-xs font-bold text-red-600 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-700"
                            title="Discard draft and reset form"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reset Form</span>
                        </Button>
                    </div>
                </div>

                {/* Validation Banner */}
                {tabStepBlockMessages?.length || serverFieldErrors.length > 0 || submitError ? (
                    <Alert variant="destructive" className="mb-6 rounded-2xl border-red-200 bg-red-50/50 shadow-sm">
                        <AlertTitle className="flex items-center gap-2 font-bold text-red-800">
                            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                            {serverFieldErrors.length > 0 || submitError ? 'Submission Failed' : 'Action Required'}
                        </AlertTitle>
                        <AlertDescription className="mt-2 space-y-2 text-xs text-red-700">
                            {tabStepBlockMessages && tabStepBlockMessages.length > 0 && (
                                <div>
                                    <p className="font-bold">Please complete or correct the following fields in this section:</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-5 font-medium">
                                        {tabStepBlockMessages.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {serverFieldErrors.length > 0 && (
                                <div>
                                    <p className="font-bold">Errors returned from server:</p>
                                    <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 font-medium">
                                        {serverFieldErrors.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {submitError && <p className="font-semibold">{submitError}</p>}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {/* Main Setup Layout */}
                <form
                    onSubmit={submit}
                    onSubmitCapture={(e) => {
                        if (
                            blockMainSubmitRef.current ||
                            addUnionModal.open ||
                            addVillageModal.open ||
                            addUnionModal.saving ||
                            addVillageModal.saving
                        ) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }}
                >
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                        {/* Sidebar Stepper */}
                        <div className="lg:col-span-3">
                            <div className="sticky top-6 space-y-4">
                                <div className="hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm lg:block">
                                    <h2 className="mb-4 px-1 text-[10px] font-extrabold tracking-widest text-zinc-400 uppercase">Progress</h2>
                                    <nav className="relative flex flex-col justify-start">
                                        <div className="absolute top-4 bottom-4 left-[17px] w-0.5 bg-zinc-100" />
                                        {EMPLOYEE_CREATE_TAB_ORDER.map((tabId, idx) => {
                                            const label = tabLabels[tabId];
                                            const state = getTabStepState(tabId);
                                            const Icon = label.icon;
                                            return (
                                                <button
                                                    key={tabId}
                                                    type="button"
                                                    onClick={() => requestTabChange(tabId)}
                                                    className={cn(
                                                        'relative flex w-full items-start gap-3.5 rounded-xl px-2 py-3.5 text-left transition-all duration-200 outline-none',
                                                        state.isActive
                                                            ? 'bg-emerald-50/40 font-medium text-emerald-950'
                                                            : 'text-zinc-500 hover:bg-zinc-50/40 hover:text-zinc-900',
                                                    )}
                                                >
                                                    <div className="relative z-10 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full transition-all duration-300">
                                                        {state.isInvalid ? (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-600 ring-2 ring-red-100/50">
                                                                <AlertCircle className="h-4 w-4" />
                                                            </div>
                                                        ) : state.isCompleted ? (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-emerald-50">
                                                                <Check className="h-4 w-4" strokeWidth={3} />
                                                            </div>
                                                        ) : state.isActive ? (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-emerald-100">
                                                                <Icon className="h-3.5 w-3.5" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                                                                <span className="text-[10px] font-semibold">{idx + 1}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div
                                                            className={cn(
                                                                'text-xs leading-tight font-semibold',
                                                                state.isActive ? 'text-emerald-900' : 'text-zinc-700',
                                                            )}
                                                        >
                                                            {label.title}
                                                        </div>
                                                        <span
                                                            className={cn(
                                                                'mt-0.5 block text-[10px] leading-tight',
                                                                state.isActive ? 'text-emerald-700/80' : 'text-zinc-400',
                                                            )}
                                                        >
                                                            {label.desc}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </nav>
                                </div>

                                {/* Mobile horizontal stepper */}
                                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm lg:hidden">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <span className="text-[9px] font-extrabold tracking-widest text-zinc-400 uppercase">Active Step</span>
                                            <h3 className="mt-0.5 text-sm font-bold text-zinc-800">
                                                {tabLabels[activeTab as EmployeeCreateTabId]?.title}
                                            </h3>
                                        </div>
                                        <div className="text-right text-xs font-bold text-emerald-600">
                                            {EMPLOYEE_CREATE_TAB_ORDER.indexOf(activeTab as EmployeeCreateTabId) + 1} /{' '}
                                            {EMPLOYEE_CREATE_TAB_ORDER.length}
                                        </div>
                                    </div>
                                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                        <div
                                            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                                            style={{
                                                width: `${((EMPLOYEE_CREATE_TAB_ORDER.indexOf(activeTab as EmployeeCreateTabId) + 1) / EMPLOYEE_CREATE_TAB_ORDER.length) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto border-t border-zinc-100 pt-3 pb-1">
                                        {EMPLOYEE_CREATE_TAB_ORDER.map((tabId, idx) => {
                                            const label = tabLabels[tabId];
                                            const state = getTabStepState(tabId);
                                            return (
                                                <button
                                                    key={tabId}
                                                    type="button"
                                                    onClick={() => requestTabChange(tabId)}
                                                    className={cn(
                                                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150',
                                                        state.isActive
                                                            ? 'border-emerald-600 bg-emerald-600 text-white'
                                                            : state.isInvalid
                                                              ? 'border-red-200 bg-red-50 text-red-700'
                                                              : 'border-zinc-200 bg-white text-zinc-600',
                                                    )}
                                                >
                                                    <span>
                                                        {idx + 1}. {label.title}
                                                    </span>
                                                    {state.isCompleted && <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}
                                                    {state.isInvalid && <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Work Area */}
                        <div className="lg:col-span-9">
                            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
                                <Tabs value={activeTab} onValueChange={requestTabChange} className="w-full">
                                    {/* GENERAL TAB */}
                                    <TabsContent value="general" className="mt-0 focus-visible:outline-none">
                                        <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <h2 className="text-lg font-bold text-zinc-900">General Setup</h2>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                Provide employee organization, identity, address details, and uploads.
                                            </p>
                                        </div>
                                        <div className="space-y-8 p-6 md:p-8">
                                            {/* Photo & Signature Upload Banner */}
                                            <div className="grid grid-cols-1 gap-6 rounded-xl border border-zinc-100 bg-zinc-50/40 p-5 md:grid-cols-2">
                                                <FormField label="Employee Photo" error={errors.photo}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-inner">
                                                            {photoPreview ? (
                                                                <img src={photoPreview} className="h-full w-full object-cover" alt="Preview" />
                                                            ) : (
                                                                <User className="h-8 w-8 animate-pulse text-zinc-300" strokeWidth={1.5} />
                                                            )}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <input
                                                                ref={photoFileInputRef}
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    applyPhotoFile(e.target.files?.[0] ?? null);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8.5 rounded-lg text-xs font-semibold shadow-sm"
                                                                    onClick={() => photoFileInputRef.current?.click()}
                                                                >
                                                                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload File
                                                                </Button>
                                                                {photoPreview && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8.5 rounded-lg text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                        onClick={clearPhotoUpload}
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-zinc-400">JPG, PNG or WebP. Max 5MB.</p>
                                                        </div>
                                                    </div>
                                                </FormField>

                                                <FormField label="Signature Scan" error={errors.signature}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative flex h-24 w-44 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-inner">
                                                            {signaturePreview ? (
                                                                <img src={signaturePreview} className="h-full w-full object-contain" alt="Preview" />
                                                            ) : (
                                                                <SignatureDemoGraphic className="h-full w-full opacity-35" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <input
                                                                ref={signatureFileInputRef}
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    applySignatureFile(e.target.files?.[0] ?? null);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8.5 rounded-lg text-xs font-semibold shadow-sm"
                                                                    onClick={() => signatureFileInputRef.current?.click()}
                                                                >
                                                                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload File
                                                                </Button>
                                                                {signaturePreview && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8.5 rounded-lg text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                        onClick={clearSignatureUpload}
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-zinc-400">Dark ink on white paper.</p>
                                                        </div>
                                                    </div>
                                                </FormField>
                                            </div>

                                            {/* Organization Group */}
                                            <div>
                                                <SectionHeading>Employment Information</SectionHeading>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                                    <FormField label="Branch Name" required error={errors.current_branch_id}>
                                                        <ComboSelect
                                                            value={data.current_branch_id || null}
                                                            onChange={(v) => setData('current_branch_id', v ?? '')}
                                                            items={branchItems}
                                                            placeholder="Select Branch"
                                                        />
                                                    </FormField>
                                                    <FormField label="Employment Type" required error={errors.employee_type_id}>
                                                        <ComboSelect
                                                            value={data.employee_type_id || null}
                                                            onChange={(v) => setData('employee_type_id', v ?? '')}
                                                            items={employeeTypeItems}
                                                            placeholder="Select Type"
                                                        />
                                                    </FormField>
                                                    <FormField label="Department" required error={errors.department_id}>
                                                        <ComboSelect
                                                            value={data.department_id || null}
                                                            onChange={(v) => setData('department_id', v ?? '')}
                                                            items={deptItems}
                                                            placeholder="Select Department"
                                                        />
                                                    </FormField>
                                                    <FormField label="Opening Designation" required error={errors.joining_designation_id}>
                                                        <ComboSelect
                                                            value={data.joining_designation_id || null}
                                                            onChange={(v) => setOpeningDesignation(v ?? '')}
                                                            items={desigItems}
                                                            placeholder="Select Designation"
                                                        />
                                                    </FormField>
                                                    <FormField label="Last Designation" error={errors.last_designation_id}>
                                                        <ComboSelect
                                                            value={data.last_designation_id || null}
                                                            onChange={(v) => setLastDesignation(v ?? '')}
                                                            items={desigItems}
                                                            placeholder="Select Designation"
                                                        />
                                                    </FormField>
                                                    <FormField label="Program">
                                                        <ComboSelect
                                                            value={data.program_id || null}
                                                            onChange={(v) => setData('program_id', v ?? '')}
                                                            items={programItems}
                                                            placeholder="Select Program"
                                                        />
                                                    </FormField>
                                                    <FormField label="Project">
                                                        <ComboSelect
                                                            value={data.project_id || null}
                                                            onChange={(v) => setData('project_id', v ?? '')}
                                                            items={projectItems}
                                                            placeholder="Select Project"
                                                        />
                                                    </FormField>
                                                    <FormField label="Employee PIN" required error={errors.pin}>
                                                        <Input
                                                            value={data.pin}
                                                            onChange={(e) => setData('pin', e.target.value)}
                                                            placeholder="e.g. PIN-001"
                                                        />
                                                    </FormField>
                                                    <FormField label="Joining Date" required error={errors.joining_date}>
                                                        <Input
                                                            type="date"
                                                            value={data.joining_date}
                                                            onChange={(e) => setData('joining_date', e.target.value)}
                                                        />
                                                    </FormField>
                                                    <FormField label="Confirmation Date">
                                                        <Input
                                                            type="date"
                                                            value={data.confirmation_date}
                                                            onChange={(e) => setData('confirmation_date', e.target.value)}
                                                        />
                                                    </FormField>
                                                    <FormField label="Probation Period">
                                                        <Input
                                                            value={derivedProbationLabel}
                                                            readOnly
                                                            className="cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-500"
                                                            placeholder="Calculated automatically"
                                                        />
                                                    </FormField>
                                                </div>
                                            </div>

                                            {/* Personal Identity Group */}
                                            <div>
                                                <SectionHeading>Personal Details</SectionHeading>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                                    <FormField label="Employee Name (English)" required error={errors.name_en}>
                                                        <Input
                                                            value={data.name_en}
                                                            onChange={(e) => setData('name_en', e.target.value)}
                                                            placeholder="Full Name (English)"
                                                        />
                                                    </FormField>
                                                    <FormField label="Employee Name (Bengali)" error={errors.name_bn}>
                                                        <Input
                                                            value={data.name_bn}
                                                            onChange={(e) => setData('name_bn', e.target.value)}
                                                            placeholder="পূর্ণ নাম (বাংলা)"
                                                        />
                                                    </FormField>
                                                    <FormField label="Gender">
                                                        <ComboSelect
                                                            value={data.gender || null}
                                                            onChange={(v) => setData('gender', v ?? '')}
                                                            items={[
                                                                { value: 'male', label: 'Male' },
                                                                { value: 'female', label: 'Female' },
                                                                { value: 'other', label: 'Other' },
                                                            ]}
                                                            placeholder="Select Gender"
                                                        />
                                                    </FormField>
                                                    <FormField label="Religion">
                                                        <ComboSelect
                                                            value={data.religion || null}
                                                            onChange={(v) => setData('religion', v ?? '')}
                                                            items={['Islam', 'Hindu', 'Christian', 'Buddhist', 'Sikh', 'Other'].map((r) => ({
                                                                value: r,
                                                                label: r,
                                                            }))}
                                                            placeholder="Select Religion"
                                                        />
                                                    </FormField>
                                                    <FormField label="Marital Status">
                                                        <ComboSelect
                                                            value={data.marital_status || null}
                                                            onChange={(v) => setData('marital_status', v ?? '')}
                                                            items={['Single', 'Married', 'Separated', 'Divorced', 'Widowed'].map((m) => ({
                                                                value: m,
                                                                label: m,
                                                            }))}
                                                            placeholder="Select Status"
                                                        />
                                                    </FormField>
                                                    <FormField label="Date of Birth">
                                                        <Input
                                                            type="date"
                                                            value={data.date_of_birth}
                                                            onChange={(e) => setData('date_of_birth', e.target.value)}
                                                        />
                                                    </FormField>
                                                    <FormField label="Age">
                                                        <Input
                                                            value={derivedAge}
                                                            readOnly
                                                            className="cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-500"
                                                            placeholder="Calculated age"
                                                        />
                                                    </FormField>
                                                    <FormField label="Blood Group">
                                                        <ComboSelect
                                                            value={data.blood_group || null}
                                                            onChange={(v) => setData('blood_group', v ?? '')}
                                                            items={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => ({
                                                                value: b,
                                                                label: b,
                                                            }))}
                                                            placeholder="Select Blood Group"
                                                        />
                                                    </FormField>
                                                </div>

                                                {isSpouseRequired && (
                                                    <div className="animate-slide-down mt-5 grid grid-cols-1 gap-5 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 md:grid-cols-2">
                                                        <FormField label="Spouse Name" required error={errors.spouse_name}>
                                                            <Input
                                                                value={data.spouse_name}
                                                                onChange={(e) => setData('spouse_name', e.target.value)}
                                                                placeholder="Spouse Full Name"
                                                            />
                                                        </FormField>
                                                        <FormField label="Spouse Contact Mobile" required error={errors.spouse_mobile}>
                                                            <Input
                                                                value={data.spouse_mobile}
                                                                onChange={(e) => setData('spouse_mobile', e.target.value)}
                                                                placeholder="Spouse Contact"
                                                            />
                                                        </FormField>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Identity & Contacts */}
                                            <div>
                                                <SectionHeading>Identity & Contact Details</SectionHeading>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                                    <FormField
                                                        label="NID / Smart Card Number"
                                                        error={errors.nid_number || errors.smart_card_number || nidOrSmartClientError}
                                                    >
                                                        <Input
                                                            inputMode="numeric"
                                                            maxLength={17}
                                                            value={data.nid}
                                                            onChange={(e) => setData('nid', e.target.value.replace(/\D/g, '').slice(0, 17))}
                                                            placeholder="10, 13 or 17 digit NID"
                                                        />
                                                    </FormField>
                                                    <FormField label="TIN Number" error={errors.tin_certificate_no}>
                                                        <Input
                                                            value={data.tin_certificate_no}
                                                            onChange={(e) => setData('tin_certificate_no', e.target.value)}
                                                            placeholder="TIN Number"
                                                        />
                                                    </FormField>
                                                    <FormField label="Driving License" error={errors.driving_license_no}>
                                                        <Input
                                                            value={data.driving_license_no}
                                                            onChange={(e) => setData('driving_license_no', e.target.value)}
                                                            placeholder="Driving License No"
                                                        />
                                                    </FormField>
                                                    <FormField label="Passport Number" error={errors.passport_no}>
                                                        <Input
                                                            value={data.passport_no}
                                                            onChange={(e) => setData('passport_no', e.target.value)}
                                                            placeholder="Passport No"
                                                        />
                                                    </FormField>
                                                    <FormField label="Identification Mark" error={errors.identification_mark}>
                                                        <Input
                                                            value={data.identification_mark}
                                                            onChange={(e) => setData('identification_mark', e.target.value)}
                                                            placeholder="e.g. scar on wrist"
                                                        />
                                                    </FormField>
                                                    <FormField label="Email Address" error={errors.email}>
                                                        <Input
                                                            type="email"
                                                            value={data.email}
                                                            onChange={(e) => setData('email', e.target.value)}
                                                            placeholder="name@company.com"
                                                        />
                                                    </FormField>
                                                    <FormField label="Mobile (Personal)" required error={errors.mobile_personal}>
                                                        <Input
                                                            value={data.mobile_personal}
                                                            onChange={(e) => setData('mobile_personal', e.target.value)}
                                                            placeholder="Personal Mobile No"
                                                        />
                                                    </FormField>
                                                    <FormField label="Mobile (Official)" error={errors.mobile_official}>
                                                        <Input
                                                            value={data.mobile_official}
                                                            onChange={(e) => setData('mobile_official', e.target.value)}
                                                            placeholder="Official Mobile No"
                                                        />
                                                    </FormField>
                                                </div>
                                            </div>

                                            {/* Parents Info */}
                                            <div>
                                                <SectionHeading>Family Information</SectionHeading>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                                    <FormField label="Father's Name" error={errors.fathers_name}>
                                                        <Input
                                                            value={data.fathers_name}
                                                            onChange={(e) => setData('fathers_name', e.target.value)}
                                                            placeholder="Father's Full Name"
                                                        />
                                                    </FormField>
                                                    <FormField label="Father's Mobile" error={errors.fathers_mobile}>
                                                        <Input
                                                            value={data.fathers_mobile}
                                                            onChange={(e) => setData('fathers_mobile', e.target.value)}
                                                            placeholder="Father's Mobile"
                                                        />
                                                    </FormField>
                                                    <FormField label="Mother's Name" error={errors.mothers_name}>
                                                        <Input
                                                            value={data.mothers_name}
                                                            onChange={(e) => setData('mothers_name', e.target.value)}
                                                            placeholder="Mother's Full Name"
                                                        />
                                                    </FormField>
                                                    <FormField label="Mother's Mobile" error={errors.mothers_mobile}>
                                                        <Input
                                                            value={data.mothers_mobile}
                                                            onChange={(e) => setData('mothers_mobile', e.target.value)}
                                                            placeholder="Mother's Mobile"
                                                        />
                                                    </FormField>
                                                </div>
                                            </div>

                                            {/* Addresses */}
                                            <div>
                                                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-3">
                                                    <div>
                                                        <h3 className="text-sm font-bold tracking-tight text-zinc-900">Addresses</h3>
                                                    </div>
                                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-500 select-none">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                                            checked={sameAsPermanent}
                                                            onChange={(e) => {
                                                                const ch = e.target.checked;
                                                                setSameAsPermanent(ch);
                                                                if (ch) {
                                                                    const [present, permanent] = normalizeEmployeeFormAddresses(data.addresses);
                                                                    const synced = { ...present, ...permanent, type: 'present' as const };
                                                                    synced.address_details = buildAddressDetails(synced);
                                                                    setData('addresses', [synced, permanent]);
                                                                }
                                                            }}
                                                        />
                                                        <span>Present Address same as Permanent</span>
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
                                                    {/* Permanent */}
                                                    <div className="space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50/40 p-5">
                                                        <h4 className="text-xs font-bold tracking-wide text-zinc-700 uppercase">Permanent Address</h4>
                                                        <div className="space-y-4">
                                                            <FormField label="Division">
                                                                <ComboSelect
                                                                    value={data.addresses[1]?.division || null}
                                                                    onChange={(v) =>
                                                                        setPermanentAddress({
                                                                            division: v ?? '',
                                                                            district: '',
                                                                            upazila: '',
                                                                            union: '',
                                                                            village: '',
                                                                        })
                                                                    }
                                                                    items={divisionItems}
                                                                    placeholder="Select Division"
                                                                />
                                                            </FormField>
                                                            <FormField label="District">
                                                                <ComboSelect
                                                                    value={data.addresses[1]?.district || null}
                                                                    onChange={(v) =>
                                                                        setPermanentAddress({
                                                                            district: v ?? '',
                                                                            upazila: '',
                                                                            union: '',
                                                                            village: '',
                                                                        })
                                                                    }
                                                                    items={permDistrictItems}
                                                                    placeholder="Select District"
                                                                    disabled={!data.addresses[1]?.division}
                                                                />
                                                            </FormField>
                                                            <FormField label="Upazila / Thana">
                                                                <ComboSelect
                                                                    value={data.addresses[1]?.upazila || null}
                                                                    onChange={(v) =>
                                                                        setPermanentAddress({ upazila: v ?? '', union: '', village: '' })
                                                                    }
                                                                    items={permUpazilaItems}
                                                                    placeholder="Select Upazila"
                                                                    disabled={!data.addresses[1]?.district}
                                                                />
                                                            </FormField>
                                                            <FormField label="Union">
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <ComboSelect
                                                                            value={data.addresses[1]?.union || null}
                                                                            onChange={(v) => setPermanentAddress({ union: v ?? '', village: '' })}
                                                                            items={permUnionItems}
                                                                            placeholder="Select Union"
                                                                            disabled={!data.addresses[1]?.upazila}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-10 w-10 shrink-0 rounded-lg"
                                                                        onClick={() =>
                                                                            setAddUnionModal({
                                                                                open: true,
                                                                                target: 'permanent',
                                                                                name: '',
                                                                                error: '',
                                                                                saving: false,
                                                                            })
                                                                        }
                                                                        disabled={!canOpenUnionModal('permanent')}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </FormField>
                                                            <FormField label="Village">
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <ComboSelect
                                                                            value={data.addresses[1]?.village || null}
                                                                            onChange={(v) => setPermanentAddress({ village: v ?? '' })}
                                                                            items={permVillageItems}
                                                                            placeholder="Select Village"
                                                                            disabled={!data.addresses[1]?.union}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-10 w-10 shrink-0 rounded-lg"
                                                                        onClick={() =>
                                                                            setAddVillageModal({
                                                                                open: true,
                                                                                target: 'permanent',
                                                                                name: '',
                                                                                error: '',
                                                                                saving: false,
                                                                            })
                                                                        }
                                                                        disabled={!canOpenVillageModal('permanent')}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </FormField>
                                                        </div>
                                                    </div>

                                                    {/* Present */}
                                                    <div
                                                        className={cn(
                                                            'space-y-4 rounded-2xl border p-5 transition-all duration-300',
                                                            sameAsPermanent
                                                                ? 'pointer-events-none border-zinc-100 bg-zinc-50/10 opacity-60'
                                                                : 'border-zinc-100 bg-zinc-50/40',
                                                        )}
                                                    >
                                                        <h4 className="text-xs font-bold tracking-wide text-zinc-700 uppercase">Present Address</h4>
                                                        <div className="space-y-4">
                                                            <FormField label="Division">
                                                                <ComboSelect
                                                                    value={data.addresses[0]?.division || null}
                                                                    onChange={(v) =>
                                                                        setPresentAddress({
                                                                            division: v ?? '',
                                                                            district: '',
                                                                            upazila: '',
                                                                            union: '',
                                                                            village: '',
                                                                        })
                                                                    }
                                                                    items={divisionItems}
                                                                    placeholder="Select Division"
                                                                    disabled={sameAsPermanent}
                                                                />
                                                            </FormField>
                                                            <FormField label="District">
                                                                <ComboSelect
                                                                    value={data.addresses[0]?.district || null}
                                                                    onChange={(v) =>
                                                                        setPresentAddress({ district: v ?? '', upazila: '', union: '', village: '' })
                                                                    }
                                                                    items={districtItems}
                                                                    placeholder="Select District"
                                                                    disabled={sameAsPermanent || !data.addresses[0]?.division}
                                                                />
                                                            </FormField>
                                                            <FormField label="Upazila / Thana">
                                                                <ComboSelect
                                                                    value={data.addresses[0]?.upazila || null}
                                                                    onChange={(v) => setPresentAddress({ upazila: v ?? '', union: '', village: '' })}
                                                                    items={upazilaItems}
                                                                    placeholder="Select Upazila"
                                                                    disabled={sameAsPermanent || !data.addresses[0]?.district}
                                                                />
                                                            </FormField>
                                                            <FormField label="Union">
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <ComboSelect
                                                                            value={data.addresses[0]?.union || null}
                                                                            onChange={(v) => setPresentAddress({ union: v ?? '', village: '' })}
                                                                            items={presentUnionItems}
                                                                            placeholder="Select Union"
                                                                            disabled={sameAsPermanent || !data.addresses[0]?.upazila}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-10 w-10 shrink-0 rounded-lg"
                                                                        onClick={() =>
                                                                            setAddUnionModal({
                                                                                open: true,
                                                                                target: 'present',
                                                                                name: '',
                                                                                error: '',
                                                                                saving: false,
                                                                            })
                                                                        }
                                                                        disabled={sameAsPermanent || !canOpenUnionModal('present')}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </FormField>
                                                            <FormField label="Village">
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <ComboSelect
                                                                            value={data.addresses[0]?.village || null}
                                                                            onChange={(v) => setPresentAddress({ village: v ?? '' })}
                                                                            items={presentVillageItems}
                                                                            placeholder="Select Village"
                                                                            disabled={sameAsPermanent || !data.addresses[0]?.union}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-10 w-10 shrink-0 rounded-lg"
                                                                        onClick={() =>
                                                                            setAddVillageModal({
                                                                                open: true,
                                                                                target: 'present',
                                                                                name: '',
                                                                                error: '',
                                                                                saving: false,
                                                                            })
                                                                        }
                                                                        disabled={sameAsPermanent || !canOpenVillageModal('present')}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </FormField>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <span className="text-xs font-semibold text-zinc-400">Step 1 of 11: General Setup</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('education')}
                                            >
                                                Next: Educational History
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* EDUCATION TAB */}
                                    <TabsContent value="education" className="mt-0 focus-visible:outline-none">
                                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <div>
                                                <h2 className="text-lg font-bold text-zinc-900">Academic Background</h2>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    Add details regarding completed academic degrees and qualifications.
                                                </p>
                                            </div>
                                            {data.educations.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() =>
                                                        setData('educations', [
                                                            ...data.educations,
                                                            {
                                                                degree: '',
                                                                institute: '',
                                                                board: '',
                                                                group_name: '',
                                                                subject: '',
                                                                result_type: '',
                                                                result_value: '',
                                                            },
                                                        ])
                                                    }
                                                >
                                                    <Plus className="mr-1.5 h-4 w-4" /> Add Row
                                                </Button>
                                            )}
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            {data.educations.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/25 px-4 py-12 text-center">
                                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/30">
                                                        <GraduationCap className="h-6 w-6" strokeWidth={1.5} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-zinc-900">No Education Records</h3>
                                                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                                                        Academic history details are empty. Click the button below to add details.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-4 h-9 rounded-lg border-emerald-600/30 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() =>
                                                            setData('educations', [
                                                                {
                                                                    degree: '',
                                                                    institute: '',
                                                                    board: '',
                                                                    group_name: '',
                                                                    subject: '',
                                                                    result_type: '',
                                                                    result_value: '',
                                                                },
                                                            ])
                                                        }
                                                    >
                                                        <Plus className="mr-1.5 h-4 w-4" /> Add Academic Record
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {data.educations.map((ed, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="relative space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-zinc-300"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                                                                <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                                                                    Education #{idx + 1}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 rounded-lg text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                    onClick={() =>
                                                                        setData(
                                                                            'educations',
                                                                            data.educations.filter((_, i) => i !== idx),
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                                <FormField label="Degree Title" required>
                                                                    <ComboSelect
                                                                        value={ed.degree || null}
                                                                        onChange={(v) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], degree: v ?? '' };
                                                                            setData('educations', next);
                                                                        }}
                                                                        items={[
                                                                            ...educationDegrees.map((d) => ({ value: d, label: d })),
                                                                            ...(ed.degree && !educationDegrees.includes(ed.degree)
                                                                                ? [{ value: ed.degree, label: ed.degree }]
                                                                                : []),
                                                                        ]}
                                                                        placeholder="Select Degree"
                                                                        creatable
                                                                        onCreate={(label) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], degree: label };
                                                                            setData('educations', next);
                                                                        }}
                                                                    />
                                                                </FormField>
                                                                <FormField label="Institute Name">
                                                                    <Input
                                                                        value={ed.institute}
                                                                        onChange={(e) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], institute: e.target.value };
                                                                            setData('educations', next);
                                                                        }}
                                                                        placeholder="College / University"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Board">
                                                                    <ComboSelect
                                                                        value={ed.board || null}
                                                                        onChange={(v) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], board: v ?? '' };
                                                                            setData('educations', next);
                                                                        }}
                                                                        items={educationBoards.map((b) => ({ value: b, label: b }))}
                                                                        placeholder="Select Board"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Group / Discipline">
                                                                    <ComboSelect
                                                                        value={ed.group_name || null}
                                                                        onChange={(v) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], group_name: v ?? '' };
                                                                            setData('educations', next);
                                                                        }}
                                                                        items={[
                                                                            ...educationGroups.map((g) => ({ value: g, label: g })),
                                                                            ...(ed.group_name && !educationGroups.includes(ed.group_name)
                                                                                ? [{ value: ed.group_name, label: ed.group_name }]
                                                                                : []),
                                                                        ]}
                                                                        placeholder="Select Group / Discipline"
                                                                        creatable
                                                                        onCreate={(label) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], group_name: label };
                                                                            setData('educations', next);
                                                                        }}
                                                                    />
                                                                </FormField>
                                                                <FormField label="Subject">
                                                                    <Input
                                                                        value={ed.subject}
                                                                        onChange={(e) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], subject: e.target.value };
                                                                            setData('educations', next);
                                                                        }}
                                                                        placeholder="e.g. Physics"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Result Type">
                                                                    <ComboSelect
                                                                        value={ed.result_type || null}
                                                                        onChange={(v) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], result_type: (v ?? '') as any };
                                                                            setData('educations', next);
                                                                        }}
                                                                        items={[
                                                                            { value: 'gpa', label: 'GPA' },
                                                                            { value: 'cgpa', label: 'CGPA' },
                                                                            { value: 'other', label: 'Other' },
                                                                        ]}
                                                                        placeholder="Select Type"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Result / GPA Value">
                                                                    <Input
                                                                        value={ed.result_value}
                                                                        onChange={(e) => {
                                                                            const next = [...data.educations];
                                                                            next[idx] = { ...next[idx], result_value: e.target.value };
                                                                            setData('educations', next);
                                                                        }}
                                                                        placeholder="e.g. 5.00"
                                                                    />
                                                                </FormField>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('general')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 2 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('salary')}
                                            >
                                                Next: Salary Grade
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* SALARY TAB */}
                                    <TabsContent value="salary" className="mt-0 focus-visible:outline-none">
                                        <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <h2 className="text-lg font-bold text-zinc-900">Salary Assignment</h2>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                Configure the employee's payroll profile, including payscale, salary grade, and step.
                                            </p>
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            <EmployeeSalaryAssignment
                                                payscales={payscales}
                                                grades={payrollGrades}
                                                steps={payrollSteps}
                                                activePayscaleId={activePayscaleId ? String(activePayscaleId) : null}
                                                payscaleId={data.payscale_id}
                                                salaryGradeId={data.salary_grade_id}
                                                salaryStepId={data.salary_step_id}
                                                basicSalary={data.basic_salary}
                                                onPayscaleIdChange={(v) => setData('payscale_id', v)}
                                                onSalaryGradeIdChange={(v) => setData('salary_grade_id', v)}
                                                onSalaryStepIdChange={(v) => setData('salary_step_id', v)}
                                                onBasicSalaryChange={(v) => setData('basic_salary', v)}
                                                showSalaryComponents
                                                additionRows={salaryAdditionRows}
                                                deductionRows={salaryDeductionRows}
                                                onAdditionRowsChange={setSalaryAdditionRows}
                                                onDeductionRowsChange={setSalaryDeductionRows}
                                                previewUrl={route('employees.salary-assignment-preview')}
                                                componentsReadOnly={!salaryComponentsEditing}
                                                componentsEditing={salaryComponentsEditing}
                                                onToggleComponentsEdit={() => setSalaryComponentsEditing((prev) => !prev)}
                                                errors={errors}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('education')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 3 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('bank')}
                                            >
                                                Next: Bank Account
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* BANK TAB */}
                                    <TabsContent value="bank" className="mt-0 focus-visible:outline-none">
                                        <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <h2 className="text-lg font-bold text-zinc-900">Bank Routing Settings</h2>
                                            <p className="mt-1 text-xs text-zinc-500">Manage bank account information for payroll deposits.</p>
                                        </div>
                                        <div className="space-y-5 p-6 md:p-8">
                                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                                <FormField label="Bank Name" error={errors['bank.bank_name']}>
                                                    <ComboSelect
                                                        value={data.bank.bank_name || null}
                                                        onChange={(v) => setData('bank', { ...data.bank, bank_name: v ?? '' })}
                                                        items={banks.map((b) => ({ value: b, label: b }))}
                                                        placeholder="Select Bank"
                                                    />
                                                </FormField>
                                                <FormField label="Branch Name" error={errors['bank.branch_name']}>
                                                    <Input value={DEFAULT_EMPLOYEE_BANK_BRANCH_NAME} disabled readOnly />
                                                </FormField>
                                                <FormField label="Account Number" error={errors['bank.account_no']}>
                                                    <Input
                                                        value={data.bank.account_no}
                                                        onChange={(e) => setData('bank', { ...data.bank, account_no: e.target.value })}
                                                        placeholder="Account No"
                                                    />
                                                </FormField>
                                                <FormField label="Account Type" error={errors['bank.account_type']}>
                                                    <Input value={EMPLOYEE_BANK_ACCOUNT_TYPE_LABEL} disabled readOnly />
                                                </FormField>
                                                <FormField label="Bank Address" className="sm:col-span-2" error={errors['bank.bank_address']}>
                                                    <Input
                                                        value={data.bank.bank_address}
                                                        onChange={(e) => setData('bank', { ...data.bank, bank_address: e.target.value })}
                                                        placeholder="Branch Address"
                                                    />
                                                </FormField>
                                                <FormField label="Remarks" className="sm:col-span-2" error={errors['bank.remark']}>
                                                    <Textarea
                                                        value={data.bank.remark}
                                                        onChange={(e) => setData('bank', { ...data.bank, remark: e.target.value })}
                                                        placeholder="Additional routing information..."
                                                    />
                                                </FormField>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('salary')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 4 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('nominee')}
                                            >
                                                Next: Nominees
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* NOMINEE TAB */}
                                    <TabsContent value="nominee" className="mt-0 focus-visible:outline-none">
                                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <div>
                                                <h2 className="text-lg font-bold text-zinc-900">Nominee Details</h2>
                                                <p className="mt-1 text-xs text-zinc-500">Designate profile beneficiaries and allocation shares.</p>
                                            </div>
                                            {data.nominees.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() => setData('nominees', [...data.nominees, emptyNomineeFormRow()])}
                                                >
                                                    <Plus className="mr-1.5 h-4 w-4" /> Add Row
                                                </Button>
                                            )}
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            {data.nominees.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/25 px-4 py-12 text-center">
                                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/30">
                                                        <Users className="h-6 w-6" strokeWidth={1.5} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-zinc-900">No Nominees Assigned</h3>
                                                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                                                        You have not added any nominees to this employee yet.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-4 h-9 rounded-lg border-emerald-600/30 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => setData('nominees', [emptyNomineeFormRow()])}
                                                    >
                                                        <Plus className="mr-1.5 h-4 w-4" /> Add Nominee
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {data.nominees.map((nom, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-zinc-300"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                                                                <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                                                                    Nominee #{idx + 1}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 rounded-lg text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                    onClick={() =>
                                                                        setData(
                                                                            'nominees',
                                                                            data.nominees.filter((_, i) => i !== idx),
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                                                <FormField label="Nominee Name" required>
                                                                    <Input
                                                                        value={nom.name}
                                                                        onChange={(e) => {
                                                                            const next = [...data.nominees];
                                                                            next[idx] = { ...next[idx], name: e.target.value };
                                                                            setData('nominees', next);
                                                                        }}
                                                                        placeholder="Full Name"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Relationship">
                                                                    <ComboSelect
                                                                        value={nom.relation || null}
                                                                        onChange={(v) => {
                                                                            const next = [...data.nominees];
                                                                            next[idx] = { ...next[idx], relation: v ?? '' };
                                                                            setData('nominees', next);
                                                                        }}
                                                                        items={relations.map((r) => ({ value: r, label: r }))}
                                                                        placeholder="Select Relation"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Contact Mobile">
                                                                    <Input
                                                                        value={nom.mobile}
                                                                        onChange={(e) => {
                                                                            const next = [...data.nominees];
                                                                            next[idx] = { ...next[idx], mobile: e.target.value };
                                                                            setData('nominees', next);
                                                                        }}
                                                                        placeholder="Mobile No"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Date of Birth">
                                                                    <Input
                                                                        type="date"
                                                                        value={nom.date_of_birth}
                                                                        onChange={(e) => {
                                                                            const next = [...data.nominees];
                                                                            next[idx] = { ...next[idx], date_of_birth: e.target.value };
                                                                            setData('nominees', next);
                                                                        }}
                                                                    />
                                                                </FormField>
                                                                <FormField label="Share Percentage (%)">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={100}
                                                                        value={nom.share_percentage}
                                                                        onChange={(e) => {
                                                                            const next = [...data.nominees];
                                                                            next[idx] = { ...next[idx], share_percentage: e.target.value };
                                                                            setData('nominees', next);
                                                                        }}
                                                                        placeholder="e.g. 50"
                                                                    />
                                                                </FormField>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('bank')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 5 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('guarantor')}
                                            >
                                                Next: Guarantor Info
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* GUARANTOR TAB */}
                                    <TabsContent value="guarantor" className="mt-0 focus-visible:outline-none">
                                        <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <h2 className="text-lg font-bold text-zinc-900">Guarantor & Security Details</h2>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                Provide reference guarantors and security/guarantor cheque details.
                                            </p>
                                        </div>
                                        <div className="space-y-8 p-6 md:p-8">
                                            {/* Guarantors */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-zinc-800">1. References / Guarantors</h3>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8.5 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => setData('guarantors', [...data.guarantors, emptyGuarantorFormRow()])}
                                                    >
                                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Guarantor
                                                    </Button>
                                                </div>

                                                {data.guarantors.length === 0 ? (
                                                    <p className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4 text-xs text-zinc-400 italic">
                                                        No reference guarantors listed yet. Add one above.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {data.guarantors.map((g, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300"
                                                            >
                                                                <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                                                                    <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                                                                        Guarantor #{idx + 1}
                                                                    </span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 rounded-lg px-2 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                        onClick={() =>
                                                                            setData(
                                                                                'guarantors',
                                                                                data.guarantors.filter((_, i) => i !== idx),
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                                    <FormField label="Full Name" required>
                                                                        <Input
                                                                            value={g.name}
                                                                            onChange={(e) => {
                                                                                const next = [...data.guarantors];
                                                                                next[idx] = { ...next[idx], name: e.target.value };
                                                                                setData('guarantors', next);
                                                                            }}
                                                                            placeholder="Full Name"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Mobile Number">
                                                                        <Input
                                                                            value={g.mobile}
                                                                            onChange={(e) => {
                                                                                const next = [...data.guarantors];
                                                                                next[idx] = { ...next[idx], mobile: e.target.value };
                                                                                setData('guarantors', next);
                                                                            }}
                                                                            placeholder="Mobile No"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Relation">
                                                                        <ComboSelect
                                                                            value={g.relation || null}
                                                                            onChange={(v) => {
                                                                                const next = [...data.guarantors];
                                                                                next[idx] = { ...next[idx], relation: v ?? '' };
                                                                                setData('guarantors', next);
                                                                            }}
                                                                            items={relations.map((r) => ({ value: r, label: r }))}
                                                                            placeholder="Select Relation"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Full Address">
                                                                        <Input
                                                                            value={g.address}
                                                                            onChange={(e) => {
                                                                                const next = [...data.guarantors];
                                                                                next[idx] = { ...next[idx], address: e.target.value };
                                                                                setData('guarantors', next);
                                                                            }}
                                                                            placeholder="Full Address"
                                                                        />
                                                                    </FormField>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cheques */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-zinc-800">2. Security Cheques</h3>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8.5 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() =>
                                                            setData('guarantor_cheques', [
                                                                ...data.guarantor_cheques,
                                                                emptyChequeFormRow(),
                                                            ])
                                                        }
                                                    >
                                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Cheque
                                                    </Button>
                                                </div>

                                                {data.guarantor_cheques.length === 0 ? (
                                                    <p className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4 text-xs text-zinc-400 italic">
                                                        No cheques registered. Add security details if required.
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        {data.guarantor_cheques.map((ch, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="relative space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300"
                                                            >
                                                                <div className="flex items-center justify-between border-b border-zinc-50 pb-1.5">
                                                                    <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                                                                        Cheque #{idx + 1}
                                                                    </span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6.5 rounded-lg px-2 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                        onClick={() =>
                                                                            setData(
                                                                                'guarantor_cheques',
                                                                                data.guarantor_cheques.filter((_, i) => i !== idx),
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="mr-1 h-3 w-3" /> Remove
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                                    <FormField label="Bank Name">
                                                                        <Input
                                                                            value={ch.bank_name}
                                                                            onChange={(e) => {
                                                                                const next = [...data.guarantor_cheques];
                                                                                next[idx] = { ...next[idx], bank_name: e.target.value };
                                                                                setData('guarantor_cheques', next);
                                                                            }}
                                                                            placeholder="Bank Name"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Cheque No">
                                                                        <Input
                                                                            value={ch.cheque_no}
                                                                            onChange={(e) => {
                                                                                const next = [...data.guarantor_cheques];
                                                                                next[idx] = { ...next[idx], cheque_no: e.target.value };
                                                                                setData('guarantor_cheques', next);
                                                                            }}
                                                                            placeholder="Cheque No"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Qty">
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            step={1}
                                                                            value={ch.qty}
                                                                            onChange={(e) => {
                                                                                const next = [...data.guarantor_cheques];
                                                                                next[idx] = { ...next[idx], qty: e.target.value };
                                                                                setData('guarantor_cheques', next);
                                                                            }}
                                                                            placeholder="Qty"
                                                                        />
                                                                    </FormField>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('nominee')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 6 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('collateral')}
                                            >
                                                Next: Collateral Info
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* COLLATERAL TAB */}
                                    <TabsContent value="collateral" className="mt-0 focus-visible:outline-none">
                                        <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <h2 className="text-lg font-bold text-zinc-900">Collateral / Security Deposits</h2>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                Specify employee security deposits, certificates and collateral details.
                                            </p>
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            <div className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/30 p-5">
                                                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-zinc-700 select-none">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                                        checked={data.collateral.has_certificate}
                                                        onChange={(e) =>
                                                            setData('collateral', { ...data.collateral, has_certificate: e.target.checked })
                                                        }
                                                    />
                                                    <span>Has Certificate Deposit</span>
                                                </label>

                                                {data.collateral.has_certificate && (
                                                    <div className="animate-slide-down space-y-3 border-t border-zinc-100 pt-3">
                                                        <Label className="mb-2 block text-xs font-bold tracking-widest text-zinc-500 uppercase">
                                                            Select Level(s)
                                                        </Label>
                                                        <div className="flex flex-wrap gap-4">
                                                             {(() => {
                                                                 const currentLevels = safeParseCertificateLevels(data.collateral?.certificate_levels);
                                                                 return (
                                                                     [
                                                                         { value: 'ssc', label: 'SSC' },
                                                                         { value: 'hsc', label: 'HSC' },
                                                                         { value: 'honors', label: 'Honors' },
                                                                         { value: 'masters', label: 'Masters' },
                                                                     ] as const
                                                                 ).map(({ value, label }) => (
                                                                     <label
                                                                         key={value}
                                                                         className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600"
                                                                     >
                                                                         <input
                                                                             type="checkbox"
                                                                             className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600"
                                                                             checked={currentLevels.some(
                                                                                 (level) => String(level).toLowerCase() === value,
                                                                             )}
                                                                             onChange={(e) => {
                                                                                 const next = e.target.checked
                                                                                     ? [...currentLevels.filter((level) => String(level).toLowerCase() !== value), value]
                                                                                     : currentLevels.filter((level) => String(level).toLowerCase() !== value);
                                                                                 setData('collateral', { ...data.collateral, certificate_levels: next });
                                                                             }}
                                                                         />
                                                                         <span>{label}</span>
                                                                     </label>
                                                                 ));
                                                             })()}
                                                         </div>
                                                        {errors.certificate_levels && (
                                                            <p className="text-xs font-semibold text-red-500">{errors.certificate_levels}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                <FormField label="Security Amount">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={data.collateral.security_amount}
                                                        onChange={(e) =>
                                                            setData('collateral', { ...data.collateral, security_amount: e.target.value })
                                                        }
                                                        placeholder="Deposit amount"
                                                    />
                                                </FormField>
                                                <FormField label="Collateral Interest">
                                                    <Input
                                                        value={data.collateral.collateral_interest}
                                                        onChange={(e) =>
                                                            setData('collateral', { ...data.collateral, collateral_interest: e.target.value })
                                                        }
                                                        placeholder="e.g. 5%"
                                                    />
                                                </FormField>
                                                <FormField label="Collateral Date">
                                                    <Input
                                                        type="date"
                                                        value={data.collateral.collateral_date}
                                                        onChange={(e) =>
                                                            setData('collateral', { ...data.collateral, collateral_date: e.target.value })
                                                        }
                                                    />
                                                </FormField>
                                                <FormField label="Security Notes" className="sm:col-span-2 lg:col-span-4">
                                                    <Input
                                                        value={data.collateral.notes}
                                                        onChange={(e) => setData('collateral', { ...data.collateral, notes: e.target.value })}
                                                        placeholder="e.g. details of collateral document"
                                                    />
                                                </FormField>
                                            </div>

                                            {/* Collateral Cheques */}
                                            <div className="space-y-4 border-t border-zinc-100 pt-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-zinc-800">Staff's Cheque Information</h3>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8.5 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() =>
                                                            setData('collateral_receive_cheques', [
                                                                ...data.collateral_receive_cheques,
                                                                emptyChequeFormRow(),
                                                            ])
                                                        }
                                                    >
                                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Cheque
                                                    </Button>
                                                </div>

                                                {data.collateral_receive_cheques.length === 0 ? (
                                                    <p className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4 text-xs text-zinc-400 italic">
                                                        No staff cheque information added.
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        {data.collateral_receive_cheques.map((ch, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="relative space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300"
                                                            >
                                                                <div className="flex items-center justify-between border-b border-zinc-50 pb-1.5">
                                                                    <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                                                                        Cheque #{idx + 1}
                                                                    </span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6.5 rounded-lg px-2 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                        onClick={() =>
                                                                            setData(
                                                                                'collateral_receive_cheques',
                                                                                data.collateral_receive_cheques.filter((_, i) => i !== idx),
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="mr-1 h-3 w-3" /> Remove
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                                    <FormField label="Bank Name">
                                                                        <Input
                                                                            value={ch.bank_name}
                                                                            onChange={(e) => {
                                                                                const next = [...data.collateral_receive_cheques];
                                                                                next[idx] = { ...next[idx], bank_name: e.target.value };
                                                                                setData('collateral_receive_cheques', next);
                                                                            }}
                                                                            placeholder="Bank Name"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Cheque No">
                                                                        <Input
                                                                            value={ch.cheque_no}
                                                                            onChange={(e) => {
                                                                                const next = [...data.collateral_receive_cheques];
                                                                                next[idx] = { ...next[idx], cheque_no: e.target.value };
                                                                                setData('collateral_receive_cheques', next);
                                                                            }}
                                                                            placeholder="Cheque No"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Qty">
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            step={1}
                                                                            value={ch.qty}
                                                                            onChange={(e) => {
                                                                                const next = [...data.collateral_receive_cheques];
                                                                                next[idx] = { ...next[idx], qty: e.target.value };
                                                                                setData('collateral_receive_cheques', next);
                                                                            }}
                                                                            placeholder="Qty"
                                                                        />
                                                                    </FormField>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('guarantor')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 7 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('asset')}
                                            >
                                                Next: Assets
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* ASSET TAB */}
                                    <TabsContent value="asset" className="mt-0 focus-visible:outline-none">
                                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <div>
                                                <h2 className="text-lg font-bold text-zinc-900">Assigned Assets</h2>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    Manage physical hardware or equipment assigned to this employee.
                                                </p>
                                            </div>
                                            {data.assets.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() =>
                                                        setData('assets', [
                                                            ...data.assets,
                                                            {
                                                                serial_no: '',
                                                                asset_no: '',
                                                                asset_name: '',
                                                                provided_qty: '',
                                                                asset_price: '',
                                                                asset_details: '',
                                                            },
                                                        ])
                                                    }
                                                >
                                                    <Plus className="mr-1.5 h-4 w-4" /> Add Row
                                                </Button>
                                            )}
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            {data.assets.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/25 px-4 py-12 text-center">
                                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/30">
                                                        <Package className="h-6 w-6" strokeWidth={1.5} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-zinc-900">No Assets Assigned</h3>
                                                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                                                        There are no hardware or company assets currently linked to this employee profile.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-4 h-9 rounded-lg border-emerald-600/30 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() =>
                                                            setData('assets', [
                                                                {
                                                                    serial_no: '',
                                                                    asset_no: '',
                                                                    asset_name: '',
                                                                    provided_qty: '',
                                                                    asset_price: '',
                                                                    asset_details: '',
                                                                },
                                                            ])
                                                        }
                                                    >
                                                        <Plus className="mr-1.5 h-4 w-4" /> Link Asset
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {data.assets.map((as, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-zinc-300"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                                                                <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                                                                    Asset #{idx + 1}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 rounded-lg text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                    onClick={() =>
                                                                        setData(
                                                                            'assets',
                                                                            data.assets.filter((_, i) => i !== idx),
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                                                <FormField label="Serial Number">
                                                                    <Input
                                                                        value={as.serial_no}
                                                                        onChange={(e) => {
                                                                            const next = [...data.assets];
                                                                            next[idx] = { ...next[idx], serial_no: e.target.value };
                                                                            setData('assets', next);
                                                                        }}
                                                                        placeholder="Serial No"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Asset Number">
                                                                    <Input
                                                                        value={as.asset_no}
                                                                        onChange={(e) => {
                                                                            const next = [...data.assets];
                                                                            next[idx] = { ...next[idx], asset_no: e.target.value };
                                                                            setData('assets', next);
                                                                        }}
                                                                        placeholder="Asset Code"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Asset Name" required>
                                                                    <Input
                                                                        value={as.asset_name}
                                                                        onChange={(e) => {
                                                                            const next = [...data.assets];
                                                                            next[idx] = { ...next[idx], asset_name: e.target.value };
                                                                            setData('assets', next);
                                                                        }}
                                                                        placeholder="Item Name"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Provided Qty">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        value={as.provided_qty}
                                                                        onChange={(e) => {
                                                                            const next = [...data.assets];
                                                                            next[idx] = { ...next[idx], provided_qty: e.target.value };
                                                                            setData('assets', next);
                                                                        }}
                                                                        placeholder="Quantity"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Asset Price">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        value={as.asset_price}
                                                                        onChange={(e) => {
                                                                            const next = [...data.assets];
                                                                            next[idx] = { ...next[idx], asset_price: e.target.value };
                                                                            setData('assets', next);
                                                                        }}
                                                                        placeholder="Price (৳)"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Assignment Details" className="sm:col-span-2 lg:col-span-5">
                                                                    <Input
                                                                        value={as.asset_details}
                                                                        onChange={(e) => {
                                                                            const next = [...data.assets];
                                                                            next[idx] = { ...next[idx], asset_details: e.target.value };
                                                                            setData('assets', next);
                                                                        }}
                                                                        placeholder="Describe condition or allocation notes..."
                                                                    />
                                                                </FormField>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('collateral')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 8 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('experience')}
                                            >
                                                Next: Work Experience
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* EXPERIENCE TAB */}
                                    <TabsContent value="experience" className="mt-0 focus-visible:outline-none">
                                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <div>
                                                <h2 className="text-lg font-bold text-zinc-900">Work Experience</h2>
                                                <p className="mt-1 text-xs text-zinc-500">Details of previous professional employment history.</p>
                                            </div>
                                            {data.experiences.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() =>
                                                        setData('experiences', [
                                                            ...data.experiences,
                                                            {
                                                                organization: '',
                                                                from_date: '',
                                                                to_date: '',
                                                                designation: '',
                                                                department: '',
                                                                responsibility: '',
                                                            },
                                                        ])
                                                    }
                                                >
                                                    <Plus className="mr-1.5 h-4 w-4" /> Add Row
                                                </Button>
                                            )}
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            {data.experiences.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/25 px-4 py-12 text-center">
                                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/30">
                                                        <Briefcase className="h-6 w-6" strokeWidth={1.5} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-zinc-900">No Employment History</h3>
                                                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                                                        No prior work experience has been recorded for this employee profile yet.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-4 h-9 rounded-lg border-emerald-600/30 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() =>
                                                            setData('experiences', [
                                                                {
                                                                    organization: '',
                                                                    from_date: '',
                                                                    to_date: '',
                                                                    designation: '',
                                                                    department: '',
                                                                    responsibility: '',
                                                                },
                                                            ])
                                                        }
                                                    >
                                                        <Plus className="mr-1.5 h-4 w-4" /> Add Experience
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {data.experiences.map((exp, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-zinc-300"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                                                                <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                                                                    Experience #{idx + 1}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 rounded-lg text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                    onClick={() =>
                                                                        setData(
                                                                            'experiences',
                                                                            data.experiences.filter((_, i) => i !== idx),
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                                                <FormField label="Organization" required>
                                                                    <Input
                                                                        value={exp.organization}
                                                                        onChange={(e) => {
                                                                            const next = [...data.experiences];
                                                                            next[idx] = { ...next[idx], organization: e.target.value };
                                                                            setData('experiences', next);
                                                                        }}
                                                                        placeholder="Company Name"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Designation">
                                                                    <Input
                                                                        value={exp.designation}
                                                                        onChange={(e) => {
                                                                            const next = [...data.experiences];
                                                                            next[idx] = { ...next[idx], designation: e.target.value };
                                                                            setData('experiences', next);
                                                                        }}
                                                                        placeholder="e.g. Executive"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Department">
                                                                    <Input
                                                                        value={exp.department}
                                                                        onChange={(e) => {
                                                                            const next = [...data.experiences];
                                                                            next[idx] = { ...next[idx], department: e.target.value };
                                                                            setData('experiences', next);
                                                                        }}
                                                                        placeholder="e.g. Sales"
                                                                    />
                                                                </FormField>
                                                                <FormField label="From Date">
                                                                    <Input
                                                                        type="date"
                                                                        value={exp.from_date}
                                                                        onChange={(e) => {
                                                                            const next = [...data.experiences];
                                                                            next[idx] = { ...next[idx], from_date: e.target.value };
                                                                            setData('experiences', next);
                                                                        }}
                                                                    />
                                                                </FormField>
                                                                <FormField label="To Date">
                                                                    <Input
                                                                        type="date"
                                                                        value={exp.to_date}
                                                                        onChange={(e) => {
                                                                            const next = [...data.experiences];
                                                                            next[idx] = { ...next[idx], to_date: e.target.value };
                                                                            setData('experiences', next);
                                                                        }}
                                                                    />
                                                                </FormField>
                                                                <FormField label="Job Responsibilities" className="sm:col-span-2 lg:col-span-5">
                                                                    <Input
                                                                        value={exp.responsibility}
                                                                        onChange={(e) => {
                                                                            const next = [...data.experiences];
                                                                            next[idx] = { ...next[idx], responsibility: e.target.value };
                                                                            setData('experiences', next);
                                                                        }}
                                                                        placeholder="Describe job duties..."
                                                                    />
                                                                </FormField>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('asset')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 9 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('training')}
                                            >
                                                Next: Trainings
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* TRAINING TAB */}
                                    <TabsContent value="training" className="mt-0 focus-visible:outline-none">
                                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <div>
                                                <h2 className="text-lg font-bold text-zinc-900">Training & Certifications</h2>
                                                <p className="mt-1 text-xs text-zinc-500">Add employee professional training programs or courses.</p>
                                            </div>
                                            {data.trainings.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() =>
                                                        setData('trainings', [
                                                            ...data.trainings,
                                                            { training_title: '', institute: '', duration: '', address: '', remarks: '' },
                                                        ])
                                                    }
                                                >
                                                    <Plus className="mr-1.5 h-4 w-4" /> Add Row
                                                </Button>
                                            )}
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            {data.trainings.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/25 px-4 py-12 text-center">
                                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/30">
                                                        <Award className="h-6 w-6" strokeWidth={1.5} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-zinc-900">No Trainings Recorded</h3>
                                                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                                                        No professional training records have been added to this profile yet.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-4 h-9 rounded-lg border-emerald-600/30 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() =>
                                                            setData('trainings', [
                                                                { training_title: '', institute: '', duration: '', address: '', remarks: '' },
                                                            ])
                                                        }
                                                    >
                                                        <Plus className="mr-1.5 h-4 w-4" /> Add Training
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {data.trainings.map((tr, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-zinc-300"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                                                                <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                                                                    Training #{idx + 1}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 rounded-lg text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                    onClick={() =>
                                                                        setData(
                                                                            'trainings',
                                                                            data.trainings.filter((_, i) => i !== idx),
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                                                <FormField label="Training Title" required>
                                                                    <Input
                                                                        value={tr.training_title}
                                                                        onChange={(e) => {
                                                                            const next = [...data.trainings];
                                                                            next[idx] = { ...next[idx], training_title: e.target.value };
                                                                            setData('trainings', next);
                                                                        }}
                                                                        placeholder="Course Name"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Institute">
                                                                    <Input
                                                                        value={tr.institute}
                                                                        onChange={(e) => {
                                                                            const next = [...data.trainings];
                                                                            next[idx] = { ...next[idx], institute: e.target.value };
                                                                            setData('trainings', next);
                                                                        }}
                                                                        placeholder="Institution Name"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Duration">
                                                                    <Input
                                                                        value={tr.duration}
                                                                        onChange={(e) => {
                                                                            const next = [...data.trainings];
                                                                            next[idx] = { ...next[idx], duration: e.target.value };
                                                                            setData('trainings', next);
                                                                        }}
                                                                        placeholder="e.g. 3 Months"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Address">
                                                                    <Input
                                                                        value={tr.address}
                                                                        onChange={(e) => {
                                                                            const next = [...data.trainings];
                                                                            next[idx] = { ...next[idx], address: e.target.value };
                                                                            setData('trainings', next);
                                                                        }}
                                                                        placeholder="Location"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Remarks">
                                                                    <Input
                                                                        value={tr.remarks}
                                                                        onChange={(e) => {
                                                                            const next = [...data.trainings];
                                                                            next[idx] = { ...next[idx], remarks: e.target.value };
                                                                            setData('trainings', next);
                                                                        }}
                                                                        placeholder="Remarks"
                                                                    />
                                                                </FormField>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('experience')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 10 of 11</span>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                onClick={() => requestTabChange('documents')}
                                            >
                                                Next: Attach Documents
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* DOCUMENTS TAB */}
                                    <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
                                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6 md:p-8">
                                            <div>
                                                <h2 className="text-lg font-bold text-zinc-900">Attachments & Documents</h2>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    Upload verified files, identity scans, or academic transcripts.
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-9 rounded-lg border-emerald-600/35 font-semibold text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => setData('documents', [...data.documents, newEmployeeDocumentFormRow('')])}
                                            >
                                                <Plus className="mr-1.5 h-4 w-4" /> Add Doc Row
                                            </Button>
                                        </div>
                                        <div className="space-y-6 p-6 md:p-8">
                                            {data.documents.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/25 px-4 py-12 text-center">
                                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/30">
                                                        <FileText className="h-6 w-6" strokeWidth={1.5} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-zinc-900">No Documents Uploaded</h3>
                                                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                                                        There are no files or attachments currently linked to this profile.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {data.documents.map((doc, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="relative space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-zinc-300"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                                                                <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                                                                    {formatEmployeeDocumentTypeLabel(doc.document_type) || `Document #${idx + 1}`}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 rounded-lg text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                    onClick={() =>
                                                                        setData(
                                                                            'documents',
                                                                            data.documents.filter((_, i) => i !== idx),
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                                <FormField label="Document Type">
                                                                    <ComboSelect
                                                                        value={doc.document_type || null}
                                                                        onChange={(v) => {
                                                                            const next = [...data.documents];
                                                                            next[idx] = { ...next[idx], document_type: v ?? '' };
                                                                            setData('documents', next);
                                                                        }}
                                                                        items={documentTypes.map((t) => ({
                                                                            value: t,
                                                                            label: formatEmployeeDocumentTypeLabel(t),
                                                                        }))}
                                                                        placeholder="Select Type"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Document Title">
                                                                    <Input
                                                                        value={doc.title ?? ''}
                                                                        onChange={(e) => {
                                                                            const next = [...data.documents];
                                                                            next[idx] = { ...next[idx], title: e.target.value };
                                                                            setData('documents', next);
                                                                        }}
                                                                        placeholder="Custom name / description"
                                                                    />
                                                                </FormField>
                                                                <FormField label="Expiry Date">
                                                                    <Input
                                                                        type="date"
                                                                        value={doc.expiry_date}
                                                                        onChange={(e) => {
                                                                            const next = [...data.documents];
                                                                            next[idx] = { ...next[idx], expiry_date: e.target.value };
                                                                            setData('documents', next);
                                                                        }}
                                                                    />
                                                                </FormField>
                                                                <FormField label="Document File" error={errors[`documents.${idx}.file`]}>
                                                                    <div className="mt-0.5 flex items-center gap-2">
                                                                        <label className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 text-xs font-bold text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50">
                                                                            <Upload className="h-4.5 w-4.5 shrink-0" />
                                                                            <span className="max-w-[120px] truncate">
                                                                                {doc.file ? doc.file.name : 'Choose File'}
                                                                            </span>
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                                onChange={(e) => {
                                                                                    const f = e.target.files?.[0] ?? null;
                                                                                    setData(
                                                                                        'documents',
                                                                                        data.documents.map((d, i) =>
                                                                                            i === idx ? { ...d, file: f } : d,
                                                                                        ),
                                                                                    );
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                </FormField>
                                                                <FormField label="Description" className="sm:col-span-2 lg:col-span-4">
                                                                    <Input
                                                                        value={doc.description}
                                                                        onChange={(e) => {
                                                                            const next = [...data.documents];
                                                                            next[idx] = { ...next[idx], description: e.target.value };
                                                                            setData('documents', next);
                                                                        }}
                                                                        placeholder="Optional document comments..."
                                                                    />
                                                                </FormField>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-100 bg-zinc-50/50 p-6">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 rounded-lg px-4 font-semibold"
                                                onClick={() => requestTabChange('training')}
                                            >
                                                Back
                                            </Button>
                                            <span className="text-xs font-semibold text-zinc-400">Step 11 of 11</span>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="h-10 rounded-lg bg-emerald-600 px-6 font-semibold text-white shadow-sm hover:bg-emerald-700"
                                            >
                                                {processing ? 'Creating Profile…' : 'Create Profile'}
                                            </Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Custom Modals */}
            {/* Add Union Modal */}
            <Dialog
                open={addUnionModal.open}
                onOpenChange={(op) => !op && setAddUnionModal({ open: false, target: 'present', name: '', error: '', saving: false })}
            >
                <DialogContent className="rounded-2xl p-6 sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void saveUnionModal(e); }}>
                        <DialogHeader>
                            <DialogTitle className="text-sm font-bold text-zinc-900">Add New Union</DialogTitle>
                        </DialogHeader>
                        <div className="my-2 space-y-4">
                            <FormField label="Union Name" error={addUnionModal.error}>
                                <Input
                                    value={addUnionModal.name}
                                    onChange={(e) => setAddUnionModal((s) => ({ ...s, name: e.target.value, error: '' }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void saveUnionModal(e);
                                        }
                                    }}
                                    placeholder="Type union name"
                                    autoFocus
                                />
                            </FormField>
                        </div>
                        <DialogFooter className="mt-4 gap-2 border-t border-zinc-50 pt-4 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-lg text-xs"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAddUnionModal({ open: false, target: 'present', name: '', error: '', saving: false }); }}
                                disabled={addUnionModal.saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="h-9 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                disabled={!addUnionModal.name.trim() || addUnionModal.saving}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void saveUnionModal(e); }}
                            >
                                {addUnionModal.saving ? 'Saving…' : 'Save Union'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Village Modal */}
            <Dialog
                open={addVillageModal.open}
                onOpenChange={(op) => !op && setAddVillageModal({ open: false, target: 'present', name: '', error: '', saving: false })}
            >
                <DialogContent className="rounded-2xl p-6 sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void saveVillageModal(e); }}>
                        <DialogHeader>
                            <DialogTitle className="text-sm font-bold text-zinc-900">Add New Village</DialogTitle>
                        </DialogHeader>
                        <div className="my-2 space-y-4">
                            <FormField label="Village Name" error={addVillageModal.error}>
                                <Input
                                    value={addVillageModal.name}
                                    onChange={(e) => setAddVillageModal((s) => ({ ...s, name: e.target.value, error: '' }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void saveVillageModal(e);
                                        }
                                    }}
                                    placeholder="Type village name"
                                    autoFocus
                                />
                            </FormField>
                        </div>
                        <DialogFooter className="mt-4 gap-2 border-t border-zinc-50 pt-4 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-lg text-xs"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAddVillageModal({ open: false, target: 'present', name: '', error: '', saving: false }); }}
                                disabled={addVillageModal.saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="h-9 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                disabled={!addVillageModal.name.trim() || addVillageModal.saving}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void saveVillageModal(e); }}
                            >
                                {addVillageModal.saving ? 'Saving…' : 'Save Village'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
