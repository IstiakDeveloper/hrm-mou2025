import React, { useMemo, useState, ChangeEvent, useEffect, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    EMPLOYEE_EDIT_DRAFT_PREFIX,
    asInputPatch,
    clearEmployeeDraft,
    hasPatchKeys,
    loadEmployeeDraft,
    mergeSerializableIntoForm,
    saveEmployeeDraft,
    toSerializableEmployeeForm,
} from '@/lib/employee-form-persist';
import {
    ArrowLeft,
    User,
    Briefcase,
    Building,
    Phone,
    Mail,
    Calendar,
    MapPin,
    Upload,
    Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';

const calculateYmd = (startDate: string | null | undefined, endDate: string | null | undefined): string | null => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    let s = start;
    let e = end;
    if (s.getTime() > e.getTime()) {
        const tmp = s;
        s = e;
        e = tmp;
    }

    let years = e.getFullYear() - s.getFullYear();
    let months = e.getMonth() - s.getMonth();
    let days = e.getDate() - s.getDate();

    if (days < 0) {
        const prevMonthLastDay = new Date(e.getFullYear(), e.getMonth(), 0);
        days += prevMonthLastDay.getDate();
        months -= 1;
    }
    if (months < 0) {
        months += 12;
        years -= 1;
    }

    years = Math.max(0, years);
    months = Math.max(0, months);
    days = Math.max(0, days);

    return `${years}Y - ${months}M - ${days}D`;
};

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
    employee_id: string;
    pin?: string;
    first_name: string;
    last_name: string;
    name_en?: string;
    name_bn?: string;
    email: string;
    email_id?: string;
    phone: string;
    gender: string;
    blood_group: string;
    date_of_birth: string;
    joining_date: string;
    confirmation_date?: string;
    address: string;
    village?: string;
    post_office?: string;
    union_pouroshova?: string;
    ward_no?: string;
    upazila?: string;
    district?: string;
    educational_qualification?: string;
    photo: string | null;
    nid: string;
    nid_number?: string;
    smart_card_number?: string;
    birth_registration_number?: string;
    emergency_contact: string;
    fathers_name?: string;
    fathers_mobile?: string;
    mothers_name?: string;
    mothers_mobile?: string;
    marital_status?: string;
    spouse_name?: string;
    spouse_mobile?: string;
    department_id: number;
    designation_id: number;
    joining_designation_id?: number;
    last_designation_id?: number;
    current_branch_id: number;
    last_branch_id?: number | null;
    reporting_to: number | null;
    status: string;
    resignation_date?: string;
    dropout_date?: string;
    dropout_reason?: string;
    final_payment_date?: string;
    last_promotion_date?: string;
    probation_period_days?: number | null;
}

type EmployeeEditFormData = {
    _method: string;
    pin: string;
    name_en: string;
    name_bn: string;
    email: string;
    email_id: string;
    phone: string;
    gender: string;
    blood_group: string;
    date_of_birth: string;
    joining_date: string;
    confirmation_date: string;
    address: string;
    village: string;
    post_office: string;
    union_pouroshova: string;
    ward_no: string;
    upazila: string;
    district: string;
    educational_qualification: string;
    photo: File | null;
    nid: string;
    nid_number: string;
    smart_card_number: string;
    birth_registration_number: string;
    emergency_contact: string;
    fathers_name: string;
    fathers_mobile: string;
    mothers_name: string;
    mothers_mobile: string;
    marital_status: string;
    spouse_name: string;
    spouse_mobile: string;
    department_id: string;
    joining_designation_id: string;
    last_designation_id: string;
    current_branch_id: string;
    last_branch_id: string;
    reporting_to: string;
    status: string;
    is_dropout: boolean;
    dropout_date: string;
    dropout_reason: string;
    final_payment_date: string;
    last_promotion_date: string;
};

