import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    EMPLOYEE_V2_EDIT_DRAFT_PREFIX,
    applyUnifiedNidSmartFields,
    asInputPatch,
    clearEmployeeDraft,
    combinedNidOrSmartCardDisplay,
    formatEmployeeDocumentTypeLabel,
    getNidOrSmartCardClientError,
    hasPatchKeys,
    hydrateEmployeeDocumentRowsForForm,
    loadEmployeeDraft,
    mergeSerializableIntoForm,
    newEmployeeDocumentFormRow,
    saveEmployeeDraft,
    toSerializableEmployeeForm,
} from '@/lib/employee-v2-form-persist';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react';
import { format, isValid, parse, parseISO } from 'date-fns';
import {
    EmployeeSalaryAssignment,
    type PayrollGradeOption,
    type PayrollPayscaleOption,
    type PayrollStepOption,
} from '@/components/employee/EmployeeSalaryAssignment';

const DISPLAY_DATE_FMT = 'dd-MM-yyyy';
const SERVER_DATE_FMT = 'yyyy-MM-dd';

/** Values from API/drafts may be ISO, `Y-m-d`, or already `dd-MM-yyyy`. */
function toFormDisplayDate(value: unknown): string {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (!s) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
    const datePart = s.includes('T') ? (s.split('T')[0] ?? s) : s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const d = parse(datePart, SERVER_DATE_FMT, new Date());
        return isValid(d) ? format(d, DISPLAY_DATE_FMT) : '';
    }
    const iso = parseISO(s);
    if (isValid(iso)) return format(iso, DISPLAY_DATE_FMT);
    const slash = parse(s, 'dd/MM/yyyy', new Date());
    if (isValid(slash)) return format(slash, DISPLAY_DATE_FMT);
    return '';
}

function displayDateToServer(value: unknown): string {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = parse(s, DISPLAY_DATE_FMT, new Date());
    return isValid(d) ? format(d, SERVER_DATE_FMT) : '';
}

function parseFormDateValue(raw: unknown): Date | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const d = parse(s, DISPLAY_DATE_FMT, new Date());
        return isValid(d) ? d : null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = parse(s, SERVER_DATE_FMT, new Date());
        return isValid(d) ? d : null;
    }
    const iso = parseISO(s.includes('T') ? s : `${s}T00:00:00`);
    return isValid(iso) ? iso : null;
}

/** Repeatable “multiple add” rows: stacked on small screens, one horizontal row on large screens */
const RF_ROW = 'flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-end lg:gap-2 lg:overflow-x-auto lg:pb-0.5';
const RF_ROW_TOP = 'flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-start lg:gap-2 lg:overflow-x-auto lg:pb-0.5';
const RF_ROW_CTR = 'flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-2 lg:overflow-x-auto lg:pb-0.5';
const RF_CELL = 'min-w-0 flex-1 space-y-1';

function getCsrfTokenFromPage(): string {
    const el = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    return el?.content?.trim() ?? '';
}

type LocationUnion = { name: string; type: string; villages: string[] };

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
    pin?: string;
    name_en?: string;
    name_bn?: string;
    current_branch_id?: number;
    employee_type_id?: number | null;
    gender?: string;
    religion?: string;
    marital_status?: string;
    spouse_name?: string;
    spouse_mobile?: string;
    birth_date_certificate?: string;
    birth_date_original?: string;
    date_of_birth?: string;
    blood_group?: string;
    joining_date?: string;
    confirmation_date?: string;
    fathers_name?: string;
    fathers_mobile?: string;
    mothers_name?: string;
    mothers_mobile?: string;
    department_id?: number;
    joining_designation_id?: number;
    last_designation_id?: number;
    program_id?: number | null;
    project_id?: number | null;
    payscale_id?: number | null;
    salary_grade_id?: number | null;
    salary_step_id?: number | null;
    basic_salary?: string | number | null;
    nid?: string;
    smart_card_number?: string;
    birth_registration_number?: string;
    tin_certificate_no?: string;
    driving_license_no?: string;
    passport_no?: string;
    is_project_employee?: boolean;
    is_custodian?: boolean;
    identification_mark?: string;
    email?: string;
    email_id?: string;
    phone?: string;
    mobile_personal?: string;
    mobile_official?: string;
    photo?: string | null;
    signature?: string | null;

    addresses?: any[];
    educations?: any[];
    bank?: any;
    nominees?: any[];
    guarantors?: any[];
    guarantor_cheques?: any[];
    collateral?: any;
    collateral_receive_cheques?: any[];
    assets?: any[];
    experiences?: any[];
    trainings?: any[];
    documents?: any[];
}

type EmployeeEditFormData = any;

function withHydratedEditDocuments(form: EmployeeEditFormData): EmployeeEditFormData {
    return { ...form, documents: hydrateEmployeeDocumentRowsForForm(form.documents ?? []) };
}

function normalizeEditFormDisplayDates(form: EmployeeEditFormData): EmployeeEditFormData {
    const out = { ...form };
    out.birth_date_certificate = toFormDisplayDate(form.birth_date_certificate);
    out.birth_date_original = toFormDisplayDate(form.birth_date_original);
    out.date_of_birth = toFormDisplayDate(form.date_of_birth);
    out.joining_date = toFormDisplayDate(form.joining_date);
    out.confirmation_date = toFormDisplayDate(form.confirmation_date);
    out.nominees = (form.nominees ?? []).map((n: any) => ({
        ...n,
        date_of_birth: toFormDisplayDate(n.date_of_birth),
    }));
    out.collateral = {
        ...(form.collateral ?? {}),
        collateral_date: toFormDisplayDate(form.collateral?.collateral_date),
    };
    out.experiences = (form.experiences ?? []).map((ex: any) => ({
        ...ex,
        from_date: toFormDisplayDate(ex.from_date),
        to_date: toFormDisplayDate(ex.to_date),
    }));
    out.documents = (form.documents ?? []).map((doc: any) => ({
        ...doc,
        expiry_date: toFormDisplayDate(doc.expiry_date),
    }));
    return out;
}

function transformSubmitDates(form: EmployeeEditFormData): EmployeeEditFormData {
    const out = { ...form };
    out.birth_date_certificate = displayDateToServer(form.birth_date_certificate);
    out.birth_date_original = displayDateToServer(form.birth_date_original);
    out.date_of_birth = displayDateToServer(form.date_of_birth);
    out.joining_date = displayDateToServer(form.joining_date);
    out.confirmation_date = displayDateToServer(form.confirmation_date);
    out.nominees = (form.nominees ?? []).map((n: any) => ({
        ...n,
        date_of_birth: displayDateToServer(n.date_of_birth),
    }));
    out.collateral = {
        ...(form.collateral ?? {}),
        collateral_date: displayDateToServer(form.collateral?.collateral_date),
    };
    out.experiences = (form.experiences ?? []).map((ex: any) => ({
        ...ex,
        from_date: displayDateToServer(ex.from_date),
        to_date: displayDateToServer(ex.to_date),
    }));
    out.documents = (form.documents ?? []).map((doc: any) => ({
        ...doc,
        expiry_date: displayDateToServer(doc.expiry_date),
    }));
    return out;
}

function finalizeEmployeeEditForm(form: EmployeeEditFormData): EmployeeEditFormData {
    return normalizeEditFormDisplayDates(withHydratedEditDocuments(form));
}

