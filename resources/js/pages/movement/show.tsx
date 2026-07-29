import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, CalendarClock, MapPin, ClipboardList, Clock, User, Building2, ArrowRightLeft, Check, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { resolveMovementStartPlace } from '@/lib/movement-start-place';

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    department?: {
        id: number;
        name: string;
    };
    designation?: {
        id: number;
        name: string;
    };
    branch?: {
        id: number;
        name: string;
    } | null;
}

interface Movement {
    id: number;
    employee_id: number;
    employee: Employee;
    movement_type: string;
    from_datetime: string;
    to_datetime: string;
    purpose: string;
    destination: string;
    remarks: string | null;
    work_result: string | null;
    status: string;
    is_returned: boolean;
    actual_return_datetime: string | null;
    created_at: string;
    updated_at: string;
}

interface ShowMovementProps {
    movement: Movement;
    canClose: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function ShowMovement({ movement, canClose, canEdit = false, canDelete = false }: ShowMovementProps) {
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [forgotReturnTime, setForgotReturnTime] = useState(false);
    const [customReturnTime, setCustomReturnTime] = useState(
        format(new Date(), "yyyy-MM-dd'T'HH:mm")
    );
    const [workResult, setWorkResult] = useState('');
    const [startMeterReading, setStartMeterReading] = useState('');
    const [endMeterReading, setEndMeterReading] = useState('');
    const [personalKm, setPersonalKm] = useState('');
    const [createLogBook, setCreateLogBook] = useState(true);
    const [startPlace, setStartPlace] = useState(movement.employee?.branch?.name || '');
    const [resolvingPlace, setResolvingPlace] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const branchFallbackName = movement.employee?.branch?.name || '';

    const prepareCloseDialogFields = async () => {
        setForgotReturnTime(false);
        setWorkResult('');
        setStartMeterReading('');
        setEndMeterReading('');
        setPersonalKm('');
        setCreateLogBook(true);
        setCloseError(null);
        setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setStartPlace(branchFallbackName);
        setResolvingPlace(true);
        try {
            const place = await resolveMovementStartPlace(branchFallbackName);
            setStartPlace(place);
        } finally {
            setResolvingPlace(false);
        }
    };

    const handleClose = () => {
        setCloseError(null);
        if (!workResult.trim() || workResult.trim().length < 5) {
            setCloseError('Please write the work result / feedback (at least 5 characters).');
            return;
        }

        const startReading = Number(startMeterReading);
        const endReading = Number(endMeterReading);
        const personal = personalKm.trim() === '' ? 0 : Number(personalKm);
        if (createLogBook) {
            if (startMeterReading.trim() === '' || Number.isNaN(startReading) || startReading < 0) {
                setCloseError('Please enter a valid start meter reading.');
                return;
            }
            if (endMeterReading.trim() === '' || Number.isNaN(endReading) || endReading < startReading) {
                setCloseError('Closing meter reading must be greater than or equal to start reading.');
                return;
            }

            const totalKm = Math.max(0, endReading - startReading);
            if (personalKm.trim() !== '' && (Number.isNaN(personal) || personal < 0)) {
                setCloseError('Please enter a valid personal distance.');
                return;
            }
            if (personal > totalKm) {
                setCloseError('Personal distance cannot exceed total distance.');
                return;
            }
        }

        if (forgotReturnTime && !customReturnTime?.trim()) {
            setCloseError('Please select the actual date and time you returned.');
            return;
        }

        setSubmitting(true);

        router.post(route('movements.complete', movement.id), {
            forgot_return_time: forgotReturnTime ? '1' : '0',
            actual_return_datetime: forgotReturnTime ? customReturnTime : null,
            work_result: workResult.trim(),
            start_place: createLogBook ? (startPlace.trim() || branchFallbackName || 'Unknown') : null,
            start_meter_reading: createLogBook ? startReading : null,
            end_meter_reading: createLogBook ? endReading : null,
            personal_km: createLogBook && personalKm.trim() !== '' ? personal : null,
            create_log_book: createLogBook ? '1' : '0',
        }, {
            onSuccess: () => setShowCloseDialog(false),
            onError: (errors) => {
                setCloseError(
                    (errors.work_result as string) ||
                    (errors.start_meter_reading as string) ||
                    (errors.end_meter_reading as string) ||
                    (errors.personal_km as string) ||
                    (errors.start_place as string) ||
                    (errors.actual_return_datetime as string) ||
                    'Could not close movement. Please check the form.'
                );
            },
            onFinish: () => setSubmitting(false),
        });
    };

    const handleDelete = () => {
        if (!confirm('Delete this movement permanently? Linked attendance will be unlinked from this movement.')) {
            return;
        }
        router.delete(route('movements.destroy', movement.id));
    };

    // Format dates for display
    const fromDate = format(new Date(movement.from_datetime), 'MMM dd, yyyy h:mm a');
    const toDate = format(new Date(movement.to_datetime), 'MMM dd, yyyy h:mm a');
    const actualReturnDate = movement.actual_return_datetime
        ? format(new Date(movement.actual_return_datetime), 'MMM dd, yyyy h:mm a')
        : null;

    // Status badge color
    const getStatusColor = () => {
        switch (movement.status) {
            case 'active':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'completed':
                return 'bg-green-50 text-green-700 border-green-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <Layout>
            <Head title="Movement Details" />

            <PageSurface className="max-w-7xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-2">
                    <Link href={route('movements.index')} className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800">
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        <span>Back to Movement Requests</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 md:mb-0">Movement Details</h1>

                    <div className="flex flex-wrap gap-2">
                        {canEdit && (
                            <Link href={route('movements.edit', movement.id)}>
                                <Button variant="outline" type="button">
                                    <Pencil className="mr-1 h-4 w-4" />
                                    Edit
                                </Button>
                            </Link>
                        )}
                        {canDelete && (
                            <Button variant="destructive" type="button" onClick={handleDelete}>
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                            </Button>
                        )}
                        {canClose && (
                            <Button
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => setShowCloseDialog(true)}
                            >
                                <Check className="mr-1 h-4 w-4" />
                                Close Movement
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Movement Request #{movement.id}</CardTitle>
                                    <Badge variant="outline" className={getStatusColor()}>
                                        {movement.status === 'active' ? 'Active' : movement.status.charAt(0).toUpperCase() + movement.status.slice(1)}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Employee</h3>
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">
                                                    {employeeDisplayName(movement.employee)}
                                                </p>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {movement.employee.employee_id}
                                            </p>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Department</h3>
                                            <div className="flex items-center">
                                                <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">
                                                    {movement.employee.department?.name || 'No Department'}
                                                </p>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {movement.employee.designation?.name || 'No Designation'}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">From Date/Time</h3>
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">{fromDate}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">To Date/Time</h3>
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">{toDate}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {movement.status === 'completed' && actualReturnDate && (
                                        <Alert variant="default" className="bg-green-50 border-green-200">
                                            <Clock className="h-4 w-4 text-green-600" />
                                            <AlertDescription className="text-green-700">
                                                <span className="font-semibold">Actual Return:</span> {actualReturnDate}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 mb-1">Movement Type</h3>
                                        <div className="flex items-center">
                                            <ArrowRightLeft className="h-4 w-4 mr-2 text-gray-400" />
                                            <p className="font-medium capitalize">
                                                {movement.movement_type}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 mb-1">Destination</h3>
                                        <div className="flex items-center">
                                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                            <p className="font-medium">
                                                {movement.destination}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 mb-1">Purpose</h3>
                                        <div className="flex">
                                            <ClipboardList className="h-4 w-4 mr-2 text-gray-400 mt-1 flex-shrink-0" />
                                            <p className="font-medium">
                                                {movement.purpose}
                                            </p>
                                        </div>
                                    </div>

                                    {movement.remarks && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Remarks</h3>
                                            <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                                                {movement.remarks}
                                            </p>
                                        </div>
                                    )}

                                    {movement.work_result && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Work Result / Feedback</h3>
                                            <p className="text-gray-700 bg-green-50 border border-green-100 p-3 rounded-md whitespace-pre-wrap">
                                                {movement.work_result}
                                            </p>
                                        </div>
                                    )}

                                    <Separator />

                                    <div className="text-sm text-gray-500">
                                        <p>Created: {format(new Date(movement.created_at), 'MMM dd, yyyy h:mm a')}</p>
                                        <p>Last Updated: {format(new Date(movement.updated_at), 'MMM dd, yyyy h:mm a')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Movement Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative pl-8 border-l-2 border-blue-200 space-y-6 py-2">
                                    <div className="relative">
                                        <div className="absolute -left-[25px] p-1 rounded-full bg-blue-100 border-2 border-blue-300">
                                            <CalendarClock className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <h3 className="text-sm font-medium">Created</h3>
                                        <p className="text-xs text-gray-500">
                                            {format(new Date(movement.created_at), 'MMM dd, yyyy h:mm a')}
                                        </p>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute -left-[25px] p-1 rounded-full bg-green-100 border-2 border-green-300">
                                            <ArrowRightLeft className="h-4 w-4 text-green-600" />
                                        </div>
                                        <h3 className="text-sm font-medium">Began Movement</h3>
                                        <p className="text-xs text-gray-500">{fromDate}</p>
                                    </div>

                                    {movement.status === 'completed' && actualReturnDate && (
                                        <div className="relative">
                                            <div className="absolute -left-[25px] p-1 rounded-full bg-indigo-100 border-2 border-indigo-300">
                                                <Check className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <h3 className="text-sm font-medium">Movement Completed</h3>
                                            <p className="text-xs text-gray-500">{actualReturnDate}</p>
                                        </div>
                                    )}

                                    {movement.status === 'active' && (
                                        <div className="relative">
                                            <div className="absolute -left-[25px] p-1 rounded-full bg-gray-100 border-2 border-gray-300">
                                                <Clock className="h-4 w-4 text-gray-500" />
                                            </div>
                                            <h3 className="text-sm font-medium">Expected Return</h3>
                                            <p className="text-xs text-gray-500">{toDate}</p>
                                        </div>
                                    )}
                                </div>

                                {movement.status === 'active' && canClose && (
                                    <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                                        <div className="flex items-center mb-2">
                                            <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                                            <p className="text-sm font-medium text-amber-600">Remember to close this movement</p>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            When you return to the office, please close this movement to record your actual return time.
                                        </p>
                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={() => setShowCloseDialog(true)}
                                        >
                                            <Check className="mr-1 h-4 w-4" />
                                            Close Movement
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageSurface>

            {/* Close Movement Dialog */}
            <Dialog
                open={showCloseDialog}
                onOpenChange={(open) => {
                    setShowCloseDialog(open);
                    if (open) {
                        void prepareCloseDialogFields();
                    }
                }}
            >
                <DialogContent className="max-h-[88dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto rounded-2xl p-3 sm:max-h-[90dvh] sm:p-5">
                    <DialogHeader>
                        <DialogTitle>Close Movement</DialogTitle>
                        <DialogDescription>
                            Return time and work result will be saved now. Log Book details are optional.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2.5 py-1">
                        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
                            <div className="mb-2">
                                <h3 className="text-sm font-semibold text-slate-900">Return Details</h3>
                                <p className="text-xs text-slate-500">
                                    Work result is required. Return time will be current time by default.
                                </p>
                            </div>
                            <div className="space-y-2.5">
                                <div className="space-y-2">
                                    <Label htmlFor="workResult">
                                        Work Result / Feedback <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="workResult"
                                        value={workResult}
                                        onChange={(e) => {
                                            setWorkResult(e.target.value);
                                            setCloseError(null);
                                        }}
                                        placeholder="কী কাজ করতে গিয়েছিলেন এবং কাজ সম্পূর্ণ হয়েছে কি না — সংক্ষেপে লিখুন..."
                                        rows={3}
                                        className="resize-y"
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    By default, your return is recorded at <strong>the current time</strong> when you confirm.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 sm:p-4">
                            <div className="mb-2">
                                <h3 className="text-sm font-semibold text-amber-950">Backdated Return</h3>
                                <p className="text-xs text-amber-800">
                                    Only use this if you returned earlier but forgot to close the movement.
                                </p>
                            </div>
                            <div className={`flex items-start space-x-3 rounded-md border p-2.5 sm:p-3 transition-all duration-200 ${
                                forgotReturnTime
                                    ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                                    : 'border-amber-200 bg-white/70'
                            }`}>
                                <Checkbox
                                    id="forgotReturnTime"
                                    checked={forgotReturnTime}
                                    onCheckedChange={(checked) => {
                                        setForgotReturnTime(checked === true);
                                        setCloseError(null);
                                        if (checked === true) {
                                            setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                                        }
                                    }}
                                    className="mt-1 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="forgotReturnTime" className="cursor-pointer font-semibold text-amber-950">
                                        আমি আগে ক্লোজ করতে ভুলে গিয়েছিলাম
                                    </Label>
                                    <p className="text-xs text-amber-800">
                                        এটি টিক দিলে নিচে সঠিক ফেরার সময় দিতে পারবেন।
                                    </p>
                                </div>
                            </div>

                            {forgotReturnTime && (
                                <div className="mt-2.5 space-y-2">
                                    <Label htmlFor="customTime">Actual return date &amp; time</Label>
                                    <Input
                                        id="customTime"
                                        type="datetime-local"
                                        value={customReturnTime}
                                        onChange={(e) => setCustomReturnTime(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/20 p-3 sm:p-4">
                            <div className="mb-2">
                                <h3 className="text-sm font-semibold text-slate-900">Log Book Register</h3>
                                <p className="text-xs text-slate-500">
                                    Log Book entry দরকার হলে checkbox checked রাখুন, না হলে unchecked করুন।
                                </p>
                            </div>

                            <div className={`flex items-start space-x-3 rounded-md border p-2.5 sm:p-3 transition-all duration-200 ${
                                createLogBook
                                    ? 'border-emerald-300 bg-emerald-50/50'
                                    : 'border-slate-200 bg-white/70'
                            }`}>
                                <Checkbox
                                    id="createLogBook"
                                    checked={createLogBook}
                                    onCheckedChange={(checked) => setCreateLogBook(checked === true)}
                                    className="mt-1 border-emerald-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="createLogBook" className="cursor-pointer font-semibold text-slate-900">
                                        Log Book Register এ এন্ট্রি করুন
                                    </Label>
                                    <p className="text-xs text-slate-500">
                                        Checked থাকলে নিচে meter reading input দেখাবে।
                                    </p>
                                </div>
                            </div>

                            {createLogBook && (
                                <div className="mt-2.5 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 sm:p-4">
                                <div className="text-xs text-muted-foreground">
                                    {resolvingPlace
                                        ? 'Detecting current location for start place...'
                                        : 'Start place will be saved automatically from GPS short name, otherwise branch name.'}
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="startMeter">
                                            Start meter reading <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="startMeter"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={startMeterReading}
                                            onChange={(e) => setStartMeterReading(e.target.value)}
                                            placeholder="e.g. 12540.5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endMeter">
                                            Closing meter reading <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="endMeter"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={endMeterReading}
                                            onChange={(e) => setEndMeterReading(e.target.value)}
                                            placeholder="e.g. 12562.0"
                                        />
                                    </div>
                                </div>

                                {startMeterReading !== '' && endMeterReading !== '' && !Number.isNaN(Number(startMeterReading)) && !Number.isNaN(Number(endMeterReading)) && (
                                    <div className="rounded-md border bg-white p-2.5 sm:p-3 space-y-2 text-sm">
                                        <p className="text-muted-foreground">
                                            Total distance:{' '}
                                            <strong>{Math.max(0, Number(endMeterReading) - Number(startMeterReading)).toFixed(2)} km</strong>
                                        </p>
                                        <div className="space-y-2">
                                            <Label htmlFor="personalKm">Personal distance (optional)</Label>
                                            <Input
                                                id="personalKm"
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={personalKm}
                                                onChange={(e) => setPersonalKm(e.target.value)}
                                                placeholder="Personal use km, if any"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Official distance = Total − Personal
                                            </p>
                                        </div>
                                        <p className="text-muted-foreground">
                                            Official distance:{' '}
                                            <strong className="text-green-700">
                                                {(() => {
                                                    const total = Math.max(0, Number(endMeterReading) - Number(startMeterReading));
                                                    const personal = personalKm.trim() === '' || Number.isNaN(Number(personalKm))
                                                        ? 0
                                                        : Number(personalKm);
                                                    return Math.max(0, total - personal).toFixed(2);
                                                })()} km
                                            </strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>

                        {closeError && (
                            <p className="text-sm font-medium text-red-600">{closeError}</p>
                        )}
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowCloseDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleClose}
                            className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
                            disabled={submitting || (createLogBook && resolvingPlace)}
                        >
                            {submitting ? 'Processing...' : 'Confirm Return'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