function employeeToFormBase(employee: Employee): EmployeeEditFormData {
    return {
        _method: 'PUT',
        pin: employee.pin || employee.employee_id || '',
        name_en: employee.name_en || employee.first_name || '',
        name_bn: employee.name_bn || '',
        email: employee.email || '',
        email_id: employee.email_id || '',
        phone: employee.phone || '',
        gender: employee.gender || '',
        blood_group: employee.blood_group || '',
        date_of_birth: employee.date_of_birth || '',
        joining_date: employee.joining_date || format(new Date(), 'yyyy-MM-dd'),
        confirmation_date: employee.confirmation_date || '',
        address: employee.address || '',
        village: employee.village || '',
        post_office: employee.post_office || '',
        union_pouroshova: employee.union_pouroshova || '',
        ward_no: employee.ward_no || '',
        upazila: employee.upazila || '',
        district: employee.district || '',
        educational_qualification: employee.educational_qualification || '',
        photo: null,
        nid: employee.nid || '',
        nid_number: employee.nid_number || '',
        smart_card_number: employee.smart_card_number || '',
        birth_registration_number: employee.birth_registration_number || '',
        emergency_contact: employee.emergency_contact || '',
        fathers_name: employee.fathers_name || '',
        fathers_mobile: employee.fathers_mobile || '',
        mothers_name: employee.mothers_name || '',
        mothers_mobile: employee.mothers_mobile || '',
        marital_status: employee.marital_status || '',
        spouse_name: employee.spouse_name || '',
        spouse_mobile: employee.spouse_mobile || '',
        department_id: employee.department_id?.toString() || '',
        joining_designation_id: (employee.joining_designation_id || employee.designation_id)?.toString() || '',
        last_designation_id: (employee.last_designation_id || employee.designation_id)?.toString() || '',
        current_branch_id: employee.current_branch_id?.toString() || '',
        last_branch_id: employee.last_branch_id?.toString() || '',
        reporting_to: employee.reporting_to?.toString() || '',
        status: employee.status || 'active',
        is_dropout: !!employee.dropout_date,
        dropout_date: employee.dropout_date || '',
        dropout_reason: employee.dropout_reason || '',
        final_payment_date: employee.final_payment_date || '',
        last_promotion_date: employee.last_promotion_date || '',
    };
}

function buildInitialEditForm(employee: Employee, oldInput: unknown): EmployeeEditFormData {
    const base = employeeToFormBase(employee);
    const fromServer = asInputPatch(oldInput);
    if (hasPatchKeys(fromServer)) {
        return mergeSerializableIntoForm(base, fromServer) as EmployeeEditFormData;
    }
    const fromDraft = loadEmployeeDraft(`${EMPLOYEE_EDIT_DRAFT_PREFIX}${employee.id}`);
    if (fromDraft) {
        return mergeSerializableIntoForm(base, fromDraft as Record<string, unknown>) as EmployeeEditFormData;
    }
    return base;
}