function employeeToFormBase(employee: Employee): EmployeeEditFormData {
    const base = {
        _method: 'PUT',
        current_branch_id: employee.current_branch_id ? String(employee.current_branch_id) : '',
        employee_type_id: employee.employee_type_id ? String(employee.employee_type_id) : '',
        pin: employee.pin || '',
        name_en: employee.name_en || '',
        name_bn: employee.name_bn || '',
        gender: employee.gender || '',
        religion: employee.religion || '',
        marital_status: employee.marital_status || '',
        spouse_name: employee.spouse_name || '',
        spouse_mobile: employee.spouse_mobile || '',
        birth_date_certificate: (employee.birth_date_certificate as any) || '',
        birth_date_original: (employee.birth_date_original as any) || '',
        date_of_birth: (employee.date_of_birth as any) || '',
        blood_group: employee.blood_group || '',
        joining_date: employee.joining_date || format(new Date(), DISPLAY_DATE_FMT),
        confirmation_date: employee.confirmation_date || '',
        fathers_name: employee.fathers_name || '',
        fathers_mobile: employee.fathers_mobile || '',
        mothers_name: employee.mothers_name || '',
        mothers_mobile: employee.mothers_mobile || '',
        department_id: employee.department_id ? String(employee.department_id) : '',
        joining_designation_id: employee.joining_designation_id ? String(employee.joining_designation_id) : '',
        last_designation_id: employee.last_designation_id ? String(employee.last_designation_id) : '',
        program_id: employee.program_id ? String(employee.program_id) : '',
        project_id: employee.project_id ? String(employee.project_id) : '',
        payscale_id: employee.payscale_id ? String(employee.payscale_id) : '',
        salary_grade_id: employee.salary_grade_id ? String(employee.salary_grade_id) : '',
        salary_step_id: employee.salary_step_id ? String(employee.salary_step_id) : '',
        basic_salary:
            employee.basic_salary != null && employee.basic_salary !== ''
                ? String(employee.basic_salary)
                : '',
        nid: combinedNidOrSmartCardDisplay(employee.nid, employee.smart_card_number)
            .replace(/\D/g, '')
            .slice(0, 17),
        smart_card_number: '',
        birth_registration_number: employee.birth_registration_number || '',
        tin_certificate_no: employee.tin_certificate_no || '',
        driving_license_no: employee.driving_license_no || '',
        passport_no: employee.passport_no || '',
        is_project_employee: !!employee.is_project_employee,
        is_custodian: !!employee.is_custodian,
        identification_mark: employee.identification_mark || '',
        email: employee.email || '',
        email_id: employee.email_id || '',
        phone: employee.phone || '',
        mobile_personal: employee.mobile_personal || '',
        mobile_official: employee.mobile_official || '',
        photo: null,
        signature: null,
        addresses:
            (employee.addresses as any[])?.length > 0
                ? (employee.addresses as any[]).map((a) => ({
                      type: a.type,
                      division: a.division ?? '',
                      district: a.district ?? '',
                      upazila: a.upazila ?? '',
                      union: a.union ?? '',
                      village: a.village ?? '',
                      address_details: a.address_details ?? '',
                  }))
                : [
                      { type: 'present', division: '', district: '', upazila: '', union: '', village: '', address_details: '' },
                      { type: 'permanent', division: '', district: '', upazila: '', union: '', village: '', address_details: '' },
                  ],
        educations: (employee.educations as any[]) ?? [],
        bank: employee.bank ?? { bank_name: '', branch_name: '', account_no: '', account_type: '', bank_address: '', remark: '' },
        nominees: (employee.nominees as any[]) ?? [],
        guarantors: (employee.guarantors as any[]) ?? [],
        guarantor_cheques: (employee.guarantor_cheques as any[]) ?? [],
        collateral: employee.collateral ?? { has_certificate: false, certificate_levels: [], security_amount: '', collateral_interest: '', collateral_date: '', notes: '' },
        collateral_receive_cheques: (employee.collateral_receive_cheques as any[]) ?? [],
        assets: (employee.assets as any[]) ?? [],
        experiences: (employee.experiences as any[]) ?? [],
        trainings: (employee.trainings as any[]) ?? [],
        documents: hydrateEmployeeDocumentRowsForForm((employee as any).documents ?? []),
    };
    return base;
}

function flattenEmployeeFormErrors(err: Record<string, string | undefined>): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(err)) {
        if (!v || k === 'submit') continue;
        const label = k.replace(/\./g, ' › ');
        out.push(`${label}: ${v}`);
    }
    return out;
}

