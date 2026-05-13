import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
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
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Upload,
    User,
} from 'lucide-react';
import { format } from 'date-fns';

/** Repeatable “multiple add” rows: stacked on small screens, one horizontal row on large screens */
const RF_ROW = 'flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-end lg:gap-2 lg:overflow-x-auto lg:pb-0.5';
const RF_ROW_TOP = 'flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-start lg:gap-2 lg:overflow-x-auto lg:pb-0.5';
const RF_ROW_CTR = 'flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-2 lg:overflow-x-auto lg:pb-0.5';
const RF_CELL = 'min-w-0 flex-1 space-y-1';

function getCsrfTokenFromPage(): string {
    const el = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    return el?.content?.trim() ?? '';
}

/** Muted “sample signature” stroke shown until the user uploads a scan. */
function SignatureDemoGraphic({ className }: { className?: string }) {
    return (
        <svg
            className={cn('pointer-events-none text-muted-foreground/40', className)}
            viewBox="0 0 360 56"
            fill="none"
            aria-hidden
        >
            <path
                d="M14 36c22-32 52-36 84-14s56 6 88-16 72-8 108 10 52-26 62-22"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M32 44c28-6 48-2 72 4M118 24c16 18 36 22 58 8"
                stroke="currentColor"
                strokeWidth="0.95"
                strokeLinecap="round"
                opacity={0.75}
            />
        </svg>
    );
}

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
    name_en?: string;
    pin?: string;
    employee_id?: string;
}

type Address = {
    type: 'present' | 'permanent';
    division: string;
    district: string;
    upazila: string;
    union: string;
    village: string;
    address_details: string;
};

type Education = {
    degree: string;
    institute: string;
    group_name: string;
    board: string;
    subject: string;
    result_type: '' | 'gpa' | 'cgpa' | 'other';
    result_value: string;
};

type Nominee = { name: string; relation: string; date_of_birth: string; share: string; contact: string };
type Guarantor = { name: string; age: string; occupation: string; relation: string; phone: string; email: string };
type Cheque = { bank_name: string; branch_name: string; cheque_no: string; notes?: string };
type Asset = { serial: string; asset_no: string; name: string; details: string; provided_quality: string; asset_price: string };
type Experience = { organization: string; from_date: string; to_date: string; designation: string; department: string; address: string };
type Training = { training_title: string; institute: string; address: string; duration: string; remarks: string };
type LocationUnion = { name: string; type: string; villages: string[] };

type EmployeeCreateFormData = {
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
    birth_date_certificate: string;
    birth_date_original: string;
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
    nid: string;
    nid_number: string;
    smart_card_number: string;
    birth_registration_number: string;
    tin_certificate_no: string;
    driving_license_no: string;
    passport_no: string;
    is_project_employee: boolean;
    is_custodian: boolean;
    identification_mark: string;
    email: string;
    email_id: string;
    phone: string;
    mobile_personal: string;
    mobile_official: string;
    photo: File | null;
    signature: File | null;

    addresses: Address[];
    educations: Education[];
    bank: {
        bank_name: string;
        branch_name: string;
        account_no: string;
        account_type: '' | 'current' | 'savings';
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
};

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
        birth_date_certificate: '',
        birth_date_original: '',
        date_of_birth: '',
        blood_group: '',
        email: '',
        email_id: '',
        phone: '',
        joining_date: format(new Date(), 'yyyy-MM-dd'),
        confirmation_date: '',
        photo: null,
        signature: null,
        nid: '',
        nid_number: '',
        smart_card_number: '',
        birth_registration_number: '',
        tin_certificate_no: '',
        driving_license_no: '',
        passport_no: '',
        is_project_employee: false,
        is_custodian: false,
        identification_mark: '',
        fathers_name: '',
        fathers_mobile: '',
        mothers_name: '',
        mothers_mobile: '',
        department_id: '',
        joining_designation_id: '',
        last_designation_id: '',
        program_id: '',
        project_id: '',
        mobile_personal: '',
        mobile_official: '',
        addresses: [
            { type: 'present', division: '', district: '', upazila: '', union: '', village: '', address_details: '' },
            { type: 'permanent', division: '', district: '', upazila: '', union: '', village: '', address_details: '' },
        ],
        educations: [],
        bank: { bank_name: '', branch_name: '', account_no: '', account_type: '', bank_address: '', remark: '' },
        nominees: [],
        guarantors: [],
        guarantor_cheques: [],
        collateral: {
            has_certificate: false,
            certificate_levels: [],
            security_amount: '',
            collateral_interest: '',
            collateral_date: '',
            notes: '',
        },
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

function buildInitialCreateForm(oldInput: unknown): EmployeeCreateFormData {
    const defaults = getCreateFormDefaults();

    const fromServer = asInputPatch(oldInput);
    if (hasPatchKeys(fromServer)) {
        const merged = mergeSerializableIntoForm(defaults, fromServer) as EmployeeCreateFormData;
        return withHydratedDocuments(applyUnifiedNidSmartFields(merged as unknown as Record<string, unknown>) as EmployeeCreateFormData);
    }

    const fromDraft = loadEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY);
    if (fromDraft) {
        const merged = mergeSerializableIntoForm(defaults, fromDraft as Record<string, unknown>) as EmployeeCreateFormData;
        return withHydratedDocuments(applyUnifiedNidSmartFields(merged as unknown as Record<string, unknown>) as EmployeeCreateFormData);
    }

    return defaults;
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

function flattenEmployeeFormErrors(err: Record<string, string | undefined>): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(err)) {
        if (!v || k === 'submit') continue;
        out.push(v);
    }
    return out;
}

