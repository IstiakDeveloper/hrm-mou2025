import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
    EMPLOYEE_V2_CREATE_DRAFT_KEY,
    asInputPatch,
    clearEmployeeDraft,
    hasPatchKeys,
    loadEmployeeDraft,
    mergeSerializableIntoForm,
    saveEmployeeDraft,
    toSerializableEmployeeForm,
} from '@/lib/employee-v2-form-persist';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react';
import { format } from 'date-fns';

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
    };
}

function buildInitialCreateForm(oldInput: unknown): EmployeeCreateFormData {
    const defaults = getCreateFormDefaults();

    const fromServer = asInputPatch(oldInput);
    if (hasPatchKeys(fromServer)) {
        return mergeSerializableIntoForm(defaults, fromServer) as EmployeeCreateFormData;
    }

    const fromDraft = loadEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY);
    if (fromDraft) {
        return mergeSerializableIntoForm(defaults, fromDraft as Record<string, unknown>) as EmployeeCreateFormData;
    }

    return defaults;
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
    oldInput,
    errors: errorsProp = {},
}: EmployeeCreateProps) {
    const initialForm = useMemo(() => buildInitialCreateForm(oldInput), [oldInput]);

    const { data, setData, post, processing, errors: formErrors } = useForm(initialForm);

    const errors = { ...errorsProp, ...formErrors } as Record<string, string | undefined>;
    const submitError = errors['submit'];

    const csrfToken = useMemo(() => {
        const el = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
        return el?.content ?? '';
    }, []);

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
        const next = mergeSerializableIntoForm(getCreateFormDefaults(), patch) as EmployeeCreateFormData;
        setData({ ...next, photo: null });
    }, [oldInput, setData]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            saveEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY, toSerializableEmployeeForm(data as any));
        }, 450);
        return () => window.clearTimeout(handle);
    }, [data]);

    const [activeTab, setActiveTab] = useState('general');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

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

    const branchItems: ComboSelectItem<string>[] = branches.map((b) => ({ value: String(b.id), label: b.name }));
    const deptItems: ComboSelectItem<string>[] = departments.map((d) => ({ value: String(d.id), label: d.name }));
    const desigItems: ComboSelectItem<string>[] = designations.map((d) => ({ value: String(d.id), label: d.name }));
    const employeeTypeItems: ComboSelectItem<string>[] = employeeTypes.map((t) => ({ value: String(t.id), label: t.name, keywords: `probation ${t.probation_months}` }));
    const programItems: ComboSelectItem<string>[] = programs.map((p) => ({ value: String(p.id), label: p.name, keywords: p.type }));
    const projectItems: ComboSelectItem<string>[] = projects.map((p) => ({ value: String(p.id), label: p.name }));

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
        setData('addresses', next);
    };

    const isSpouseRequired = ['Married', 'Widowed', 'Separated'].includes(data.marital_status);

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

    const [sameAsPresent, setSameAsPresent] = useState(false);

    const addVillage = async () => {
        const division = data.addresses[0]?.division || '';
        const district = data.addresses[0]?.district || '';
        const upazila = data.addresses[0]?.upazila || '';
        const union = data.addresses[0]?.union || '';
        if (!division || !district || !upazila || !union) return;
        const name = window.prompt('New village name');
        if (!name) return;
        try {
            const res = await fetch(route('employees.villages.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
                body: JSON.stringify({ division, district, upazila, union, name }),
            });
            if (!res.ok) return;
            const j = await res.json();
            const createdName = (j?.village?.name ?? j?.name ?? name) as string;
            const key = `p:${upazila}:${union}`;
            setExtraVillages((prev) => {
                const arr = prev[key] ?? [];
                return { ...prev, [key]: Array.from(new Set([...arr, createdName])) };
            });
            setPresentAddress({ village: createdName });
        } catch {
            // ignore
        }
    };

    const addVillagePermanent = async () => {
        const division = data.addresses[1]?.division || '';
        const district = data.addresses[1]?.district || '';
        const upazila = data.addresses[1]?.upazila || '';
        const union = data.addresses[1]?.union || '';
        if (!division || !district || !upazila || !union) return;
        const name = window.prompt('New village name');
        if (!name) return;
        try {
            const res = await fetch(route('employees.villages.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
                body: JSON.stringify({ division, district, upazila, union, name }),
            });
            if (!res.ok) return;
            const j = await res.json();
            const createdName = (j?.village?.name ?? j?.name ?? name) as string;
            const key = `r:${upazila}:${union}`;
            setExtraVillages((prev) => {
                const arr = prev[key] ?? [];
                return { ...prev, [key]: Array.from(new Set([...arr, createdName])) };
            });
            setPermanentAddress({ village: createdName });
        } catch {
            // ignore
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('employees.store'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => clearEmployeeDraft(EMPLOYEE_V2_CREATE_DRAFT_KEY),
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

                {submitError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Could not save</AlertTitle>
                        <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 mb-6">
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
                                                <Input value={data.religion} onChange={(e) => setData('religion', e.target.value)} placeholder="Select Religion" />
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
                                                <Label className="pt-2 text-xs">National Id</Label>
                                                <div className="space-y-1">
                                                    <Input value={data.nid} onChange={(e) => setData('nid', e.target.value)} placeholder="National ID" />
                                                    {errors.nid && <p className="text-xs text-red-500">{errors.nid}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Smart Card</Label>
                                                <Input value={data.smart_card_number} onChange={(e) => setData('smart_card_number', e.target.value)} placeholder="Smart Card" />
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

                                            <div className="grid grid-cols-[150px,1fr] items-center gap-2">
                                                <Label className="text-xs">Is Project Employee</Label>
                                                <input type="checkbox" className="h-4 w-4" checked={data.is_project_employee} onChange={(e) => setData('is_project_employee', e.target.checked)} />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-center gap-2">
                                                <Label className="text-xs">Is Custodian</Label>
                                                <input type="checkbox" className="h-4 w-4" checked={data.is_custodian} onChange={(e) => setData('is_custodian', e.target.checked)} />
                                            </div>

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

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Division</Label>
                                                <ComboSelect
                                                    value={data.addresses[0]?.division || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ division: v ?? '', district: '', upazila: '', union: '', village: '' });
                                                    }}
                                                    items={divisionItems}
                                                    placeholder="Division"
                                                />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">District</Label>
                                                <ComboSelect
                                                    value={data.addresses[0]?.district || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ district: v ?? '', upazila: '', union: '', village: '' });
                                                    }}
                                                    items={districtItems}
                                                    placeholder="District"
                                                />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Thana/Upazilla</Label>
                                                <ComboSelect
                                                    value={data.addresses[0]?.upazila || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ upazila: v ?? '', union: '', village: '' });
                                                    }}
                                                    items={upazilaItems}
                                                    placeholder="Upazila"
                                                />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Union</Label>
                                                <ComboSelect
                                                    value={data.addresses[0]?.union || null}
                                                    onChange={(v) => {
                                                        setPresentAddress({ union: v ?? '', village: '' });
                                                    }}
                                                    items={presentUnionItems}
                                                    placeholder="Union"
                                                />
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Village</Label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <ComboSelect
                                                            value={data.addresses[0]?.village || null}
                                                            onChange={(v) => {
                                                                setPresentAddress({ village: v ?? '' });
                                                            }}
                                                            items={presentVillageItems}
                                                            placeholder="Select Village"
                                                        />
                                                    </div>
                                                    <Button type="button" variant="outline" size="icon" onClick={addVillage} title="Add village">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[150px,1fr] items-center gap-2">
                                                <Label className="text-xs">Same as Present Address</Label>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={sameAsPresent}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setSameAsPresent(checked);
                                                        if (!checked) return;
                                                        const next = [...data.addresses];
                                                        next[1] = { ...next[1], ...next[0], type: 'permanent' };
                                                        next[1] = { ...next[1], address_details: buildAddressDetails(next[1]) };
                                                        setData('addresses', next);
                                                    }}
                                                />
                                            </div>

                                            <div className="pt-2 text-xs font-medium text-muted-foreground">Permanent Address (Selected Item)</div>

                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Division</Label>
                                                <ComboSelect
                                                    value={data.addresses[1]?.division || null}
                                                    onChange={(v) => setPermanentAddress({ division: v ?? '', district: '', upazila: '', union: '', village: '' })}
                                                    items={divisionItems}
                                                    placeholder="Division"
                                                    disabled={sameAsPresent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">District</Label>
                                                <ComboSelect
                                                    value={data.addresses[1]?.district || null}
                                                    onChange={(v) => setPermanentAddress({ district: v ?? '', upazila: '', union: '', village: '' })}
                                                    items={permDistrictItems}
                                                    placeholder="District"
                                                    disabled={sameAsPresent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Thana/Upazilla</Label>
                                                <ComboSelect
                                                    value={data.addresses[1]?.upazila || null}
                                                    onChange={(v) => setPermanentAddress({ upazila: v ?? '', union: '', village: '' })}
                                                    items={permUpazilaItems}
                                                    placeholder="Upazila"
                                                    disabled={sameAsPresent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Union</Label>
                                                <ComboSelect
                                                    value={data.addresses[1]?.union || null}
                                                    onChange={(v) => setPermanentAddress({ union: v ?? '', village: '' })}
                                                    items={permUnionItems}
                                                    placeholder="Union"
                                                    disabled={sameAsPresent}
                                                />
                                            </div>
                                            <div className="grid grid-cols-[150px,1fr] items-start gap-2">
                                                <Label className="pt-2 text-xs">Village</Label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <ComboSelect
                                                            value={data.addresses[1]?.village || null}
                                                            onChange={(v) => setPermanentAddress({ village: v ?? '' })}
                                                            items={permVillageItems}
                                                            placeholder="Select Village"
                                                            disabled={sameAsPresent}
                                                        />
                                                    </div>
                                                    <Button type="button" variant="outline" size="icon" onClick={addVillagePermanent} title="Add village" disabled={sameAsPresent}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right column: uploads */}
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
                                <CardFooter className="border-t bg-gray-50 px-6 py-4">
                                    <Button type="button" className="ml-auto" onClick={() => setActiveTab('education')}>
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
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <div className="space-y-1">
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
                                                <div className="space-y-1">
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
                                                <div className="space-y-1">
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
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <div className="space-y-1">
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
                                                <div className="space-y-1">
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
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Result</Label>
                                                    <div className="grid grid-cols-2 gap-2">
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
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('general')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('salary')}>
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
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('education')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('bank')}>
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
                                            <Input value={data.bank.branch_name} onChange={(e) => setData('bank', { ...data.bank, branch_name: e.target.value })} />
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
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <Input value={n.name} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                <ComboSelect
                                                    value={n.relation || null}
                                                    onChange={(v) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, relation: v ?? '' } : x)))}
                                                    items={relations.map((r) => ({ value: r, label: r }))}
                                                    placeholder="Relation"
                                                />
                                                <Input value={n.contact} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, contact: e.target.value } : x)))} placeholder="Contact" />
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <Input type="date" value={n.date_of_birth} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, date_of_birth: e.target.value } : x)))} />
                                                <Input value={n.share} onChange={(e) => setData('nominees', data.nominees.map((x, i) => (i === idx ? { ...x, share: e.target.value } : x)))} placeholder="Share" />
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
                                    {data.guarantors.map((g, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Guarantor {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('guarantors', data.guarantors.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <Input value={g.name} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                                <Input value={g.age} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, age: e.target.value } : x)))} placeholder="Age" />
                                                <Input value={g.occupation} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, occupation: e.target.value } : x)))} placeholder="Occupation" />
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <ComboSelect
                                                    value={g.relation || null}
                                                    onChange={(v) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, relation: v ?? '' } : x)))}
                                                    items={relations.map((r) => ({ value: r, label: r }))}
                                                    placeholder="Relation"
                                                />
                                                <Input value={g.phone} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, phone: e.target.value } : x)))} placeholder="Phone" />
                                                <Input value={g.email} onChange={(e) => setData('guarantors', data.guarantors.map((x, i) => (i === idx ? { ...x, email: e.target.value } : x)))} placeholder="Email" />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setData('guarantor_cheques', [...data.guarantor_cheques, { bank_name: '', branch_name: '', cheque_no: '' }])}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Cheque
                                        </Button>
                                    </div>
                                    {data.guarantor_cheques.map((c, idx) => (
                                        <div key={idx} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-3">
                                            <ComboSelect value={c.bank_name || null} onChange={(v) => setData('guarantor_cheques', data.guarantor_cheques.map((x, i) => (i === idx ? { ...x, bank_name: v ?? '' } : x)))} items={banks.map((b) => ({ value: b, label: b }))} placeholder="Bank" />
                                            <Input value={c.branch_name} onChange={(e) => setData('guarantor_cheques', data.guarantor_cheques.map((x, i) => (i === idx ? { ...x, branch_name: e.target.value } : x)))} placeholder="Branch" />
                                            <div className="flex gap-2">
                                                <Input value={c.cheque_no} onChange={(e) => setData('guarantor_cheques', data.guarantor_cheques.map((x, i) => (i === idx ? { ...x, cheque_no: e.target.value } : x)))} placeholder="Cheque No" />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => setData('guarantor_cheques', data.guarantor_cheques.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                                                        checked={data.collateral.certificate_levels.includes(lvl)}
                                                        onChange={(e) => {
                                                            const next = new Set(data.collateral.certificate_levels);
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
                                        <div key={idx} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-4">
                                            <ComboSelect value={c.bank_name || null} onChange={(v) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, bank_name: v ?? '' } : x)))} items={banks.map((b) => ({ value: b, label: b }))} placeholder="Bank" />
                                            <Input value={c.branch_name} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, branch_name: e.target.value } : x)))} placeholder="Branch" />
                                            <Input value={c.cheque_no} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, cheque_no: e.target.value } : x)))} placeholder="Cheque No" />
                                            <div className="flex gap-2">
                                                <Input value={c.notes || ''} onChange={(e) => setData('collateral_receive_cheques', data.collateral_receive_cheques.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))} placeholder="Notes" />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => setData('collateral_receive_cheques', data.collateral_receive_cheques.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                                    {data.assets.map((a, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Asset {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('assets', data.assets.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <Input value={a.serial} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, serial: e.target.value } : x)))} placeholder="Serial" />
                                                <Input value={a.asset_no} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, asset_no: e.target.value } : x)))} placeholder="Asset No" />
                                                <Input value={a.name} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <Input value={a.provided_quality} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, provided_quality: e.target.value } : x)))} placeholder="Provided Quality" />
                                                <Input value={a.asset_price} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, asset_price: e.target.value } : x)))} placeholder="Asset Price" />
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={a.details} onChange={(e) => setData('assets', data.assets.map((x, i) => (i === idx ? { ...x, details: e.target.value } : x)))} placeholder="Details" />
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
                                    {data.experiences.map((ex, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Experience {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('experiences', data.experiences.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <Input value={ex.organization} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, organization: e.target.value } : x)))} placeholder="Organization" />
                                                <Input type="date" value={ex.from_date} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, from_date: e.target.value } : x)))} />
                                                <Input type="date" value={ex.to_date} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, to_date: e.target.value } : x)))} />
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <Input value={ex.designation} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, designation: e.target.value } : x)))} placeholder="Designation" />
                                                <Input value={ex.department} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, department: e.target.value } : x)))} placeholder="Department" />
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={ex.address} onChange={(e) => setData('experiences', data.experiences.map((x, i) => (i === idx ? { ...x, address: e.target.value } : x)))} placeholder="Address" />
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
                                    {data.trainings.map((t, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-medium">Training {idx + 1}</div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setData('trainings', data.trainings.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <Input value={t.training_title} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, training_title: e.target.value } : x)))} placeholder="Training Title" />
                                                <Input value={t.institute} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, institute: e.target.value } : x)))} placeholder="Institute" />
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <Input value={t.duration} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, duration: e.target.value } : x)))} placeholder="Duration" />
                                                <Input value={t.address} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, address: e.target.value } : x)))} placeholder="Address" />
                                            </div>
                                            <Textarea className="mt-3" rows={2} value={t.remarks} onChange={(e) => setData('trainings', data.trainings.map((x, i) => (i === idx ? { ...x, remarks: e.target.value } : x)))} placeholder="Remarks" />
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('experience')}>
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
        </Layout>
    );
}