function errorFieldKeyToEmployeeEditTab(key: string): string {
    if (key === 'payscale_id' || key === 'salary_grade_id' || key === 'salary_step_id' || key === 'basic_salary') {
        return 'salary';
    }
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

function inferFirstTabFromEmployeeErrors(err: Record<string, string | undefined>): string | null {
    const keys = Object.keys(err).filter((k) => err[k] && k !== 'submit');
    if (keys.length === 0) return null;
    const tabOrder = ['general', 'education', 'salary', 'bank', 'nominee', 'guarantor', 'collateral', 'asset', 'experience', 'training', 'documents'];
    let best: string | null = null;
    let bestIdx = Infinity;
    for (const k of keys) {
        const tab = errorFieldKeyToEmployeeEditTab(k);
        const idx = tabOrder.indexOf(tab);
        if (idx >= 0 && idx < bestIdx) {
            bestIdx = idx;
            best = tab;
        }
    }
    return best;
}

function buildInitialEditForm(employee: Employee, oldInput: unknown, allowDraft: boolean): EmployeeEditFormData {
    const base = employeeToFormBase(employee);
    const fromServer = asInputPatch(oldInput);
    if (hasPatchKeys(fromServer)) {
        return finalizeEmployeeEditForm(
            applyUnifiedNidSmartFields(mergeSerializableIntoForm(base, fromServer) as unknown as Record<string, unknown>) as EmployeeEditFormData
        );
    }
    if (allowDraft) {
        const fromDraft = loadEmployeeDraft(`${EMPLOYEE_V2_EDIT_DRAFT_PREFIX}${employee.id}`);
        if (fromDraft) {
            return finalizeEmployeeEditForm(
                applyUnifiedNidSmartFields(mergeSerializableIntoForm(base, fromDraft as Record<string, unknown>) as unknown as Record<string, unknown>) as EmployeeEditFormData
            );
        }
    }
    return finalizeEmployeeEditForm(applyUnifiedNidSmartFields(base as unknown as Record<string, unknown>) as EmployeeEditFormData);
}

interface EmployeeEditProps {
    employee: Employee;
    departments: Department[];
    designations: Designation[];
    branches: Branch[];
    managers: Employee[];
    statuses: string[];
    employeeTypes: { id: number; name: string; probation_months: number }[];
    programs: { id: number; name: string; type: 'core' | 'project' }[];
    projects: { id: number; name: string }[];
    banks: string[];
    relations: string[];
    educationBoards: string[];
    locations: any;
    defaultBankName: string;
    documentTypes: string[];
    payscales: PayrollPayscaleOption[];
    payrollGrades: PayrollGradeOption[];
    payrollSteps: PayrollStepOption[];
    oldInput?: Record<string, unknown>;
    errors?: {
        [key: string]: string;
    };
}

export default function EmployeeEdit({
    employee,
    departments,
    designations,
    branches,
    managers,
    statuses,
    employeeTypes,
    programs,
    projects,
    banks,
    relations,
    educationBoards,
    locations,
    defaultBankName,
    documentTypes = [],
    payscales = [],
    payrollGrades = [],
    payrollSteps = [],
    oldInput,
    errors: errorsProp = {},
}: EmployeeEditProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string; warning?: string } }>().props;
    const editDraftKey = `${EMPLOYEE_V2_EDIT_DRAFT_PREFIX}${employee.id}`;
    const initialForm = useMemo(
        () => buildInitialEditForm(employee, oldInput, !flash?.success),
        [employee, oldInput, flash?.success],
    );
    const { data, setData, post, transform, processing, errors: formErrors } = useForm(initialForm);

    useEffect(() => {
        transform((payload) => transformSubmitDates(payload as EmployeeEditFormData));
    }, [transform]);

    const errors = { ...errorsProp, ...formErrors } as Record<string, string | undefined>;
    const submitError = errors['submit'];
    const validationMessages = useMemo(() => flattenEmployeeFormErrors(errors), [errors]);

    const nidOrSmartClientError = useMemo(() => getNidOrSmartCardClientError(data.nid), [data.nid]);

    useEffect(() => {
        if (!flash?.success) return;
        clearEmployeeDraft(editDraftKey);
        const next = finalizeEmployeeEditForm(employeeToFormBase(employee));
        setData({ ...next, photo: null, signature: null });
    }, [flash?.success, employee.id, employee.payscale_id, employee.salary_grade_id, employee.salary_step_id, employee.basic_salary, editDraftKey, setData]);

    const lastServerOldJson = useRef<string | null>(null);
    useEffect(() => {
        const patch = asInputPatch(oldInput);
        if (!hasPatchKeys(patch)) {
            lastServerOldJson.current = null;
            return;
        }
        const json = JSON.stringify(patch);
        if (lastServerOldJson.current === json) return;
        lastServerOldJson.current = json;
        const next = applyUnifiedNidSmartFields(mergeSerializableIntoForm(employeeToFormBase(employee), patch) as unknown as Record<string, unknown>) as any;
        setData({ ...finalizeEmployeeEditForm(next), photo: null, signature: null });
    }, [oldInput, setData, employee]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            saveEmployeeDraft(editDraftKey, toSerializableEmployeeForm(data as any));
        }, 450);
        return () => window.clearTimeout(handle);
    }, [data, editDraftKey]);

    const [activeTab, setActiveTab] = useState('general');
    const [photoPreview, setPhotoPreview] = useState<string | null>(employee.photo ? `/storage/${employee.photo}` : null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(employee.signature ? `/storage/${employee.signature}` : null);
    const [addVillageModal, setAddVillageModal] = useState<{
        open: boolean;
        target: 'present' | 'permanent';
        name: string;
        error: string;
        saving: boolean;
    }>({
        open: false,
        target: 'present',
        name: '',
        error: '',
        saving: false,
    });

    useEffect(() => {
        if (!data.bank?.bank_name) {
            setData('bank', { ...data.bank, bank_name: defaultBankName });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const branchItems: ComboSelectItem<string>[] = branches.map((b) => {
        const code = (b.branch_code ?? '').trim();
        const label = code ? `${b.name} (${code})` : b.name;
        return { value: String(b.id), label, keywords: `${b.name} ${code}`.trim() };
    });
    const bankBranchItems: ComboSelectItem<string>[] = useMemo(
        () =>
            branches.map((b) => {
                const code = (b.branch_code ?? '').trim();
                const label = code ? `${b.name} (${code})` : b.name;
                return { value: label, label, keywords: `${b.name} ${code}`.trim() };
            }),
        [branches],
    );
    const deptItems: ComboSelectItem<string>[] = departments.map((d) => ({ value: String(d.id), label: d.name }));
    const desigItems: ComboSelectItem<string>[] = designations.map((d) => ({ value: String(d.id), label: d.name }));
    const employeeTypeItems: ComboSelectItem<string>[] = employeeTypes.map((t) => ({ value: String(t.id), label: t.name, keywords: `probation ${t.probation_months}` }));
    const programItems: ComboSelectItem<string>[] = programs.map((p) => ({ value: String(p.id), label: p.name, keywords: p.type }));
    const projectItems: ComboSelectItem<string>[] = projects.map((p) => ({ value: String(p.id), label: p.name }));
    const religionItems: ComboSelectItem<string>[] = [
        { value: 'Islam', label: 'Islam' },
        { value: 'Hindu', label: 'Hindu' },
        { value: 'Christian', label: 'Christian' },
        { value: 'Buddhist', label: 'Buddhist' },
        { value: 'Sikh', label: 'Sikh' },
        { value: 'Jain', label: 'Jain' },
        { value: 'Other', label: 'Other' },
    ];

    const divisionItems: ComboSelectItem<string>[] = (locations?.divisions ?? []).map((d: string) => ({ value: d, label: d }));
    const districtItems: ComboSelectItem<string>[] = ((locations?.districts?.[data.addresses?.[0]?.division] ?? []) as string[]).map((d) => ({ value: d, label: d }));
    const upazilaItems: ComboSelectItem<string>[] = ((locations?.upazilas?.[data.addresses?.[0]?.district] ?? []) as string[]).map((u) => ({ value: u, label: u }));
    const [extraVillages, setExtraVillages] = useState<Record<string, string[]>>({});
    const presentUnions = useMemo(() => {
        return ((locations?.unions?.[data.addresses?.[0]?.upazila] ?? []) as LocationUnion[]) || [];
    }, [locations, data.addresses]);
    const presentUnionItems: ComboSelectItem<string>[] = useMemo(
        () => presentUnions.map((u) => ({ value: u.name, label: u.name, keywords: u.type })),
        [presentUnions]
    );
    const presentSelectedUnion = useMemo(() => {
        const name = data.addresses?.[0]?.union || '';
        return presentUnions.find((u) => u.name === name) ?? null;
    }, [data.addresses, presentUnions]);
    const presentVillageItems: ComboSelectItem<string>[] = useMemo(() => {
        const base = presentSelectedUnion?.villages ?? [];
        const key = `p:${data.addresses?.[0]?.upazila || ''}:${data.addresses?.[0]?.union || ''}`;
        const extra = extraVillages[key] ?? [];
        const merged = Array.from(new Set([...base, ...extra]));
        const selected = (data.addresses?.[0]?.village ?? '').trim();
        if (selected && !merged.includes(selected)) merged.push(selected);
        return merged.map((v) => ({ value: v, label: v }));
    }, [presentSelectedUnion, extraVillages, data.addresses]);

    const permDistrictItems: ComboSelectItem<string>[] = ((locations?.districts?.[data.addresses?.[1]?.division] ?? []) as string[]).map((d) => ({ value: d, label: d }));
    const permUpazilaItems: ComboSelectItem<string>[] = ((locations?.upazilas?.[data.addresses?.[1]?.district] ?? []) as string[]).map((u) => ({ value: u, label: u }));
    const permUnions = useMemo(() => {
        return ((locations?.unions?.[data.addresses?.[1]?.upazila] ?? []) as LocationUnion[]) || [];
    }, [locations, data.addresses]);
    const permUnionItems: ComboSelectItem<string>[] = useMemo(
        () => permUnions.map((u) => ({ value: u.name, label: u.name, keywords: u.type })),
        [permUnions]
    );
    const permSelectedUnion = useMemo(() => {
        const name = data.addresses?.[1]?.union || '';
        return permUnions.find((u) => u.name === name) ?? null;
    }, [data.addresses, permUnions]);
    const permVillageItems: ComboSelectItem<string>[] = useMemo(() => {
        const base = permSelectedUnion?.villages ?? [];
        const key = `r:${data.addresses?.[1]?.upazila || ''}:${data.addresses?.[1]?.union || ''}`;
        const extra = extraVillages[key] ?? [];
        const merged = Array.from(new Set([...base, ...extra]));
        const selected = (data.addresses?.[1]?.village ?? '').trim();
        if (selected && !merged.includes(selected)) merged.push(selected);
        return merged.map((v) => ({ value: v, label: v }));
    }, [permSelectedUnion, extraVillages, data.addresses]);

    const isSpouseRequired = ['Married', 'Widowed', 'Separated'].includes(data.marital_status);

    const selectedEmployeeType = useMemo(() => {
        const id = Number(data.employee_type_id || 0);
        return employeeTypes.find((t) => t.id === id) ?? null;
    }, [data.employee_type_id, employeeTypes]);

    const derivedProbationMonths = selectedEmployeeType?.probation_months ?? 0;

    const derivedAge = useMemo(() => {
        const raw = data.birth_date_original || data.birth_date_certificate;
        const d = parseFormDateValue(raw);
        if (!d) return '';
        const today = new Date();
        let years = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years -= 1;
        return years >= 0 ? String(years) : '';
    }, [data.birth_date_certificate, data.birth_date_original]);

    const [sameAsPermanent, setSameAsPermanent] = useState(false);
    const sameAsPermanentRef = useRef(false);
    sameAsPermanentRef.current = sameAsPermanent;

    const canOpenVillageModal = (target: 'present' | 'permanent') => {
        const idx = target === 'present' ? 0 : 1;
        const a = data.addresses?.[idx];
        return !!(a?.division && a?.district && a?.upazila && a?.union);
    };

    const buildAddressDetails = (a: any) => {
        const parts = [a?.village, a?.union, a?.upazila, a?.district, a?.division].filter(Boolean);
        return parts.join(', ');
    };

    const setPresentAddress = (patch: Record<string, any>) => {
        const next = [...data.addresses];
        next[0] = { ...next[0], ...patch };
        next[0] = { ...next[0], address_details: buildAddressDetails(next[0]) };
        setData('addresses', next);
    };

    const setPermanentAddress = (patch: Record<string, any>) => {
        const next = [...data.addresses];
        next[1] = { ...next[1], ...patch };
        next[1] = { ...next[1], address_details: buildAddressDetails(next[1]) };
        if (sameAsPermanentRef.current) {
            next[0] = { ...next[0], ...next[1], type: 'present' };
            next[0] = { ...next[0], address_details: buildAddressDetails(next[0]) };
        }
        setData('addresses', next);
    };

    const persistVillage = async (target: 'present' | 'permanent', nameRaw: string): Promise<{ ok: boolean; error?: string }> => {
        const idx = target === 'present' ? 0 : 1;
        const division = data.addresses?.[idx]?.division || '';
        const district = data.addresses?.[idx]?.district || '';
        const upazila = data.addresses?.[idx]?.upazila || '';
        const union = data.addresses?.[idx]?.union || '';
        const name = nameRaw.trim();
        if (!division || !district || !upazila || !union || !name) {
            return { ok: false, error: 'Division, district, upazila, union, and village name are required.' };
        }
        const csrf = getCsrfTokenFromPage();
        if (!csrf) {
            return { ok: false, error: 'Security token missing. Refresh the page and try again.' };
        }
        try {
            const res = await fetch(route('employees.villages.store'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                body: JSON.stringify({ _token: csrf, division, district, upazila, union, name }),
            });
            const raw = await res.text();
            let j: Record<string, unknown> = {};
            try {
                j = JSON.parse(raw) as Record<string, unknown>;
            } catch {
                j = {};
            }
            if (!res.ok) {
                const msgFromServer =
                    (typeof j.message === 'string' && j.message) ||
                    (j.errors && typeof j.errors === 'object'
                        ? Object.values(j.errors as Record<string, string[]>)
                              .flat()
                              .filter(Boolean)
                              .join(' ')
                        : '') ||
                    (res.status === 419 ? 'Session expired (CSRF). Refresh the page and try again.' : '') ||
                    (res.status === 403 ? 'You do not have permission to add villages.' : '') ||
                    `Request failed (${res.status}).`;
                return { ok: false, error: msgFromServer };
            }
            const createdName = (typeof j.name === 'string' && j.name) || name;
            const key = `${target === 'present' ? 'p' : 'r'}:${upazila}:${union}`;
            setExtraVillages((prev) => {
                const arr = prev[key] ?? [];
                return { ...prev, [key]: Array.from(new Set([...arr, createdName])) };
            });
            if (target === 'present') setPresentAddress({ village: createdName });
            else setPermanentAddress({ village: createdName });
            return { ok: true };
        } catch {
            return { ok: false, error: 'Network error. Check your connection and try again.' };
        }
    };

    const openAddVillageModal = (target: 'present' | 'permanent') => {
        if (!canOpenVillageModal(target)) return;
        setAddVillageModal({ open: true, target, name: '', error: '', saving: false });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const nidErr = getNidOrSmartCardClientError(data.nid);
        if (nidErr) {
            setActiveTab('general');
            return;
        }
        post(route('employees.update', employee.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                clearEmployeeDraft(editDraftKey);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onError: (errs) => {
                const tab = inferFirstTabFromEmployeeErrors(errs as Record<string, string | undefined>);
                if (tab) setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    return (
        <Layout>
            <Head title={`Edit Employee: ${employee.name_en || employee.pin || employee.id}`} />
            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('employees.index')} className="flex w-fit items-center text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span>Back to Employees</span>
                    </Link>
                </div>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
                    <p className="mt-1 text-gray-500">Update employee details</p>
                </div>

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-950">
                        <AlertTitle>Saved</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {flash?.error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                {submitError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Could not save</AlertTitle>
                        <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                )}

                {validationMessages.length > 0 && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Please fix the following</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                                {validationMessages.map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-6 grid w-full grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
                            <TabsTrigger value="general">General Setup</TabsTrigger>
                            <TabsTrigger value="education">Educational</TabsTrigger>
                            <TabsTrigger value="salary">Salary</TabsTrigger>
                            <TabsTrigger value="bank">Bank</TabsTrigger>
                            <TabsTrigger value="nominee">Nominee</TabsTrigger>
                            <TabsTrigger value="guarantor">Guarantor</TabsTrigger>
                            <TabsTrigger value="collateral">Collateral</TabsTrigger>
                            <TabsTrigger value="asset">Org. Asset</TabsTrigger>
                            <TabsTrigger value="experience">Experience</TabsTrigger>
                            <TabsTrigger value="training">Training</TabsTrigger>
                            <TabsTrigger value="documents">Documents</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">General Setup</CardTitle>
                                    <CardDescription className="text-xs">Edit identity, org, address and uploads</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 text-sm">
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                        {/* Left column */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Branch Name *</Label>
                                                <ComboSelect value={data.current_branch_id || null} onChange={(v) => setData('current_branch_id', v ?? '')} items={branchItems} placeholder="Select branch" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Employment Type</Label>
                                                <ComboSelect value={data.employee_type_id || null} onChange={(v) => setData('employee_type_id', v ?? '')} items={employeeTypeItems} placeholder="Select employment type" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Employee Pin *</Label>
                                                <Input value={data.pin} onChange={(e) => setData('pin', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Employee Name *</Label>
                                                <Input value={data.name_en} onChange={(e) => setData('name_en', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Bengali Name</Label>
                                                <Input value={data.name_bn} onChange={(e) => setData('name_bn', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Gender</Label>
                                                <ComboSelect value={data.gender || null} onChange={(v) => setData('gender', v ?? '')} items={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} placeholder="Select gender" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Religion</Label>
                                                <ComboSelect value={data.religion || null} onChange={(v) => setData('religion', v ?? '')} items={religionItems} placeholder="Select religion" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Marital Status</Label>
                                                <ComboSelect
                                                    value={data.marital_status || null}
                                                    onChange={(v) => setData('marital_status', v ?? '')}
                                                    items={[
                                                        { value: 'Single', label: 'Single' },
                                                        { value: 'Never Married', label: 'Never Married' },
                                                        { value: 'Unmarried', label: 'Unmarried' },
                                                        { value: 'Separated', label: 'Separated' },
                                                        { value: 'Divorced', label: 'Divorced' },
                                                        { value: 'Widowed', label: 'Widowed' },
                                                        { value: 'Married', label: 'Married' },
                                                    ]}
                                                    placeholder="Select Status"
                                                />
                                            </div>
                                            {isSpouseRequired && (
                                                <>
                                                    <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                        <Label className="pt-2 text-xs">Spouse Name *</Label>
                                                        <Input value={data.spouse_name} onChange={(e) => setData('spouse_name', e.target.value)} />
                                                    </div>
                                                    <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                        <Label className="pt-2 text-xs">Spouse Contact *</Label>
                                                        <Input value={data.spouse_mobile} onChange={(e) => setData('spouse_mobile', e.target.value)} />
                                                    </div>
                                                </>
                                            )}
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Birth Date (Certificate)</Label>
                                                <Input
                                                    placeholder={DISPLAY_DATE_FMT}
                                                    autoComplete="off"
                                                    value={data.birth_date_certificate}
                                                    onChange={(e) => setData('birth_date_certificate', e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Birth Date (Original)</Label>
                                                <Input
                                                    placeholder={DISPLAY_DATE_FMT}
                                                    autoComplete="off"
                                                    value={data.birth_date_original}
                                                    onChange={(e) => setData('birth_date_original', e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Age</Label>
                                                <Input value={derivedAge} readOnly className="bg-gray-100" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Blood Group</Label>
                                                <ComboSelect value={data.blood_group || null} onChange={(v) => setData('blood_group', v ?? '')} items={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => ({ value: b, label: b }))} placeholder="Select blood group" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Joining Date *</Label>
                                                <Input
                                                    placeholder={DISPLAY_DATE_FMT}
                                                    autoComplete="off"
                                                    value={data.joining_date}
                                                    onChange={(e) => setData('joining_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Probation Period</Label>
                                                <Input value={derivedProbationMonths ? `${derivedProbationMonths} months` : ''} readOnly className="bg-gray-100" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Confirmation Date</Label>
                                                <Input
                                                    placeholder={DISPLAY_DATE_FMT}
                                                    autoComplete="off"
                                                    value={data.confirmation_date}
                                                    onChange={(e) => setData('confirmation_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Department *</Label>
                                                <ComboSelect value={data.department_id || null} onChange={(v) => setData('department_id', v ?? '')} items={deptItems} placeholder="Select department" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Designation *</Label>
                                                <ComboSelect value={data.joining_designation_id || null} onChange={(v) => setData('joining_designation_id', v ?? '')} items={desigItems} placeholder="Select designation" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Program</Label>
                                                <ComboSelect value={data.program_id || null} onChange={(v) => setData('program_id', v ?? '')} items={programItems} placeholder="Core" />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Project</Label>
                                                <ComboSelect value={data.project_id || null} onChange={(v) => setData('project_id', v ?? '')} items={projectItems} placeholder="Project" />
                                            </div>
                                        </div>

                                        {/* Middle column */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">National ID or Smart Card</Label>
                                                <div className="space-y-1">
                                                    <Input
                                                        inputMode="numeric"
                                                        autoComplete="off"
                                                        maxLength={17}
                                                        aria-invalid={!!(errors.nid || errors.smart_card_number || nidOrSmartClientError)}
                                                        value={data.nid || ''}
                                                        onChange={(e) => {
                                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 17);
                                                            setData('nid', digits);
                                                        }}
                                                        placeholder="10, 13, or 17 digits"
                                                        className={
                                                            errors.nid || errors.smart_card_number || nidOrSmartClientError
                                                                ? 'border-destructive focus-visible:ring-destructive/25'
                                                                : undefined
                                                        }
                                                    />
                                                    <p className="text-[11px] text-muted-foreground">Digits only: 10, 13, or 17 characters.</p>
                                                    {(errors.nid || errors.smart_card_number || nidOrSmartClientError) && (
                                                        <p className="text-xs text-destructive" role="alert">
                                                            {errors.nid || errors.smart_card_number || nidOrSmartClientError}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Label className="flex cursor-pointer flex-row flex-nowrap items-center gap-2 py-1 text-xs leading-none">
                                                <span className="select-none">Is Project Employee</span>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 shrink-0"
                                                    checked={!!data.is_project_employee}
                                                    onChange={(e) => setData('is_project_employee', e.target.checked)}
                                                />
                                            </Label>
                                            <Label className="flex cursor-pointer flex-row flex-nowrap items-center gap-2 py-1 text-xs leading-none">
                                                <span className="select-none">Is Custodian</span>
                                                <input type="checkbox" className="h-4 w-4 shrink-0" checked={!!data.is_custodian} onChange={(e) => setData('is_custodian', e.target.checked)} />
                                            </Label>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Identification Mark</Label>
                                                <Input value={data.identification_mark || ''} onChange={(e) => setData('identification_mark', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Email Address</Label>
                                                <Input type="email" value={data.email || ''} onChange={(e) => setData('email', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Mobile No(Personal) *</Label>
                                                <Input value={data.mobile_personal || ''} onChange={(e) => setData('mobile_personal', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Mobile No(Official)</Label>
                                                <Input value={data.mobile_official || ''} onChange={(e) => setData('mobile_official', e.target.value)} />
                                            </div>
                                            <div className="pt-2 text-xs font-medium text-muted-foreground">Permanent Address</div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Division</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[1]?.division || null}
                                                    onChange={(v) => setPermanentAddress({ division: v ?? '', district: '', upazila: '', union: '', village: '' })}
                                                    items={divisionItems}
                                                    placeholder="Division"
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">District</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[1]?.district || null}
                                                    onChange={(v) => setPermanentAddress({ district: v ?? '', upazila: '', union: '', village: '' })}
                                                    items={permDistrictItems}
                                                    placeholder="District"
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Thana/Upazilla</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[1]?.upazila || null}
                                                    onChange={(v) => setPermanentAddress({ upazila: v ?? '', union: '', village: '' })}
                                                    items={permUpazilaItems}
                                                    placeholder="Upazila"
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Union</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[1]?.union || null}
                                                    onChange={(v) => setPermanentAddress({ union: v ?? '', village: '' })}
                                                    items={permUnionItems}
                                                    placeholder="Union"
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Village</Label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <ComboSelect
                                                            value={data.addresses?.[1]?.village || null}
                                                            onChange={(v) => setPermanentAddress({ village: v ?? '' })}
                                                            items={permVillageItems}
                                                            placeholder="Select Village"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => openAddVillageModal('permanent')}
                                                        title="Add village"
                                                        disabled={!canOpenVillageModal('permanent')}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <Label className="flex cursor-pointer flex-row flex-nowrap items-center gap-2 py-1 text-xs leading-none">
                                                <span className="select-none">Same as Permanent Address</span>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 shrink-0"
                                                    checked={sameAsPermanent}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setSameAsPermanent(checked);
                                                        if (!checked) return;
                                                        const next = [...data.addresses];
                                                        next[0] = { ...next[0], ...next[1], type: 'present' };
                                                        next[0] = { ...next[0], address_details: buildAddressDetails(next[0]) };
                                                        setData('addresses', next);
                                                    }}
                                                />
                                            </Label>

                                            <div className="pt-2 text-xs font-medium text-muted-foreground">Present Address</div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Division</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[0]?.division || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ division: v ?? '', district: '', upazila: '', union: '', village: '' });
                                                    }}
                                                    items={divisionItems}
                                                    placeholder="Division"
                                                    disabled={sameAsPermanent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">District</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[0]?.district || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ district: v ?? '', upazila: '', union: '', village: '' });
                                                    }}
                                                    items={districtItems}
                                                    placeholder="District"
                                                    disabled={sameAsPermanent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Thana/Upazilla</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[0]?.upazila || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ upazila: v ?? '', union: '', village: '' });
                                                    }}
                                                    items={upazilaItems}
                                                    placeholder="Upazila"
                                                    disabled={sameAsPermanent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Union</Label>
                                                <ComboSelect
                                                    value={data.addresses?.[0]?.union || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ union: v ?? '', village: '' });
                                                    }}
                                                    items={presentUnionItems}
                                                    placeholder="Union"
                                                    disabled={sameAsPermanent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Village</Label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <ComboSelect
                                                            value={data.addresses?.[0]?.village || null}
                                                            onChange={(v) => {
                                                                setPresentAddress({ village: v ?? '' });
                                                            }}
                                                            items={presentVillageItems}
                                                            placeholder="Select Village"
                                                            disabled={sameAsPermanent}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => openAddVillageModal('present')}
                                                        title="Add village"
                                                        disabled={sameAsPermanent || !canOpenVillageModal('present')}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right column */}
                                        <div className="space-y-4">
                                            <div className="rounded-md border p-3">
                                                <div className="mb-2 text-xs font-medium">Picture</div>
                                                {photoPreview ? (
                                                    <img src={photoPreview} className="h-36 w-36 rounded object-cover" alt="Preview" />
                                                ) : (
                                                    <div className="flex h-36 w-36 items-center justify-center rounded bg-gray-100 text-xs text-muted-foreground">
                                                        No photo
                                                    </div>
                                                )}
                                                <div className="mt-3 space-y-2">
                                                    <Label className="text-xs">Photo Upload</Label>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0] ?? null;
                                                            setData('photo', file);
                                                            if (!file) return setPhotoPreview(null);
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => setPhotoPreview((ev.target?.result as string) ?? null);
                                                            reader.readAsDataURL(file);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="rounded-md border p-3">
                                                <div className="mb-2 text-xs font-medium">Signature</div>
                                                {signaturePreview ? (
                                                    <img src={signaturePreview} className="h-20 w-full rounded object-cover" alt="Signature preview" />
                                                ) : (
                                                    <div className="flex h-20 w-full items-center justify-center rounded bg-gray-100 text-xs text-muted-foreground">
                                                        No signature
                                                    </div>
                                                )}
                                                <div className="mt-3 space-y-2">
                                                    <Label className="text-xs">Employee Signature</Label>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0] ?? null;
                                                            setData('signature', file);
                                                            if (!file) return setSignaturePreview(null);
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => setSignaturePreview((ev.target?.result as string) ?? null);
                                                            reader.readAsDataURL(file);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('education')}>
                                        Next: Educational Setup
                                    </Button>
                                    <Button type="submit" disabled={processing} className="bg-green-600 hover:bg-green-700">
                                        {processing ? 'Updating...' : 'Update Employee'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="education">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Educational Setup</CardTitle>
                                    <CardDescription className="text-xs">Edit education items</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setData('educations', [
                                                    ...data.educations,
                                                    { degree: '', institute: '', group_name: '', board: '', subject: '', result_type: '', result_value: '' },
                                                ])
                                            }
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Add Education
                                        </Button>
                                    </div>
                                    {data.educations.map((ed: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Item {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('educations', data.educations.filter((_: any, i: number) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Degree</Label>
                                                    <Input value={ed.degree || ''} onChange={(e) => setData('educations', data.educations.map((x: any, i: number) => (i === idx ? { ...x, degree: e.target.value } : x)))} placeholder="e.g. SSC" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Institute</Label>
                                                    <Input value={ed.institute || ''} onChange={(e) => setData('educations', data.educations.map((x: any, i: number) => (i === idx ? { ...x, institute: e.target.value } : x)))} />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Board</Label>
                                                    <ComboSelect value={ed.board || null} onChange={(v) => setData('educations', data.educations.map((x: any, i: number) => (i === idx ? { ...x, board: v ?? '' } : x)))} items={educationBoards.map((b: string) => ({ value: b, label: b }))} placeholder="Select board" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Group</Label>
                                                    <Input value={ed.group_name || ''} onChange={(e) => setData('educations', data.educations.map((x: any, i: number) => (i === idx ? { ...x, group_name: e.target.value } : x)))} />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Subject</Label>
                                                    <Input value={ed.subject || ''} onChange={(e) => setData('educations', data.educations.map((x: any, i: number) => (i === idx ? { ...x, subject: e.target.value } : x)))} />
                                                </div>
                                                <div className={`${RF_CELL} min-w-[17rem] shrink-0 lg:min-w-[19rem]`}>
                                                    <Label className="text-xs">Result</Label>
                                                    <div className="flex gap-2">
                                                        <div className="w-[9.75rem] shrink-0">
                                                            <ComboSelect
                                                                value={ed.result_type || null}
                                                                onChange={(v) => setData('educations', data.educations.map((x: any, i: number) => (i === idx ? { ...x, result_type: (v ?? '') as any } : x)))}
                                                                items={[
                                                                    { value: 'gpa', label: 'GPA' },
                                                                    { value: 'cgpa', label: 'CGPA' },
                                                                    { value: 'other', label: 'Other' },
                                                                ]}
                                                                placeholder="Type"
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <Input value={ed.result_value || ''} onChange={(e) => setData('educations', data.educations.map((x: any, i: number) => (i === idx ? { ...x, result_value: e.target.value } : x)))} placeholder="Value" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('general')}>
                                        Back
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Save
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* For brevity: other tabs mirror create.tsx behavior and persist into same fields */}
                        <TabsContent value="salary">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Salary</CardTitle>
                                    <CardDescription className="text-xs">Payscale, grade, and step for payroll</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <EmployeeSalaryAssignment
                                        payscales={payscales}
                                        grades={payrollGrades}
                                        steps={payrollSteps}
                                        payscaleId={data.payscale_id}
                                        salaryGradeId={data.salary_grade_id}
                                        salaryStepId={data.salary_step_id}
                                        basicSalary={data.basic_salary}
                                        onPayscaleIdChange={(v) => setData('payscale_id', v)}
                                        onSalaryGradeIdChange={(v) => setData('salary_grade_id', v)}
                                        onSalaryStepIdChange={(v) => setData('salary_step_id', v)}
                                        onBasicSalaryChange={(v) => setData('basic_salary', v)}
                                        errors={errors}
                                    />
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('education')}>Back</Button>
                                    <Button type="button" onClick={() => setActiveTab('bank')}>Next: Bank</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="bank">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Bank Setup</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Bank Name</Label>
                                            <ComboSelect
                                                value={data.bank.bank_name || null}
                                                onChange={(v) => setData('bank', { ...data.bank, bank_name: v ?? '' })}
                                                items={banks.map((b: string) => ({ value: b, label: b }))}
                                                placeholder="Select bank"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Branch Name</Label>
                                            <ComboSelect
                                                value={data.bank.branch_name || null}
                                                onChange={(v) => setData('bank', { ...data.bank, branch_name: v ?? '' })}
                                                items={bankBranchItems}
                                                placeholder="e.g. Naogaon Sadar (0001)"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Account No</Label>
                                            <Input value={data.bank.account_no} onChange={(e) => setData('bank', { ...data.bank, account_no: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Account Type</Label>
                                            <ComboSelect
                                                value={data.bank.account_type || null}
                                                onChange={(v) => setData('bank', { ...data.bank, account_type: (v ?? '') as any })}
                                                items={[
                                                    { value: 'current', label: 'Current' },
                                                    { value: 'savings', label: 'Savings' },
                                                ]}
                                                placeholder="Select type"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Bank Address</Label>
                                        <Textarea rows={2} value={data.bank.bank_address} onChange={(e) => setData('bank', { ...data.bank, bank_address: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Remark</Label>
                                        <Textarea rows={2} value={data.bank.remark} onChange={(e) => setData('bank', { ...data.bank, remark: e.target.value })} />
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('salary')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('nominee')}>
                                        Next: Nominee
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="nominee">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Nominee</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setData('nominees', [...data.nominees, { name: '', relation: '', date_of_birth: '', share: '', contact: '' }])}
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Add Nominee
                                        </Button>
                                    </div>
                                    {data.nominees.map((n: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Nominee {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('nominees', data.nominees.filter((_: any, i: number) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={n.name || ''} onChange={(e) => setData('nominees', data.nominees.map((x: any, i: number) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <ComboSelect
                                                        value={n.relation || null}
                                                        onChange={(v) => setData('nominees', data.nominees.map((x: any, i: number) => (i === idx ? { ...x, relation: v ?? '' } : x)))}
                                                        items={relations.map((r: string) => ({ value: r, label: r }))}
                                                        placeholder="Relation"
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={n.contact || ''} onChange={(e) => setData('nominees', data.nominees.map((x: any, i: number) => (i === idx ? { ...x, contact: e.target.value } : x)))} placeholder="Contact" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input
                                                        placeholder={DISPLAY_DATE_FMT}
                                                        autoComplete="off"
                                                        value={n.date_of_birth || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'nominees',
                                                                data.nominees.map((x: any, i: number) => (i === idx ? { ...x, date_of_birth: e.target.value } : x))
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={String(n.share ?? '')} onChange={(e) => setData('nominees', data.nominees.map((x: any, i: number) => (i === idx ? { ...x, share: e.target.value } : x)))} placeholder="Share" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('bank')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('guarantor')}>
                                        Next: Guarantor
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="guarantor">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Guarantor & Cheque Info</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('guarantors', [...data.guarantors, { name: '', age: '', occupation: '', relation: '', phone: '', email: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Guarantor
                                        </Button>
                                    </div>
                                    {data.guarantors.map((g: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Guarantor {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('guarantors', data.guarantors.filter((_: any, i: number) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={g.name || ''} onChange={(e) => setData('guarantors', data.guarantors.map((x: any, i: number) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={String(g.age ?? '')} onChange={(e) => setData('guarantors', data.guarantors.map((x: any, i: number) => (i === idx ? { ...x, age: e.target.value } : x)))} placeholder="Age" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={g.occupation || ''} onChange={(e) => setData('guarantors', data.guarantors.map((x: any, i: number) => (i === idx ? { ...x, occupation: e.target.value } : x)))} placeholder="Occupation" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <ComboSelect value={g.relation || null} onChange={(v) => setData('guarantors', data.guarantors.map((x: any, i: number) => (i === idx ? { ...x, relation: v ?? '' } : x)))} items={relations.map((r: string) => ({ value: r, label: r }))} placeholder="Relation" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={g.phone || ''} onChange={(e) => setData('guarantors', data.guarantors.map((x: any, i: number) => (i === idx ? { ...x, phone: e.target.value } : x)))} placeholder="Phone" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={g.email || ''} onChange={(e) => setData('guarantors', data.guarantors.map((x: any, i: number) => (i === idx ? { ...x, email: e.target.value } : x)))} placeholder="Email" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('guarantor_cheques', [...data.guarantor_cheques, { bank_name: '', branch_name: '', cheque_no: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Cheque
                                        </Button>
                                    </div>
                                    {data.guarantor_cheques.map((c: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className={RF_ROW_CTR}>
                                                <div className={RF_CELL}>
                                                    <ComboSelect value={c.bank_name || null} onChange={(v) => setData('guarantor_cheques', data.guarantor_cheques.map((x: any, i: number) => (i === idx ? { ...x, bank_name: v ?? '' } : x)))} items={banks.map((b: string) => ({ value: b, label: b }))} placeholder="Bank" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={c.branch_name || ''} onChange={(e) => setData('guarantor_cheques', data.guarantor_cheques.map((x: any, i: number) => (i === idx ? { ...x, branch_name: e.target.value } : x)))} placeholder="Branch" />
                                                </div>
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <Input className="min-w-0 flex-1" value={c.cheque_no || ''} onChange={(e) => setData('guarantor_cheques', data.guarantor_cheques.map((x: any, i: number) => (i === idx ? { ...x, cheque_no: e.target.value } : x)))} placeholder="Cheque No" />
                                                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setData('guarantor_cheques', data.guarantor_cheques.filter((_: any, i: number) => i !== idx))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('nominee')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('collateral')}>
                                        Next: Collateral
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="collateral">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Collateral</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" className="h-4 w-4" checked={!!data.collateral?.has_certificate} onChange={(e) => setData('collateral', { ...data.collateral, has_certificate: e.target.checked })} />
                                        Certificate
                                    </label>
                                    {data.collateral?.has_certificate && (
                                        <div className="flex flex-wrap gap-3">
                                            {['ssc', 'hsc', 'honors', 'masters'].map((lvl) => (
                                                <label key={lvl} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={(data.collateral.certificate_levels ?? []).includes(lvl)}
                                                        onChange={(e) => {
                                                            const next = new Set(data.collateral.certificate_levels ?? []);
                                                            if (e.target.checked) next.add(lvl);
                                                            else next.delete(lvl);
                                                            setData('collateral', { ...data.collateral, certificate_levels: Array.from(next) });
                                                        }}
                                                    />
                                                    {lvl.toUpperCase()}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <Input value={String(data.collateral?.security_amount ?? '')} onChange={(e) => setData('collateral', { ...data.collateral, security_amount: e.target.value })} placeholder="Security Amount" />
                                        <Input value={String(data.collateral?.collateral_interest ?? '')} onChange={(e) => setData('collateral', { ...data.collateral, collateral_interest: e.target.value })} placeholder="Collateral Interest" />
                                        <Input
                                            placeholder={DISPLAY_DATE_FMT}
                                            autoComplete="off"
                                            value={data.collateral?.collateral_date ?? ''}
                                            onChange={(e) => setData('collateral', { ...data.collateral, collateral_date: e.target.value })}
                                        />
                                    </div>
                                    <Textarea rows={2} value={data.collateral?.notes ?? ''} onChange={(e) => setData('collateral', { ...data.collateral, notes: e.target.value })} placeholder="Notes" />

                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('collateral_receive_cheques', [...data.collateral_receive_cheques, { bank_name: '', branch_name: '', cheque_no: '', notes: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Receive Cheque
                                        </Button>
                                    </div>
                                    {data.collateral_receive_cheques.map((c: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className={RF_ROW_CTR}>
                                                <div className={RF_CELL}>
                                                    <ComboSelect value={c.bank_name || null} onChange={(v) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x: any, i: number) => (i === idx ? { ...x, bank_name: v ?? '' } : x)))} items={banks.map((b: string) => ({ value: b, label: b }))} placeholder="Bank" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={c.branch_name || ''} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x: any, i: number) => (i === idx ? { ...x, branch_name: e.target.value } : x)))} placeholder="Branch" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={c.cheque_no || ''} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x: any, i: number) => (i === idx ? { ...x, cheque_no: e.target.value } : x)))} placeholder="Cheque No" />
                                                </div>
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <Input className="min-w-0 flex-1" value={c.notes || ''} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x: any, i: number) => (i === idx ? { ...x, notes: e.target.value } : x)))} placeholder="Notes" />
                                                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setData('collateral_receive_cheques', data.collateral_receive_cheques.filter((_: any, i: number) => i !== idx))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('guarantor')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('asset')}>
                                        Next: Org. Asset
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="asset">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Org. Asset</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('assets', [...data.assets, { serial: '', asset_no: '', name: '', details: '', provided_quality: '', asset_price: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Asset
                                        </Button>
                                    </div>
                                    {data.assets.map((a: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Asset {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('assets', data.assets.filter((_: any, i: number) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={String(a.serial ?? '')} onChange={(e) => setData('assets', data.assets.map((x: any, i: number) => (i === idx ? { ...x, serial: e.target.value } : x)))} placeholder="Serial" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={a.asset_no || ''} onChange={(e) => setData('assets', data.assets.map((x: any, i: number) => (i === idx ? { ...x, asset_no: e.target.value } : x)))} placeholder="Asset No" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={a.name || ''} onChange={(e) => setData('assets', data.assets.map((x: any, i: number) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={a.provided_quality || ''} onChange={(e) => setData('assets', data.assets.map((x: any, i: number) => (i === idx ? { ...x, provided_quality: e.target.value } : x)))} placeholder="Provided Quality" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={String(a.asset_price ?? '')} onChange={(e) => setData('assets', data.assets.map((x: any, i: number) => (i === idx ? { ...x, asset_price: e.target.value } : x)))} placeholder="Asset Price" />
                                                </div>
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={a.details || ''} onChange={(e) => setData('assets', data.assets.map((x: any, i: number) => (i === idx ? { ...x, details: e.target.value } : x)))} placeholder="Details" />
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('collateral')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('experience')}>
                                        Next: Experience
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="experience">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Experience</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('experiences', [...data.experiences, { organization: '', from_date: '', to_date: '', designation: '', department: '', address: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Experience
                                        </Button>
                                    </div>
                                    {data.experiences.map((ex: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Experience {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('experiences', data.experiences.filter((_: any, i: number) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={ex.organization || ''} onChange={(e) => setData('experiences', data.experiences.map((x: any, i: number) => (i === idx ? { ...x, organization: e.target.value } : x)))} placeholder="Organization" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input
                                                        placeholder={DISPLAY_DATE_FMT}
                                                        autoComplete="off"
                                                        value={ex.from_date || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'experiences',
                                                                data.experiences.map((x: any, i: number) => (i === idx ? { ...x, from_date: e.target.value } : x))
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input
                                                        placeholder={DISPLAY_DATE_FMT}
                                                        autoComplete="off"
                                                        value={ex.to_date || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'experiences',
                                                                data.experiences.map((x: any, i: number) => (i === idx ? { ...x, to_date: e.target.value } : x))
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={ex.designation || ''} onChange={(e) => setData('experiences', data.experiences.map((x: any, i: number) => (i === idx ? { ...x, designation: e.target.value } : x)))} placeholder="Designation" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={ex.department || ''} onChange={(e) => setData('experiences', data.experiences.map((x: any, i: number) => (i === idx ? { ...x, department: e.target.value } : x)))} placeholder="Department" />
                                                </div>
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={ex.address || ''} onChange={(e) => setData('experiences', data.experiences.map((x: any, i: number) => (i === idx ? { ...x, address: e.target.value } : x)))} placeholder="Address" />
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('asset')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('training')}>
                                        Next: Training
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="training">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Training History</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('trainings', [...data.trainings, { training_title: '', institute: '', address: '', duration: '', remarks: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Training
                                        </Button>
                                    </div>
                                    {data.trainings.map((t: any, idx: number) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Training {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('trainings', data.trainings.filter((_: any, i: number) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={t.training_title || ''} onChange={(e) => setData('trainings', data.trainings.map((x: any, i: number) => (i === idx ? { ...x, training_title: e.target.value } : x)))} placeholder="Training Title" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={t.institute || ''} onChange={(e) => setData('trainings', data.trainings.map((x: any, i: number) => (i === idx ? { ...x, institute: e.target.value } : x)))} placeholder="Institute" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={t.duration || ''} onChange={(e) => setData('trainings', data.trainings.map((x: any, i: number) => (i === idx ? { ...x, duration: e.target.value } : x)))} placeholder="Duration" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={t.address || ''} onChange={(e) => setData('trainings', data.trainings.map((x: any, i: number) => (i === idx ? { ...x, address: e.target.value } : x)))} placeholder="Address" />
                                                </div>
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={t.remarks || ''} onChange={(e) => setData('trainings', data.trainings.map((x: any, i: number) => (i === idx ? { ...x, remarks: e.target.value } : x)))} placeholder="Remarks" />
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="flex justify-between border-t bg-gray-50 px-6 py-4">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('experience')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('documents')}>
                                        Next: Documents
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Documents</CardTitle>
                                    <CardDescription className="text-xs">
                                        Add or replace files. Removing a row here deletes that document. Max 5MB each — PDF, images, DOC/DOCX.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setData('documents', [...(data.documents || []), newEmployeeDocumentFormRow()])}
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Add document
                                        </Button>
                                    </div>
                                    {!(data.documents || []).length ? (
                                        <p className="text-center text-sm text-muted-foreground">No documents. Click &quot;Add document&quot; to upload.</p>
                                    ) : null}
                                    {(data.documents || []).map((doc: any, idx: number) => (
                                        <div key={doc.clientKey} className="space-y-3 rounded-md border p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">Document {idx + 1}</div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setData('documents', (data.documents || []).filter((_: any, i: number) => i !== idx))}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW_TOP}>
                                                <div className={`${RF_CELL} min-w-[8.5rem]`}>
                                                    <Label className="text-xs">Document type</Label>
                                                    <select
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                        value={doc.document_type || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                (data.documents || []).map((d: any, i: number) =>
                                                                    i === idx ? { ...d, document_type: e.target.value } : d
                                                                )
                                                            )
                                                        }
                                                    >
                                                        <option value="">Select type</option>
                                                        {documentTypes.map((t) => (
                                                            <option key={t} value={t}>
                                                                {formatEmployeeDocumentTypeLabel(t)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {errors[`documents.${idx}.document_type`] && (
                                                        <p className="text-xs text-destructive">{errors[`documents.${idx}.document_type`]}</p>
                                                    )}
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Title</Label>
                                                    <Input
                                                        value={doc.title || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                (data.documents || []).map((d: any, i: number) => (i === idx ? { ...d, title: e.target.value } : d))
                                                            )
                                                        }
                                                        placeholder="e.g. NID scan"
                                                    />
                                                    {errors[`documents.${idx}.title`] && (
                                                        <p className="text-xs text-destructive">{errors[`documents.${idx}.title`]}</p>
                                                    )}
                                                </div>
                                                <div className={`${RF_CELL} shrink-0 lg:max-w-[9.5rem]`}>
                                                    <Label className="text-xs">Expiry date (optional)</Label>
                                                    <Input
                                                        placeholder={DISPLAY_DATE_FMT}
                                                        autoComplete="off"
                                                        value={doc.expiry_date || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                (data.documents || []).map((d: any, i: number) => (i === idx ? { ...d, expiry_date: e.target.value } : d))
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className={`${RF_CELL} min-w-[7rem] shrink-0`}>
                                                    <Label className="text-xs">File {!doc.id ? <span className="text-destructive">*</span> : null}</Label>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted/50">
                                                            <Upload className="h-3.5 w-3.5" />
                                                            <span>{doc.file ? doc.file.name : doc.existing_file_path ? 'Replace file' : 'Choose file'}</span>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                onChange={(e) => {
                                                                    const f = e.target.files?.[0] ?? null;
                                                                    setData(
                                                                        'documents',
                                                                        (data.documents || []).map((d: any, i: number) => (i === idx ? { ...d, file: f } : d))
                                                                    );
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                    {doc.existing_file_path && !doc.file ? (
                                                        <p className="text-[11px] text-muted-foreground">Current: {String(doc.existing_file_path).split('/').pop()}</p>
                                                    ) : null}
                                                    {errors[`documents.${idx}.file`] && (
                                                        <p className="text-xs text-destructive">{errors[`documents.${idx}.file`]}</p>
                                                    )}
                                                </div>
                                                <div className={`${RF_CELL} min-w-[10rem]`}>
                                                    <Label className="text-xs">Description (optional)</Label>
                                                    <Textarea
                                                        rows={2}
                                                        className="text-xs"
                                                        value={doc.description || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                (data.documents || []).map((d: any, i: number) => (i === idx ? { ...d, description: e.target.value } : d))
                                                            )
                                                        }
                                                        placeholder="Notes"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="flex justify-between border-t bg-gray-50 px-6 py-4">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('training')}>
                                        Back
                                    </Button>
                                    <Button type="submit" disabled={processing} className="bg-green-600 hover:bg-green-700">
                                        {processing ? 'Updating...' : 'Update Employee'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </form>
            </div>

            <Dialog
                open={addVillageModal.open}
                onOpenChange={(open) => {
                    if (!open) {
                        setAddVillageModal({ open: false, target: 'present', name: '', error: '', saving: false });
                    } else {
                        setAddVillageModal((s) => ({ ...s, open: true }));
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Add Village</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className="text-xs">Village Name</Label>
                        <Input
                            value={addVillageModal.name}
                            onChange={(e) => setAddVillageModal((s) => ({ ...s, name: e.target.value, error: '' }))}
                            placeholder="Type village name"
                            autoFocus
                        />
                        {addVillageModal.error ? <p className="text-xs text-red-600">{addVillageModal.error}</p> : null}
                        <p className="text-[11px] text-muted-foreground">
                            This will be saved and available for future selection.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddVillageModal({ open: false, target: 'present', name: '', error: '', saving: false })}
                            disabled={addVillageModal.saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={async () => {
                                const target = addVillageModal.target;
                                const name = addVillageModal.name;
                                setAddVillageModal((s) => ({ ...s, saving: true, error: '' }));
                                const result = await persistVillage(target, name);
                                if (result.ok) {
                                    setAddVillageModal({ open: false, target: 'present', name: '', error: '', saving: false });
                                } else {
                                    setAddVillageModal((s) => ({ ...s, saving: false, error: result.error ?? 'Could not save village.' }));
                                }
                            }}
                            disabled={!addVillageModal.name.trim() || addVillageModal.saving}
                        >
                            {addVillageModal.saving ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