function errorFieldKeyToEmployeeCreateTab(key: string): EmployeeCreateTabId {
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

function validateEmployeeCreateTab(tab: EmployeeCreateTabId, data: EmployeeCreateFormData, isSpouseRequired: boolean): string[] {
    const msg: string[] = [];
    switch (tab) {
        case 'general': {
            if (!String(data.current_branch_id ?? '').trim()) msg.push('Branch is required.');
            if (!String(data.pin ?? '').trim()) msg.push('Employee PIN is required.');
            if (!String(data.name_en ?? '').trim()) msg.push('Employee name (English) is required.');
            if (!String(data.joining_date ?? '').trim()) msg.push('Joining date is required.');
            if (!String(data.department_id ?? '').trim()) msg.push('Department is required.');
            if (!String(data.joining_designation_id ?? '').trim()) msg.push('Designation is required.');
            if (!String(data.mobile_personal ?? '').trim()) msg.push('Personal mobile number is required.');
            if (isSpouseRequired) {
                if (!String(data.spouse_name ?? '').trim()) msg.push('Spouse name is required for the selected marital status.');
                if (!String(data.spouse_mobile ?? '').trim()) msg.push('Spouse contact is required for the selected marital status.');
            }
            break;
        }
        case 'education': {
            data.educations.forEach((ed, i) => {
                if (!String(ed.degree ?? '').trim()) {
                    msg.push(`Education row ${i + 1}: Degree is required when education records are added.`);
                }
            });
            break;
        }
        case 'salary':
        case 'bank':
        case 'documents':
            break;
        case 'nominee': {
            data.nominees.forEach((n, i) => {
                if (!String(n.name ?? '').trim()) {
                    msg.push(`Nominee ${i + 1}: Name is required, or remove that nominee row.`);
                }
            });
            break;
        }
        case 'guarantor': {
            data.guarantors.forEach((g, i) => {
                if (!String(g.name ?? '').trim()) {
                    msg.push(`Guarantor ${i + 1}: Name is required, or remove that guarantor row.`);
                }
            });
            break;
        }
        case 'collateral': {
            const levels = data.collateral?.certificate_levels;
            if (data.collateral?.has_certificate && (!Array.isArray(levels) || levels.length === 0)) {
                msg.push('When Certificate is checked, select at least one level (SSC, HSC, Honors, Masters).');
            }
            break;
        }
        case 'asset': {
            data.assets.forEach((a, i) => {
                if (!String(a.name ?? '').trim()) {
                    msg.push(`Org. asset ${i + 1}: Name is required, or remove that asset row.`);
                }
            });
            break;
        }
        case 'experience': {
            data.experiences.forEach((ex, i) => {
                if (!String(ex.organization ?? '').trim()) {
                    msg.push(`Experience ${i + 1}: Organization is required, or remove that experience row.`);
                }
            });
            break;
        }
        case 'training': {
            data.trainings.forEach((t, i) => {
                if (!String(t.training_title ?? '').trim()) {
                    msg.push(`Training ${i + 1}: Title is required, or remove that training row.`);
                }
            });
            break;
        }
        default:
            break;
    }
    return msg;
}

interface EmployeeCreateProps {
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
    oldInput?: Record<string, unknown>;
    errors?: {
        [key: string]: string;
    };
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
    locations,
    defaultBankName,
    documentTypes = [],
    oldInput,
    errors: errorsProp = {},
}: EmployeeCreateProps) {
    const initialForm = useMemo(() => buildInitialCreateForm(oldInput), [oldInput]);

    const { data, setData, post, processing, errors: formErrors } = useForm(initialForm);

    const errors = { ...errorsProp, ...formErrors } as Record<string, string | undefined>;
    const submitError = errors['submit'];
    const serverFieldErrors = useMemo(() => flattenEmployeeFormErrors(errors), [errors]);

    const nidOrSmartClientError = useMemo(() => getNidOrSmartCardClientError(data.nid), [data.nid]);

    const lastServerOldJson = useRef<string | null>(null);
    useEffect(() => {
        const patch = asInputPatch(oldInput);
        if (!hasPatchKeys(patch)) {
            lastServerOldJson.current = null;
            return;
        }
        const json = JSON.stringify(patch);
        if (lastServerOldJson.current === json) {
            return;
        }
        lastServerOldJson.current = json;
        const next = applyUnifiedNidSmartFields(mergeSerializableIntoForm(getCreateFormDefaults(), patch) as unknown as Record<string, unknown>) as EmployeeCreateFormData;
        setData({ ...withHydratedDocuments(next), photo: null });
    }, [oldInput, setData]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            saveEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY, toSerializableEmployeeForm(data as any));
        }, 450);
        return () => window.clearTimeout(handle);
    }, [data]);

    const [activeTab, setActiveTab] = useState('general');
    const [tabStepBlockMessages, setTabStepBlockMessages] = useState<string[] | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const photoFileInputRef = useRef<HTMLInputElement>(null);
    const signatureFileInputRef = useRef<HTMLInputElement>(null);
    const [photoDropActive, setPhotoDropActive] = useState(false);
    const [signatureDropActive, setSignatureDropActive] = useState(false);

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
    }>({
        open: false,
        target: 'present',
        name: '',
        error: '',
        saving: false,
    });

    useEffect(() => {
        // Default bank
        if (!data.bank.bank_name) {
            setData('bank', { ...data.bank, bank_name: defaultBankName });
        }
        // PIN suggestion
        fetch(route('employees.pin-suggestion'))
            .then((r) => r.json())
            .then((j) => {
                if (!data.pin) setData('pin', j?.next_normal_pin ?? '');
            })
            .catch(() => {});
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
    const districtItems: ComboSelectItem<string>[] = ((locations?.districts?.[data.addresses[0]?.division] ?? []) as string[]).map((d) => ({ value: d, label: d }));
    const upazilaItems: ComboSelectItem<string>[] = ((locations?.upazilas?.[data.addresses[0]?.district] ?? []) as string[]).map((u) => ({ value: u, label: u }));

    const [extraVillages, setExtraVillages] = useState<Record<string, string[]>>({});

    const presentUnions = useMemo(() => {
        return ((locations?.unions?.[data.addresses[0]?.upazila] ?? []) as LocationUnion[]) || [];
    }, [locations, data.addresses]);
    const presentUnionItems: ComboSelectItem<string>[] = useMemo(
        () => presentUnions.map((u) => ({ value: u.name, label: u.name, keywords: u.type })),
        [presentUnions]
    );
    const presentSelectedUnion = useMemo(() => {
        const name = data.addresses[0]?.union || '';
        return presentUnions.find((u) => u.name === name) ?? null;
    }, [data.addresses, presentUnions]);
    const presentVillageItems: ComboSelectItem<string>[] = useMemo(() => {
        const base = presentSelectedUnion?.villages ?? [];
        const key = `p:${data.addresses[0]?.upazila || ''}:${data.addresses[0]?.union || ''}`;
        const extra = extraVillages[key] ?? [];
        const merged = Array.from(new Set([...base, ...extra]));
        const selected = (data.addresses[0]?.village ?? '').trim();
        if (selected && !merged.includes(selected)) merged.push(selected);
        return merged.map((v) => ({ value: v, label: v }));
    }, [presentSelectedUnion, extraVillages, data.addresses]);

    const permDistrictItems: ComboSelectItem<string>[] = ((locations?.districts?.[data.addresses[1]?.division] ?? []) as string[]).map((d) => ({ value: d, label: d }));
    const permUpazilaItems: ComboSelectItem<string>[] = ((locations?.upazilas?.[data.addresses[1]?.district] ?? []) as string[]).map((u) => ({ value: u, label: u }));
    const permUnions = useMemo(() => {
        return ((locations?.unions?.[data.addresses[1]?.upazila] ?? []) as LocationUnion[]) || [];
    }, [locations, data.addresses]);
    const permUnionItems: ComboSelectItem<string>[] = useMemo(
        () => permUnions.map((u) => ({ value: u.name, label: u.name, keywords: u.type })),
        [permUnions]
    );
    const permSelectedUnion = useMemo(() => {
        const name = data.addresses[1]?.union || '';
        return permUnions.find((u) => u.name === name) ?? null;
    }, [data.addresses, permUnions]);
    const permVillageItems: ComboSelectItem<string>[] = useMemo(() => {
        const base = permSelectedUnion?.villages ?? [];
        const key = `r:${data.addresses[1]?.upazila || ''}:${data.addresses[1]?.union || ''}`;
        const extra = extraVillages[key] ?? [];
        const merged = Array.from(new Set([...base, ...extra]));
        const selected = (data.addresses[1]?.village ?? '').trim();
        if (selected && !merged.includes(selected)) merged.push(selected);
        return merged.map((v) => ({ value: v, label: v }));
    }, [permSelectedUnion, extraVillages, data.addresses]);

    const buildAddressDetails = (a: Address) => {
        const parts = [a.village, a.union, a.upazila, a.district, a.division].filter(Boolean);
        return parts.join(', ');
    };

    const setPresentAddress = (patch: Partial<Address>) => {
        const next = [...data.addresses];
        next[0] = { ...next[0], ...patch };
        next[0] = { ...next[0], address_details: buildAddressDetails(next[0]) };
        setData('addresses', next);
    };

    const setPermanentAddress = (patch: Partial<Address>) => {
        const next = [...data.addresses];
        next[1] = { ...next[1], ...patch };
        next[1] = { ...next[1], address_details: buildAddressDetails(next[1]) };
        if (sameAsPermanentRef.current) {
            next[0] = { ...next[0], ...next[1], type: 'present' };
            next[0] = { ...next[0], address_details: buildAddressDetails(next[0]) };
        }
        setData('addresses', next);
    };

    const isSpouseRequired = ['Married', 'Widowed', 'Separated'].includes(data.marital_status);

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
        const curTab = activeTab as EmployeeCreateTabId;
        const still = validateEmployeeCreateTab(curTab, data, spouseRequired);
        if (still.length === 0) setTabStepBlockMessages(null);
    }, [data, activeTab, tabStepBlockMessages]);

    const selectedEmployeeType = useMemo(() => {
        const id = Number(data.employee_type_id || 0);
        return employeeTypes.find((t) => t.id === id) ?? null;
    }, [data.employee_type_id, employeeTypes]);

    const derivedProbationMonths = selectedEmployeeType?.probation_months ?? 0;

    const derivedAge = useMemo(() => {
        const raw = data.birth_date_original || data.birth_date_certificate;
        if (!raw) return '';
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return '';
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
        const a = data.addresses[idx];
        return !!(a?.division && a?.district && a?.upazila && a?.union);
    };

    const persistVillage = async (target: 'present' | 'permanent', nameRaw: string): Promise<{ ok: boolean; error?: string }> => {
        const idx = target === 'present' ? 0 : 1;
        const division = data.addresses[idx]?.division || '';
        const district = data.addresses[idx]?.district || '';
        const upazila = data.addresses[idx]?.upazila || '';
        const union = data.addresses[idx]?.union || '';
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
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

    return (
        <Layout>
            <Head title="Add New Employee" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link
                        href={route('employees.index')}
                        className="flex w-fit items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span>Back to Employees</span>
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
                    <p className="mt-1 text-gray-500">
                        Create a new employee record with personal and employment details
                    </p>
                </div>

                {(tabStepBlockMessages?.length || serverFieldErrors.length > 0 || submitError) && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>
                            {serverFieldErrors.length > 0 || submitError ? 'Could not create employee' : 'Complete required fields'}
                        </AlertTitle>
                        <AlertDescription className="space-y-3 text-sm">
                            {tabStepBlockMessages && tabStepBlockMessages.length > 0 ? (
                                <div>
                                    <p className="font-medium text-foreground">
                                        Required inputs on this step are not complete. Fix them before going to the next tab:
                                    </p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                        {tabStepBlockMessages.map((m, i) => (
                                            <li key={`tab-block-${i}`}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            {serverFieldErrors.length > 0 ? (
                                <div>
                                    <p className="font-medium text-foreground">The server rejected the form. Fix the following and try again:</p>
                                    <ul className="mt-1 max-h-52 list-disc space-y-0.5 overflow-y-auto pl-4">
                                        {serverFieldErrors.map((m, i) => (
                                            <li key={`srv-err-${i}`}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            {submitError ? <p className="text-foreground">{submitError}</p> : null}
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit}>
                    <Tabs value={activeTab} onValueChange={requestTabChange} className="w-full">
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
                                    <CardDescription className="text-xs">Basic identity, org, contact, address, and uploads</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 text-sm">
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                        {/* Left column: Serial org + basic info (like screenshot) */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Branch Name *</Label>
                                                <div className="space-y-1">
                                                    <ComboSelect value={data.current_branch_id || null} onChange={(v) => setData('current_branch_id', v ?? '')} items={branchItems} placeholder="Select branch" />
                                                    {errors.current_branch_id && <p className="text-xs text-red-500">{errors.current_branch_id}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Employment Type</Label>
                                                <ComboSelect value={data.employee_type_id || null} onChange={(v) => setData('employee_type_id', v ?? '')} items={employeeTypeItems} placeholder="Select employment type" />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Employee Pin *</Label>
                                                <div className="space-y-1">
                                                    <Input value={data.pin} onChange={(e) => setData('pin', e.target.value)} placeholder="01107" />
                                                    {errors.pin && <p className="text-xs text-red-500">{errors.pin}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Employee Name *</Label>
                                                <div className="space-y-1">
                                                    <Input value={data.name_en} onChange={(e) => setData('name_en', e.target.value)} placeholder="Employee Name" />
                                                    {errors.name_en && <p className="text-xs text-red-500">{errors.name_en}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Bengali Name</Label>
                                                <Input value={data.name_bn} onChange={(e) => setData('name_bn', e.target.value)} placeholder="বাংলা নাম" />
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
                                                <Input type="date" value={data.birth_date_certificate} onChange={(e) => setData('birth_date_certificate', e.target.value)} />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Birth Date (Original)</Label>
                                                <Input type="date" value={data.birth_date_original} onChange={(e) => setData('birth_date_original', e.target.value)} />
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
                                                <div className="space-y-1">
                                                    <Input type="date" value={data.joining_date} onChange={(e) => setData('joining_date', e.target.value)} />
                                                    {errors.joining_date && <p className="text-xs text-red-500">{errors.joining_date}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Probation Period</Label>
                                                <Input value={derivedProbationMonths ? `${derivedProbationMonths} months` : ''} readOnly className="bg-gray-100" />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Confirmation Date</Label>
                                                <Input type="date" value={data.confirmation_date} onChange={(e) => setData('confirmation_date', e.target.value)} />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Department *</Label>
                                                <div className="space-y-1">
                                                    <ComboSelect value={data.department_id || null} onChange={(v) => setData('department_id', v ?? '')} items={deptItems} placeholder="Select department" />
                                                    {errors.department_id && <p className="text-xs text-red-500">{errors.department_id}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Designation *</Label>
                                                <div className="space-y-1">
                                                    <ComboSelect value={data.joining_designation_id || null} onChange={(v) => setData('joining_designation_id', v ?? '')} items={desigItems} placeholder="Select designation" />
                                                    {errors.joining_designation_id && <p className="text-xs text-red-500">{errors.joining_designation_id}</p>}
                                                </div>
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

                                        {/* Middle column: IDs + contact + location + address */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">National ID/Smart Card</Label>
                                                <div className="space-y-1">
                                                    <Input
                                                        inputMode="numeric"
                                                        autoComplete="off"
                                                        maxLength={17}
                                                        aria-invalid={!!(errors.nid || errors.smart_card_number || nidOrSmartClientError)}
                                                        value={data.nid}
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

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Birth Registration No</Label>
                                                <Input value={data.birth_registration_number} onChange={(e) => setData('birth_registration_number', e.target.value)} placeholder="Birth Registration No" />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">TIN No</Label>
                                                <Input value={data.tin_certificate_no} onChange={(e) => setData('tin_certificate_no', e.target.value)} placeholder="TIN Certificate No" />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Driving License</Label>
                                                <Input value={data.driving_license_no} onChange={(e) => setData('driving_license_no', e.target.value)} placeholder="Driving License" />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Passport No</Label>
                                                <Input value={data.passport_no} onChange={(e) => setData('passport_no', e.target.value)} placeholder="Passport No" />
                                            </div>

                                            <Label className="flex cursor-pointer flex-row flex-nowrap items-center gap-2 py-1 text-xs leading-none">
                                                <span className="select-none">Is Project Employee</span>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 shrink-0"
                                                    checked={data.is_project_employee}
                                                    onChange={(e) => setData('is_project_employee', e.target.checked)}
                                                />
                                            </Label>

                                            <Label className="flex cursor-pointer flex-row flex-nowrap items-center gap-2 py-1 text-xs leading-none">
                                                <span className="select-none">Is Custodian</span>
                                                <input type="checkbox" className="h-4 w-4 shrink-0" checked={data.is_custodian} onChange={(e) => setData('is_custodian', e.target.checked)} />
                                            </Label>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Identification Mark</Label>
                                                <Input value={data.identification_mark} onChange={(e) => setData('identification_mark', e.target.value)} placeholder="Identification Mark" />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Email Address</Label>
                                                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="Email Address" />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Mobile No(Personal) *</Label>
                                                <div className="space-y-1">
                                                    <Input value={data.mobile_personal} onChange={(e) => setData('mobile_personal', e.target.value)} placeholder="Mobile No(Personal)" />
                                                    {errors.mobile_personal && <p className="text-xs text-red-500">{errors.mobile_personal}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Mobile No(Official)</Label>
                                                <Input value={data.mobile_official} onChange={(e) => setData('mobile_official', e.target.value)} placeholder="Mobile No(Official)" />
                                            </div>

                                            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                                                <div className="min-w-0 space-y-2">
                                                    <div className="pt-2 text-xs font-medium text-muted-foreground">Permanent Address</div>

                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Division</Label>
                                                        <ComboSelect
                                                            value={data.addresses[1]?.division || null}
                                                            onChange={(v) => setPermanentAddress({ division: v ?? '', district: '', upazila: '', union: '', village: '' })}
                                                            items={divisionItems}
                                                            placeholder="Division"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">District</Label>
                                                        <ComboSelect
                                                            value={data.addresses[1]?.district || null}
                                                            onChange={(v) => setPermanentAddress({ district: v ?? '', upazila: '', union: '', village: '' })}
                                                            items={permDistrictItems}
                                                            placeholder="District"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Thana/Upazilla</Label>
                                                        <ComboSelect
                                                            value={data.addresses[1]?.upazila || null}
                                                            onChange={(v) => setPermanentAddress({ upazila: v ?? '', union: '', village: '' })}
                                                            items={permUpazilaItems}
                                                            placeholder="Upazila"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Union</Label>
                                                        <ComboSelect
                                                            value={data.addresses[1]?.union || null}
                                                            onChange={(v) => setPermanentAddress({ union: v ?? '', village: '' })}
                                                            items={permUnionItems}
                                                            placeholder="Union"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Village</Label>
                                                        <div className="flex min-w-0 gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <ComboSelect
                                                                    value={data.addresses[1]?.village || null}
                                                                    onChange={(v) => setPermanentAddress({ village: v ?? '' })}
                                                                    items={permVillageItems}
                                                                    placeholder="Select Village"
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="shrink-0"
                                                                onClick={() => {
                                                                    if (!canOpenVillageModal('permanent')) return;
                                                                    setAddVillageModal({ open: true, target: 'permanent', name: '', error: '', saving: false });
                                                                }}
                                                                title="Add village"
                                                                disabled={!canOpenVillageModal('permanent')}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="min-w-0 space-y-2">
                                                    <div className="flex flex-col gap-2 pt-2">
                                                        <div className="text-xs font-medium text-muted-foreground">Present Address</div>
                                                        <Label className="flex cursor-pointer flex-row flex-nowrap items-center gap-2 text-xs leading-none">
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
                                                    </div>

                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Division</Label>
                                                        <ComboSelect
                                                            value={data.addresses[0]?.division || null}
                                                            onChange={(v) => {
                                                                setPresentAddress({ division: v ?? '', district: '', upazila: '', union: '', village: '' });
                                                            }}
                                                            items={divisionItems}
                                                            placeholder="Division"
                                                            disabled={sameAsPermanent}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">District</Label>
                                                        <ComboSelect
                                                            value={data.addresses[0]?.district || null}
                                                            onChange={(v) => {
                                                                setPresentAddress({ district: v ?? '', upazila: '', union: '', village: '' });
                                                            }}
                                                            items={districtItems}
                                                            placeholder="District"
                                                            disabled={sameAsPermanent}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Thana/Upazilla</Label>
                                                        <ComboSelect
                                                            value={data.addresses[0]?.upazila || null}
                                                            onChange={(v) => {
                                                                setPresentAddress({ upazila: v ?? '', union: '', village: '' });
                                                            }}
                                                            items={upazilaItems}
                                                            placeholder="Upazila"
                                                            disabled={sameAsPermanent}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Union</Label>
                                                        <ComboSelect
                                                            value={data.addresses[0]?.union || null}
                                                            onChange={(v) => {
                                                                setPresentAddress({ union: v ?? '', village: '' });
                                                            }}
                                                            items={presentUnionItems}
                                                            placeholder="Union"
                                                            disabled={sameAsPermanent}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-[minmax(0,110px),1fr] items-start gap-2 sm:grid-cols-[150px,1fr]">
                                                        <Label className="pt-2 text-xs">Village</Label>
                                                        <div className="flex min-w-0 gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <ComboSelect
                                                                    value={data.addresses[0]?.village || null}
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
                                                                className="shrink-0"
                                                                onClick={() => {
                                                                    if (!canOpenVillageModal('present')) return;
                                                                    setAddVillageModal({ open: true, target: 'present', name: '', error: '', saving: false });
                                                                }}
                                                                title="Add village"
                                                                disabled={sameAsPermanent || !canOpenVillageModal('present')}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right column: uploads */}
                                        <div className="space-y-4">
                                            <div className="rounded-lg border bg-card p-4 shadow-sm">
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <div>
                                                        <div className="text-xs font-medium">Employee photo</div>
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">Passport-style face, well lit</p>
                                                    </div>
                                                    {photoPreview && (
                                                        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={clearPhotoUpload}>
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                                    <div
                                                        className={cn(
                                                            'relative mx-auto flex h-36 w-36 shrink-0 overflow-hidden rounded-xl border bg-muted ring-1 ring-border sm:mx-0',
                                                            photoPreview && 'ring-primary/20',
                                                        )}
                                                    >
                                                        {photoPreview ? (
                                                            <img src={photoPreview} className="h-full w-full object-cover" alt="Photo preview" />
                                                        ) : (
                                                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-muted to-muted/70">
                                                                <User className="h-16 w-16 text-muted-foreground/55" strokeWidth={1.25} aria-hidden />
                                                                <span className="text-[10px] font-medium text-muted-foreground">Default avatar</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <input
                                                            ref={photoFileInputRef}
                                                            id="employee-create-photo"
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                                            className="sr-only"
                                                            onChange={(e) => {
                                                                applyPhotoFile(e.target.files?.[0] ?? null);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Upload employee photo"
                                                            onClick={() => photoFileInputRef.current?.click()}
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                setPhotoDropActive(true);
                                                            }}
                                                            onDragLeave={() => setPhotoDropActive(false)}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                setPhotoDropActive(false);
                                                                applyPhotoFile(e.dataTransfer.files?.[0] ?? null);
                                                            }}
                                                            className={cn(
                                                                'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                                                photoDropActive
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-muted-foreground/25 hover:border-muted-foreground/45 hover:bg-muted/40',
                                                            )}
                                                        >
                                                            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
                                                            <div className="space-y-0.5">
                                                                <span className="text-xs font-medium">Drop image here or click to browse</span>
                                                                <span className="block text-[11px] text-muted-foreground">JPG, PNG or WebP · max ~5 MB recommended</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border bg-card p-4 shadow-sm">
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <div>
                                                        <div className="text-xs font-medium">Signature</div>
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">Upload a scan on plain white paper</p>
                                                    </div>
                                                    {signaturePreview && (
                                                        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={clearSignatureUpload}>
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                                <div
                                                    className={cn(
                                                        'relative mb-3 flex h-28 w-full overflow-hidden rounded-lg border bg-background',
                                                        !signaturePreview && 'bg-gradient-to-b from-muted to-background',
                                                    )}
                                                >
                                                    {signaturePreview ? (
                                                        <img
                                                            src={signaturePreview}
                                                            className="h-full w-full object-contain object-left p-2"
                                                            alt="Signature preview"
                                                        />
                                                    ) : (
                                                        <div className="relative flex h-full w-full flex-col items-center justify-center gap-1 px-3">
                                                            <SignatureDemoGraphic className="absolute left-1/2 top-[42%] h-16 w-[min(100%,280px)] -translate-x-1/2 -translate-y-1/2" />
                                                            <span className="relative z-[1] rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                                                                Demo — your file replaces this
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <input
                                                        ref={signatureFileInputRef}
                                                        id="employee-create-signature"
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                                        className="sr-only"
                                                        onChange={(e) => {
                                                            applySignatureFile(e.target.files?.[0] ?? null);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label="Upload signature image"
                                                        onClick={() => signatureFileInputRef.current?.click()}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setSignatureDropActive(true);
                                                        }}
                                                        onDragLeave={() => setSignatureDropActive(false)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            setSignatureDropActive(false);
                                                            applySignatureFile(e.dataTransfer.files?.[0] ?? null);
                                                        }}
                                                        className={cn(
                                                            'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                                            signatureDropActive
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-muted-foreground/25 hover:border-muted-foreground/45 hover:bg-muted/40',
                                                        )}
                                                    >
                                                        <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
                                                        <div className="space-y-0.5">
                                                            <span className="text-xs font-medium">Drop signature scan or click to browse</span>
                                                            <span className="block text-[11px] text-muted-foreground">Dark ink on white · JPG or PNG</span>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4">
                                    <Button type="button" className="ml-auto" onClick={() => requestTabChange('education')}>
                                        Next: Educational Setup
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="education">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Educational Setup</CardTitle>
                                    <CardDescription className="text-xs">Add multiple education items</CardDescription>
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
                                    {data.educations.map((ed, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Item {idx + 1}</div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setData('educations', data.educations.filter((_, i) => i !== idx))}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Degree</Label>
                                                    <Input
                                                        value={ed.degree}
                                                        onChange={(e) => {
                                                            const next = [...data.educations];
                                                            next[idx] = { ...next[idx], degree: e.target.value };
                                                            setData('educations', next);
                                                        }}
                                                        placeholder="e.g. SSC"
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Institute</Label>
                                                    <Input
                                                        value={ed.institute}
                                                        onChange={(e) => {
                                                            const next = [...data.educations];
                                                            next[idx] = { ...next[idx], institute: e.target.value };
                                                            setData('educations', next);
                                                        }}
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Board</Label>
                                                    <ComboSelect
                                                        value={ed.board || null}
                                                        onChange={(v) => {
                                                            const next = [...data.educations];
                                                            next[idx] = { ...next[idx], board: v ?? '' };
                                                            setData('educations', next);
                                                        }}
                                                        items={educationBoards.map((b) => ({ value: b, label: b }))}
                                                        placeholder="Select board"
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Group</Label>
                                                    <Input
                                                        value={ed.group_name}
                                                        onChange={(e) => {
                                                            const next = [...data.educations];
                                                            next[idx] = { ...next[idx], group_name: e.target.value };
                                                            setData('educations', next);
                                                        }}
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Label className="text-xs">Subject</Label>
                                                    <Input
                                                        value={ed.subject}
                                                        onChange={(e) => {
                                                            const next = [...data.educations];
                                                            next[idx] = { ...next[idx], subject: e.target.value };
                                                            setData('educations', next);
                                                        }}
                                                    />
                                                </div>
                                                <div className={`${RF_CELL} min-w-[17rem] shrink-0 lg:min-w-[19rem]`}>
                                                    <Label className="text-xs">Result</Label>
                                                    <div className="flex gap-2">
                                                        <div className="w-[9.75rem] shrink-0">
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
                                                                placeholder="Type"
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <Input
                                                                value={ed.result_value}
                                                                onChange={(e) => {
                                                                    const next = [...data.educations];
                                                                    next[idx] = { ...next[idx], result_value: e.target.value };
                                                                    setData('educations', next);
                                                                }}
                                                                placeholder="Value"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('general')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('salary')}>
                                        Next: Salary
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="salary">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <CardTitle className="text-base">Salary</CardTitle>
                                    <CardDescription className="text-xs">Grade/Step (skippable for now)</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 text-sm text-muted-foreground">This section is skippable now.</CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('education')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('bank')}>
                                        Skip / Next: Bank
                                    </Button>
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
                                                items={banks.map((b) => ({ value: b, label: b }))}
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
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('salary')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('nominee')}>
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
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('nominees', [...data.nominees, { name: '', relation: '', date_of_birth: '', share: '', contact: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Nominee
                                        </Button>
                                    </div>
                                    {data.nominees.map((n, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Nominee {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('nominees', data.nominees.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={n.name} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <ComboSelect
                                                        value={n.relation || null}
                                                        onChange={(v) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, relation: v ?? '' } : x)))}
                                                        items={relations.map((r) => ({ value: r, label: r }))}
                                                        placeholder="Relation"
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={n.contact} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, contact: e.target.value } : x)))} placeholder="Contact" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input type="date" value={n.date_of_birth} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, date_of_birth: e.target.value } : x)))} />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={n.share} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, share: e.target.value } : x)))} placeholder="Share" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('bank')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('guarantor')}>
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
                                    {data.guarantors.map((g, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Guarantor {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('guarantors', data.guarantors.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={g.name} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={g.age} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, age: e.target.value } : x)))} placeholder="Age" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={g.occupation} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, occupation: e.target.value } : x)))} placeholder="Occupation" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <ComboSelect
                                                        value={g.relation || null}
                                                        onChange={(v) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, relation: v ?? '' } : x)))}
                                                        items={relations.map((r) => ({ value: r, label: r }))}
                                                        placeholder="Relation"
                                                    />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={g.phone} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, phone: e.target.value } : x)))} placeholder="Phone" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={g.email} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, email: e.target.value } : x)))} placeholder="Email" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('guarantor_cheques', [...data.guarantor_cheques, { bank_name: '', branch_name: '', cheque_no: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Cheque
                                        </Button>
                                    </div>
                                    {data.guarantor_cheques.map((c, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className={RF_ROW_CTR}>
                                                <div className={RF_CELL}>
                                                    <ComboSelect value={c.bank_name || null} onChange={(v) => setData('guarantor_cheques', data.guarantor_cheques.map((x, i) => (i === idx ? { ...x, bank_name: v ?? '' } : x)))} items={banks.map((b) => ({ value: b, label: b }))} placeholder="Bank" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={c.branch_name} onChange={(e) => setData('guarantor_cheques', data.guarantor_cheques.map((x, i) => (i === idx ? { ...x, branch_name: e.target.value } : x)))} placeholder="Branch" />
                                                </div>
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <Input className="min-w-0 flex-1" value={c.cheque_no} onChange={(e) => setData('guarantor_cheques', data.guarantor_cheques.map((x, i) => (i === idx ? { ...x, cheque_no: e.target.value } : x)))} placeholder="Cheque No" />
                                                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setData('guarantor_cheques', data.guarantor_cheques.filter((_, i) => i !== idx))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('nominee')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('collateral')}>
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
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={data.collateral.has_certificate}
                                            onChange={(e) => setData('collateral', { ...data.collateral, has_certificate: e.target.checked })}
                                        />
                                        Certificate
                                    </label>
                                    {data.collateral.has_certificate && (
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
                                        <div className="space-y-2">
                                            <Label className="text-xs">Security Amount</Label>
                                            <Input value={data.collateral.security_amount} onChange={(e) => setData('collateral', { ...data.collateral, security_amount: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Collateral Interest</Label>
                                            <Input value={data.collateral.collateral_interest} onChange={(e) => setData('collateral', { ...data.collateral, collateral_interest: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Collateral Date</Label>
                                            <Input type="date" value={data.collateral.collateral_date} onChange={(e) => setData('collateral', { ...data.collateral, collateral_date: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Notes</Label>
                                        <Textarea rows={2} value={data.collateral.notes} onChange={(e) => setData('collateral', { ...data.collateral, notes: e.target.value })} />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('collateral_receive_cheques', [...data.collateral_receive_cheques, { bank_name: '', branch_name: '', cheque_no: '', notes: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Receive Cheque
                                        </Button>
                                    </div>
                                    {data.collateral_receive_cheques.map((c, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className={RF_ROW_CTR}>
                                                <div className={RF_CELL}>
                                                    <ComboSelect value={c.bank_name || null} onChange={(v) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, bank_name: v ?? '' } : x)))} items={banks.map((b) => ({ value: b, label: b }))} placeholder="Bank" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={c.branch_name} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, branch_name: e.target.value } : x)))} placeholder="Branch" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={c.cheque_no} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, cheque_no: e.target.value } : x)))} placeholder="Cheque No" />
                                                </div>
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <Input className="min-w-0 flex-1" value={c.notes || ''} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))} placeholder="Notes" />
                                                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setData('collateral_receive_cheques', data.collateral_receive_cheques.filter((_, i) => i !== idx))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('guarantor')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('asset')}>
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
                                    {data.assets.map((a, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Asset {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('assets', data.assets.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={a.serial} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, serial: e.target.value } : x)))} placeholder="Serial" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={a.asset_no} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, asset_no: e.target.value } : x)))} placeholder="Asset No" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={a.name} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={a.provided_quality} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, provided_quality: e.target.value } : x)))} placeholder="Provided Quality" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={a.asset_price} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, asset_price: e.target.value } : x)))} placeholder="Asset Price" />
                                                </div>
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={a.details} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, details: e.target.value } : x)))} placeholder="Details" />
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('collateral')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('experience')}>
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
                                    {data.experiences.map((ex, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Experience {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('experiences', data.experiences.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={ex.organization} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, organization: e.target.value } : x)))} placeholder="Organization" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input type="date" value={ex.from_date} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, from_date: e.target.value } : x)))} />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input type="date" value={ex.to_date} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, to_date: e.target.value } : x)))} />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={ex.designation} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, designation: e.target.value } : x)))} placeholder="Designation" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={ex.department} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, department: e.target.value } : x)))} placeholder="Department" />
                                                </div>
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={ex.address} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, address: e.target.value } : x)))} placeholder="Address" />
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('asset')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('training')}>
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
                                    {data.trainings.map((t, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Training {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('trainings', data.trainings.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW}>
                                                <div className={RF_CELL}>
                                                    <Input value={t.training_title} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, training_title: e.target.value } : x)))} placeholder="Training Title" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={t.institute} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, institute: e.target.value } : x)))} placeholder="Institute" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={t.duration} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, duration: e.target.value } : x)))} placeholder="Duration" />
                                                </div>
                                                <div className={RF_CELL}>
                                                    <Input value={t.address} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, address: e.target.value } : x)))} placeholder="Address" />
                                                </div>
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={t.remarks} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, remarks: e.target.value } : x)))} placeholder="Remarks" />
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="flex justify-between border-t bg-gray-50 px-6 py-4">
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('experience')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => requestTabChange('documents')}>
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
                                        Add multiple files (National ID, passport, certificates, etc.). Max 5MB each — PDF, images, DOC/DOCX.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setData('documents', [...data.documents, newEmployeeDocumentFormRow()])}
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Add document
                                        </Button>
                                    </div>
                                    {data.documents.length === 0 ? (
                                        <p className="text-center text-sm text-muted-foreground">No documents yet. Click &quot;Add document&quot; to upload.</p>
                                    ) : null}
                                    {data.documents.map((doc, idx) => (
                                        <div key={doc.clientKey} className="space-y-3 rounded-md border p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">Document {idx + 1}</div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setData('documents', data.documents.filter((_, i) => i !== idx))}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className={RF_ROW_TOP}>
                                                <div className={`${RF_CELL} min-w-[8.5rem]`}>
                                                    <Label className="text-xs">Document type</Label>
                                                    <select
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                        value={doc.document_type}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                data.documents.map((d, i) =>
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
                                                        value={doc.title}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                data.documents.map((d, i) => (i === idx ? { ...d, title: e.target.value } : d))
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
                                                        type="date"
                                                        value={doc.expiry_date}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                data.documents.map((d, i) => (i === idx ? { ...d, expiry_date: e.target.value } : d))
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
                                                                        data.documents.map((d, i) => (i === idx ? { ...d, file: f } : d))
                                                                    );
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                    {doc.existing_file_path && !doc.file ? (
                                                        <p className="text-[11px] text-muted-foreground">Current: {doc.existing_file_path.split('/').pop()}</p>
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
                                                        value={doc.description}
                                                        onChange={(e) =>
                                                            setData(
                                                                'documents',
                                                                data.documents.map((d, i) => (i === idx ? { ...d, description: e.target.value } : d))
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
                                    <Button type="button" variant="outline" onClick={() => requestTabChange('training')}>
                                        Back
                                    </Button>
                                    <Button type="submit" disabled={processing} className="bg-green-600 hover:bg-green-700">
                                        {processing ? 'Creating...' : 'Create Employee'}
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