interface EmployeeEditProps {
    employee: Employee;
    departments: Department[];
    designations: Designation[];
    branches: Branch[];
    managers: Employee[];
    statuses: string[];
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
    oldInput,
    errors: errorsProp = {},
}: EmployeeEditProps) {
    const initialForm = useMemo(() => buildInitialEditForm(employee, oldInput), [employee, oldInput]);

    const { data, setData, post, processing, errors: formErrors } = useForm(initialForm);

    const errors = { ...errorsProp, ...formErrors } as Record<string, string | undefined>;
    const submitError = errors['submit'];

    const editDraftKey = `${EMPLOYEE_EDIT_DRAFT_PREFIX}${employee.id}`;

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
        const next = mergeSerializableIntoForm(employeeToFormBase(employee), patch) as EmployeeEditFormData;
        setData({ ...next, photo: null });
    }, [oldInput, setData, employee]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            saveEmployeeDraft(
                editDraftKey,
                toSerializableEmployeeForm(data as unknown as Record<string, unknown>)
            );
        }, 450);
        return () => window.clearTimeout(handle);
    }, [data, editDraftKey]);

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('personal');

    const isMarried = (((data as any).marital_status || '') as string).toLowerCase() === 'married';
    const probationYmd = useMemo(
        () => calculateYmd((data as any).joining_date, (data as any).confirmation_date),
        [(data as any).joining_date, (data as any).confirmation_date]
    );

    // Set photo preview if employee has photo
    useEffect(() => {
        if (employee.photo) {
            setPhotoPreview(`/storage/${employee.photo}`);
        }
    }, [employee.photo]);

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setData('photo', file);

            // Create a file reader and properly handle the load event
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target && event.target.result) {
                    setPhotoPreview(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredDesignations = designations;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('employees.update', employee.id), {
            preserveScroll: true,
            onSuccess: () => clearEmployeeDraft(editDraftKey),
        });
    };

    return (
        <Layout>
            <Head title={`Edit Employee: ${employee.name_en || employee.first_name}`} />

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
                    <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
                    <p className="mt-1 text-gray-500">
                        Update employee information for {employee.name_en || employee.first_name}
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
                        <TabsList className="grid w-full grid-cols-5 mb-8">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="family">Family</TabsTrigger>
                            <TabsTrigger value="employment">Employment</TabsTrigger>
                            <TabsTrigger value="service">Service</TabsTrigger>
                            <TabsTrigger value="contact">Contact</TabsTrigger>
                        </TabsList>

                        {/* Personal Information Tab */}
                        <TabsContent value="personal">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-blue-100 p-1.5">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <CardTitle>Personal Information</CardTitle>
                                            <CardDescription>Employee's basic personal details</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    {/* Photo Upload */}
                                    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                                        <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden">
                                            {photoPreview ? (
                                                <>
                                                    <img
                                                        src={photoPreview}
                                                        alt="Employee preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
                                                        <label htmlFor="photo-upload" className="cursor-pointer w-full h-full flex items-center justify-center">
                                                            <Upload className="h-6 w-6 text-white opacity-0 hover:opacity-100" />
                                                        </label>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-center p-4 space-y-2">
                                                        <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                                                        <div className="text-xs text-gray-500">No photo uploaded</div>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
                                                        <label htmlFor="photo-upload" className="cursor-pointer w-full h-full flex items-center justify-center">
                                                            <Upload className="h-6 w-6 text-gray-600 opacity-0 hover:opacity-100" />
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <Label htmlFor="photo-upload">
                                                    Employee Photo <span className="text-gray-500 text-sm">(Optional)</span>
                                                </Label>
                                                <Input
                                                    id="photo-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePhotoChange}
                                                    className="mt-1"
                                                />
                                                {errors.photo && <p className="mt-1 text-sm text-red-500">{errors.photo}</p>}
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Upload a professional photo. Max size 2MB. Formats: JPEG, PNG.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="name_en">
                                                        Name (English) <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="name_en"
                                                        value={(data as any).name_en}
                                                        onChange={e => setData('name_en' as any, e.target.value)}
                                                        placeholder="Enter full name in English"
                                                        required
                                                    />
                                                    {(errors as any).name_en && <p className="mt-1 text-sm text-red-500">{(errors as any).name_en}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="name_bn">
                                                        Name (Bangla)
                                                    </Label>
                                                    <Input
                                                        id="name_bn"
                                                        value={(data as any).name_bn}
                                                        onChange={e => setData('name_bn' as any, e.target.value)}
                                                        placeholder="বাংলায় পূর্ণ নাম লিখুন"
                                                    />
                                                    {(errors as any).name_bn && <p className="mt-1 text-sm text-red-500">{(errors as any).name_bn}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="pin">
                                                Employee Pin <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="pin"
                                                value={(data as any).pin}
                                                onChange={e => setData('pin' as any, e.target.value)}
                                                placeholder="e.g., 1"
                                                required
                                            />
                                            {(errors as any).pin && <p className="mt-1 text-sm text-red-500">{(errors as any).pin}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="nid">
                                                National ID <span className="text-gray-500 text-sm">(Optional)</span>
                                            </Label>
                                            <Input
                                                id="nid"
                                                value={data.nid}
                                                onChange={e => setData('nid', e.target.value)}
                                                placeholder="Enter national ID number"
                                            />
                                            {errors.nid && <p className="mt-1 text-sm text-red-500">{errors.nid}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="gender">Gender</Label>
                                            <Select
                                                value={data.gender}
                                                onValueChange={(value) => setData('gender', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="blood_group">Blood Group</Label>
                                            <Select
                                                value={data.blood_group}
                                                onValueChange={(value) => setData('blood_group', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select blood group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="A+">A+</SelectItem>
                                                    <SelectItem value="A-">A-</SelectItem>
                                                    <SelectItem value="B+">B+</SelectItem>
                                                    <SelectItem value="B-">B-</SelectItem>
                                                    <SelectItem value="AB+">AB+</SelectItem>
                                                    <SelectItem value="AB-">AB-</SelectItem>
                                                    <SelectItem value="O+">O+</SelectItem>
                                                    <SelectItem value="O-">O-</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.blood_group && <p className="mt-1 text-sm text-red-500">{errors.blood_group}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                                            <Input
                                                id="date_of_birth"
                                                type="date"
                                                value={data.date_of_birth}
                                                onChange={(e) => setData('date_of_birth', e.target.value)}
                                            />
                                            {errors.date_of_birth && <p className="mt-1 text-sm text-red-500">{errors.date_of_birth}</p>}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4">
                                    <Button
                                        type="button"
                                        onClick={() => setActiveTab('family')}
                                        className="ml-auto"
                                    >
                                        Next: Family Details
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* Family Tab */}
                        <TabsContent value="family">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-indigo-100 p-1.5">
                                            <User className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <CardTitle>Family Information</CardTitle>
                                            <CardDescription>Parents, marital status and spouse details</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="fathers_name">Father's Name</Label>
                                            <Input
                                                id="fathers_name"
                                                value={(data as any).fathers_name}
                                                onChange={e => setData('fathers_name' as any, e.target.value)}
                                                placeholder="Enter father's name"
                                            />
                                            {(errors as any).fathers_name && <p className="mt-1 text-sm text-red-500">{(errors as any).fathers_name}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="fathers_mobile">Father's Mobile</Label>
                                            <Input
                                                id="fathers_mobile"
                                                value={(data as any).fathers_mobile}
                                                onChange={e => setData('fathers_mobile' as any, e.target.value)}
                                                placeholder="Enter father's mobile"
                                            />
                                            {(errors as any).fathers_mobile && <p className="mt-1 text-sm text-red-500">{(errors as any).fathers_mobile}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mothers_name">Mother's Name</Label>
                                            <Input
                                                id="mothers_name"
                                                value={(data as any).mothers_name}
                                                onChange={e => setData('mothers_name' as any, e.target.value)}
                                                placeholder="Enter mother's name"
                                            />
                                            {(errors as any).mothers_name && <p className="mt-1 text-sm text-red-500">{(errors as any).mothers_name}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mothers_mobile">Mother's Mobile</Label>
                                            <Input
                                                id="mothers_mobile"
                                                value={(data as any).mothers_mobile}
                                                onChange={e => setData('mothers_mobile' as any, e.target.value)}
                                                placeholder="Enter mother's mobile"
                                            />
                                            {(errors as any).mothers_mobile && <p className="mt-1 text-sm text-red-500">{(errors as any).mothers_mobile}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="marital_status">Marital Status</Label>
                                            <Select
                                                value={(data as any).marital_status}
                                                onValueChange={(value) => {
                                                    setData('marital_status' as any, value);
                                                    if ((value || '').toLowerCase() !== 'married') {
                                                        setData('spouse_name' as any, '');
                                                        setData('spouse_mobile' as any, '');
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select marital status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="single">Single</SelectItem>
                                                    <SelectItem value="married">Married</SelectItem>
                                                    <SelectItem value="divorced">Divorced</SelectItem>
                                                    <SelectItem value="widowed">Widowed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {(errors as any).marital_status && <p className="mt-1 text-sm text-red-500">{(errors as any).marital_status}</p>}
                                        </div>

                                        {isMarried && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="spouse_name">Spouse Name</Label>
                                                    <Input
                                                        id="spouse_name"
                                                        value={(data as any).spouse_name}
                                                        onChange={e => setData('spouse_name' as any, e.target.value)}
                                                        placeholder="Enter spouse name"
                                                    />
                                                    {(errors as any).spouse_name && <p className="mt-1 text-sm text-red-500">{(errors as any).spouse_name}</p>}
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="spouse_mobile">Spouse Mobile</Label>
                                                    <Input
                                                        id="spouse_mobile"
                                                        value={(data as any).spouse_mobile}
                                                        onChange={e => setData('spouse_mobile' as any, e.target.value)}
                                                        placeholder="Enter spouse mobile"
                                                    />
                                                    {(errors as any).spouse_mobile && <p className="mt-1 text-sm text-red-500">{(errors as any).spouse_mobile}</p>}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('personal')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('employment')}>
                                        Next: Employment Details
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* Employment Details Tab */}
                        <TabsContent value="employment">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-purple-100 p-1.5">
                                            <Briefcase className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <CardTitle>Employment Details</CardTitle>
                                            <CardDescription>Job role and organizational information</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="department_id">
                                                Department <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={data.department_id}
                                                onValueChange={(value) => {
                                                    setData('department_id', value);
                                                    setData('joining_designation_id' as any, '');
                                                    setData('last_designation_id' as any, '');
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map((department) => (
                                                        <SelectItem key={department.id} value={department.id.toString()}>
                                                            {department.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.department_id && <p className="mt-1 text-sm text-red-500">{errors.department_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="joining_designation_id">
                                                Joining Designation <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={(data as any).joining_designation_id}
                                                onValueChange={(value) => {
                                                    const d = data as EmployeeEditFormData;
                                                    const syncLast =
                                                        !d.last_designation_id ||
                                                        d.last_designation_id === d.joining_designation_id;
                                                    setData({
                                                        ...d,
                                                        joining_designation_id: value,
                                                        last_designation_id: syncLast ? value : d.last_designation_id,
                                                    });
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select joining designation" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredDesignations.map((designation) => (
                                                        <SelectItem key={designation.id} value={designation.id.toString()}>
                                                            {designation.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {(errors as any).joining_designation_id && <p className="mt-1 text-sm text-red-500">{(errors as any).joining_designation_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="last_designation_id">
                                                Last Designation{' '}
                                                <span className="text-gray-500 text-sm font-normal">(optional — defaults to joining)</span>
                                            </Label>
                                            <Select
                                                value={(data as any).last_designation_id}
                                                onValueChange={(value) => setData('last_designation_id' as any, value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select last designation" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredDesignations.map((designation) => (
                                                        <SelectItem key={designation.id} value={designation.id.toString()}>
                                                            {designation.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {(errors as any).last_designation_id && <p className="mt-1 text-sm text-red-500">{(errors as any).last_designation_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="current_branch_id">
                                                Branch <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={data.current_branch_id}
                                                onValueChange={(value) => setData('current_branch_id', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select branch" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {branches.map((branch) => (
                                                        <SelectItem key={branch.id} value={branch.id.toString()}>
                                                            {branch.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.current_branch_id && <p className="mt-1 text-sm text-red-500">{errors.current_branch_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="reporting_to">Reports To</Label>
                                            <Select
                                                value={data.reporting_to}
                                                onValueChange={(value) => setData('reporting_to', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select manager" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {managers.map((manager) => (
                                                        <SelectItem key={manager.id} value={manager.id.toString()}>
                                                            {manager.name_en || ''} ({manager.pin || manager.employee_id})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.reporting_to && <p className="mt-1 text-sm text-red-500">{errors.reporting_to}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="joining_date">
                                                Joining Date <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="joining_date"
                                                type="date"
                                                value={data.joining_date}
                                                onChange={(e) => setData('joining_date', e.target.value)}
                                                required
                                            />
                                            {errors.joining_date && <p className="mt-1 text-sm text-red-500">{errors.joining_date}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmation_date">Confirmation Date</Label>
                                            <Input
                                                id="confirmation_date"
                                                type="date"
                                                value={(data as any).confirmation_date}
                                                onChange={(e) => setData('confirmation_date' as any, e.target.value)}
                                            />
                                            {(errors as any).confirmation_date && <p className="mt-1 text-sm text-red-500">{(errors as any).confirmation_date}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="status">
                                                Status <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={data.status}
                                                onValueChange={(value) => setData('status', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statuses.map((status) => (
                                                        <SelectItem key={status} value={status}>
                                                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setActiveTab('personal')}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setActiveTab('service')}
                                    >
                                        Next: Service Details
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* Service Tab */}
                        <TabsContent value="service">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-sky-100 p-1.5">
                                            <Calendar className="h-5 w-5 text-sky-600" />
                                        </div>
                                        <div>
                                            <CardTitle>Service & Lifecycle</CardTitle>
                                            <CardDescription>Confirmation, promotion, probation and exit details</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="probation_period_days">Probation Period (Auto)</Label>
                                            <Input
                                                id="probation_period_days"
                                                value={probationYmd ? probationYmd : '—'}
                                                readOnly
                                                disabled
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="last_promotion_date">Last Promotion/Grade Change Date</Label>
                                            <Input
                                                id="last_promotion_date"
                                                type="date"
                                                value={(data as any).last_promotion_date}
                                                onChange={(e) => setData('last_promotion_date' as any, e.target.value)}
                                            />
                                            {(errors as any).last_promotion_date && <p className="mt-1 text-sm text-red-500">{(errors as any).last_promotion_date}</p>}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={(data as any).is_dropout}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setData('is_dropout' as any, checked);
                                                        if (!checked) {
                                                            setData('dropout_date' as any, '');
                                                            setData('dropout_reason' as any, '');
                                                        }
                                                    }}
                                                />
                                                Dropout
                                            </label>
                                            <p className="text-xs text-gray-500">If checked, dropout date and reason will be required.</p>
                                        </div>

                                        {(data as any).is_dropout && (
                                            <>
                                        <div className="space-y-2">
                                            <Label htmlFor="dropout_date">Dropout Date</Label>
                                            <Input
                                                id="dropout_date"
                                                type="date"
                                                value={(data as any).dropout_date}
                                                onChange={(e) => setData('dropout_date' as any, e.target.value)}
                                                required
                                            />
                                            {(errors as any).dropout_date && <p className="mt-1 text-sm text-red-500">{(errors as any).dropout_date}</p>}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="dropout_reason">Dropout Reason</Label>
                                            <Textarea
                                                id="dropout_reason"
                                                value={(data as any).dropout_reason}
                                                onChange={(e) => setData('dropout_reason' as any, e.target.value)}
                                                placeholder="Reason for dropout"
                                                rows={3}
                                                required
                                            />
                                            {(errors as any).dropout_reason && <p className="mt-1 text-sm text-red-500">{(errors as any).dropout_reason}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="final_payment_date">Final Payment Date</Label>
                                            <Input
                                                id="final_payment_date"
                                                type="date"
                                                value={(data as any).final_payment_date}
                                                onChange={(e) => setData('final_payment_date' as any, e.target.value)}
                                                required
                                            />
                                            {(errors as any).final_payment_date && <p className="mt-1 text-sm text-red-500">{(errors as any).final_payment_date}</p>}
                                        </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('employment')}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('contact')}>
                                        Next: Contact Information
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* Contact Information Tab */}
                        <TabsContent value="contact">
                            <Card className="shadow-sm">
                                <CardHeader className="border-b bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-green-100 p-1.5">
                                            <Phone className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <CardTitle>Contact Information</CardTitle>
                                            <CardDescription>Contact and emergency details</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">
                                                Email <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={data.email}
                                                onChange={e => setData('email', e.target.value)}
                                                placeholder="Enter email address"
                                                required
                                            />
                                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email_id">
                                                Email ID <span className="text-gray-500 text-sm">(Optional)</span>
                                            </Label>
                                            <Input
                                                id="email_id"
                                                type="email"
                                                value={(data as any).email_id}
                                                onChange={e => setData('email_id' as any, e.target.value)}
                                                placeholder="Alternative email"
                                            />
                                            {(errors as any).email_id && <p className="mt-1 text-sm text-red-500">{(errors as any).email_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">
                                                Phone Number
                                            </Label>
                                            <Input
                                                id="phone"
                                                value={data.phone}
                                                onChange={e => setData('phone', e.target.value)}
                                                placeholder="Enter phone number"
                                            />
                                            {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="address">
                                                Address
                                            </Label>
                                            <Textarea
                                                id="address"
                                                value={data.address}
                                                onChange={e => setData('address', e.target.value)}
                                                placeholder="Enter residential address"
                                                rows={3}
                                            />
                                            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="emergency_contact">
                                                Emergency Contact
                                            </Label>
                                            <Input
                                                id="emergency_contact"
                                                value={data.emergency_contact}
                                                onChange={e => setData('emergency_contact', e.target.value)}
                                                placeholder="Name and phone number of emergency contact"
                                            />
                                            {errors.emergency_contact && <p className="mt-1 text-sm text-red-500">{errors.emergency_contact}</p>}
                                            <p className="mt-1 text-xs text-gray-500">
                                                Provide the name and contact number of a person to contact in case of emergency
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setActiveTab('service')}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {processing ? 'Updating...' : 'Update Employee'}
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
