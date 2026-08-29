import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { format, formatISO, parse, isAfter, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, AlertCircle, User, BriefcaseBusiness, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from '@/components/ui/calendar';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
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
}

interface CreateMovementProps {
    employees: Employee[];
    currentEmployee: Employee | null;
    isAdmin: boolean;
    movementTypes: string[];
    weekendDays?: number[];
    weekendDaysByEmployee?: Record<number, number[]>;
}

function isWeekendDate(date: Date | undefined, weekendDays: number[]): boolean {
    if (!date || weekendDays.length === 0) return false;
    return weekendDays.includes(date.getDay());
}

/** Parse "HH:mm" or "HH:mm:ss" from time picker / clock (24h). */
function parseHourMinute24(value: string): { hours: number; minutes: number } | null {
    if (!value?.trim()) return null;
    const [h, m] = value.trim().split(':').map((p) => Number(p));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { hours: h, minutes: m };
}

function formatTime12hFromHm(value: string): string {
    const parsed = parseHourMinute24(value);
    if (!parsed) return 'Select time';
    const d = parse(`${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}`, 'HH:mm', new Date(2000, 0, 1));
    return format(d, 'h:mm a');
}

// Enhanced Compact Time Picker Component
const TimePicker = ({ value, onChange, label, error }: {
    value: string;
    onChange: (time: string) => void;
    label: string;
    error?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState(9);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [selectedPeriod, setSelectedPeriod] = useState('AM');

    useEffect(() => {
        const parsed = parseHourMinute24(value);
        if (!parsed) return;
        const { hours, minutes } = parsed;
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const period = hours >= 12 ? 'PM' : 'AM';
        setSelectedHour(hour12);
        setSelectedMinute(minutes);
        setSelectedPeriod(period);
    }, [value]);

    const updateTime = (hour: number, minute: number, period: string) => {
        let hour24 = hour;
        if (period === 'PM' && hour !== 12) hour24 += 12;
        if (period === 'AM' && hour === 12) hour24 = 0;

        const timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        onChange(timeString);
    };

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">{label}</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal h-9 text-xs border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50 transition-all",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <Clock className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        {formatTime12hFromHm(value)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 space-y-3">
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                            {/* Hour */}
                            <div>
                                <Label className="text-[10px] text-gray-500 block mb-0.5">Hour</Label>
                                <Select
                                    value={selectedHour.toString()}
                                    onValueChange={(val) => {
                                        const hour = parseInt(val);
                                        setSelectedHour(hour);
                                        updateTime(hour, selectedMinute, selectedPeriod);
                                    }}
                                >
                                    <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hours.map((hour) => (
                                            <SelectItem key={hour} value={hour.toString()} className="text-xs">
                                                {hour}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Minute */}
                            <div>
                                <Label className="text-[10px] text-gray-500 block mb-0.5">Min</Label>
                                <Select
                                    value={selectedMinute.toString()}
                                    onValueChange={(val) => {
                                        const minute = parseInt(val);
                                        setSelectedMinute(minute);
                                        updateTime(selectedHour, minute, selectedPeriod);
                                    }}
                                >
                                    <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {minutes.map((minute) => (
                                            <SelectItem key={minute} value={minute.toString()} className="text-xs">
                                                {minute.toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Period */}
                            <div>
                                <Label className="text-[10px] text-gray-500 block mb-0.5">Period</Label>
                                <Select
                                    value={selectedPeriod}
                                    onValueChange={(period) => {
                                        setSelectedPeriod(period);
                                        updateTime(selectedHour, selectedMinute, period);
                                    }}
                                >
                                    <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AM" className="text-xs">AM</SelectItem>
                                        <SelectItem value="PM" className="text-xs">PM</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Quick Time Buttons */}
                        <div className="grid grid-cols-2 gap-1.5">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedHour(9);
                                    setSelectedMinute(0);
                                    setSelectedPeriod('AM');
                                    updateTime(9, 0, 'AM');
                                }}
                                className="h-7 text-[10px]"
                            >
                                9:00 AM
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedHour(5);
                                    setSelectedMinute(0);
                                    setSelectedPeriod('PM');
                                    updateTime(5, 0, 'PM');
                                }}
                                className="h-7 text-[10px]"
                            >
                                5:00 PM
                            </Button>
                        </div>

                        <Button
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="w-full h-7 text-xs"
                        >
                            Done
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            {error && (
                <p className="text-xs font-medium text-red-500 mt-0.5">{error}</p>
            )}
        </div>
    );
};

// Custom Calendar wrapper
const SafeCalendar = ({ disabledDates, ...props }: any) => {
    return (
        <Calendar
            {...props}
            modifiers={{
                disabled: disabledDates ? (date: Date) => disabledDates(date) : undefined,
            }}
        />
    );
};

export default function CreateMovement({
    employees,
    currentEmployee,
    isAdmin,
    movementTypes,
    weekendDays = [5, 6],
    weekendDaysByEmployee = {},
}: CreateMovementProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string; warning?: string } }>().props;

    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    };

    const [employeeId, setEmployeeId] = useState(currentEmployee ? currentEmployee.id.toString() : '');
    const [movementType, setMovementType] = useState(() =>
        isWeekendDate(new Date(), weekendDays.length ? weekendDays : [5, 6]) ? 'personal' : 'official'
    );
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
    const [fromTime, setFromTime] = useState<string>(getCurrentTime());
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [toTime, setToTime] = useState<string>('');
    const [durationHours, setDurationHours] = useState(8);
    const [purpose, setPurpose] = useState('');
    const [destination, setDestination] = useState('');
    const [remarks, setRemarks] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [showDropdown, setShowDropdown] = useState(false);
    const [timeSnappedNotice, setTimeSnappedNotice] = useState<string | null>(null);

    const serverErrorMessages = useMemo(
        () => Object.values(errors).filter((message): message is string => Boolean(message)),
        [errors],
    );

    const officialTemplates = [
        { title: 'Client Meeting', purpose: 'Meeting with client to discuss project requirements and timeline', hours: 3 },
        { title: 'Site Visit', purpose: 'Visiting site for inspection and assessment', hours: 5 },
        { title: 'Training', purpose: 'Attending professional development training on company technologies', hours: 6 }
    ];

    const personalTemplates = [
        { title: 'Doctor Appointment', purpose: 'Medical checkup at hospital', hours: 2 },
        { title: 'Bank Errand', purpose: 'Visit to bank for personal financial matters', hours: 1 },
        { title: 'Family Emergency', purpose: 'Attending to urgent family matter', hours: 4 }
    ];

    const branches = [
        "01 Naogaon Sadar", "02 Atrai", "03 Raninagar", "04 Bhabanipur", "05 Bandaikhara",
        "06 Kritipur", "07 Abadpukur", "08 Hapania", "09 Badalgachi", "10 Saharpukur",
        "11 Adamdighi", "12 Shailgachi", "13 Betgari", "14 Tilakpur", "15 Santahar",
        "16 Charagpur", "17 Nazipur", "18 Mohadebpur", "19 Paharpur", "20 Chatra",
        "21 Sapahar", "22 Chaubaria Hat", "23 Fatepur", "24 Shishahat", "25 Hat Gangopara",
        "26 Katkhoir", "27 Hatkoroi", "28 Khajura", "29 Shibpur", "30 Dighirhat",
        "31 Naldanga", "32 Samaspara", "33 Rajbari", "34 Agradigun", "35 Dorgadanga",
        "36 Nachol", "37 Akkelpur", "38 Khetlal", "39 Chanpara", "40 Kichok",
        "41 Rajabirat", "42 Kahaloo"
    ];

    const filteredBranches = destination
        ? branches.filter(branch => branch.toLowerCase().includes(destination.toLowerCase()))
        : branches;

    useEffect(() => {
        if (!fromDate) {
            setFromDate(new Date());
        }
    }, []);

    const resolvedWeekendDays = useMemo(() => {
        const id = Number(employeeId);
        const byEmployee = id ? weekendDaysByEmployee[id] : undefined;
        if (byEmployee && byEmployee.length > 0) {
            return byEmployee;
        }
        return weekendDays.length > 0 ? weekendDays : [5, 6];
    }, [employeeId, weekendDays, weekendDaysByEmployee]);

    const isWeekendMovement = useMemo(
        () => isWeekendDate(fromDate, resolvedWeekendDays),
        [fromDate, resolvedWeekendDays],
    );

    useEffect(() => {
        if (isWeekendMovement && movementType !== 'personal') {
            setMovementType('personal');
        }
    }, [isWeekendMovement, movementType]);

    // Background calculation for return time (same calendar day only)
    useEffect(() => {
        if (!fromDate || !fromTime) return;

        const hm = parseHourMinute24(fromTime);
        if (!hm) return;

        // Movement is single-day: clamp expected return to 23:59 same day
        let endHours = hm.hours + durationHours;
        let endMinutes = hm.minutes;
        if (endHours >= 24) {
            endHours = 23;
            endMinutes = 59;
        }

        setToDate(new Date(fromDate));
        setToTime(`${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`);
    }, [fromDate, fromTime, durationHours]);

    const getFromDateTime = () => {
        if (!fromDate || !fromTime) return null;
        const hm = parseHourMinute24(fromTime);
        if (!hm) return null;
        const dateTime = new Date(fromDate);
        dateTime.setHours(hm.hours, hm.minutes, 0, 0);
        return dateTime;
    };

    const getToDateTime = () => {
        if (!toDate || !toTime) return null;
        const hm = parseHourMinute24(toTime);
        if (!hm) return null;
        const dateTime = new Date(toDate);
        dateTime.setHours(hm.hours, hm.minutes, 0, 0);
        return dateTime;
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (isAdmin && !employeeId) newErrors.employee_id = 'Employee is required';
        if (!movementType) newErrors.movement_type = 'Movement type is required';
        if (!fromDate) newErrors.from_date = 'From date is required';
        if (!fromTime) newErrors.from_time = 'From time is required';
        if (!purpose.trim()) newErrors.purpose = 'Purpose is required';
        if (!destination.trim()) newErrors.destination = 'Destination is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const resolveSubmitDateTimes = () => {
        let fromDateTime = getFromDateTime();
        if (!fromDateTime) return { fromDateTime: null, toDateTime: null };

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        if (fromDateTime < fiveMinutesAgo) {
            const durationMs = durationHours * 60 * 60 * 1000;
            fromDateTime = now;
            const toDateTime = new Date(fromDateTime.getTime() + durationMs);
            setTimeSnappedNotice('Start time was updated to the current time because the form was open for a while.');
            return { fromDateTime, toDateTime };
        }

        return { fromDateTime, toDateTime: getToDateTime() };
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setTimeSnappedNotice(null);

        if (!validateForm()) {
            setActiveTab('details');
            return;
        }

        setSubmitting(true);

        const { fromDateTime, toDateTime } = resolveSubmitDateTimes();
        if (!fromDateTime || !toDateTime) {
            setErrors((prev) => ({
                ...prev,
                from_datetime: 'Please select a valid start date and time.',
                to_datetime: 'Could not calculate the expected return time.',
            }));
            setSubmitting(false);
            setActiveTab('details');
            return;
        }

        if (toDateTime <= fromDateTime) {
            setErrors((prev) => ({
                ...prev,
                to_datetime: 'Expected return time must be after the start time.',
            }));
            setSubmitting(false);
            setActiveTab('details');
            return;
        }

        const sameDay =
            fromDateTime.getFullYear() === toDateTime.getFullYear() &&
            fromDateTime.getMonth() === toDateTime.getMonth() &&
            fromDateTime.getDate() === toDateTime.getDate();
        if (!sameDay) {
            setErrors((prev) => ({
                ...prev,
                to_datetime: 'Movement is allowed for one day only. Expected return must be on the same date.',
            }));
            setSubmitting(false);
            setActiveTab('details');
            return;
        }

        router.post(route('movements.store'), {
            employee_id: isAdmin ? employeeId : undefined,
            movement_type: isWeekendMovement ? 'personal' : movementType,
            from_datetime: formatISO(fromDateTime),
            to_datetime: formatISO(toDateTime),
            purpose,
            destination,
            remarks,
        }, {
            onError: (errs) => {
                const normalized = Object.fromEntries(
                    Object.entries(errs).map(([key, value]) => [key, Array.isArray(value) ? value[0] : String(value)]),
                );
                setErrors(normalized);
                setActiveTab('details');
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false),
        });
    };

    const applyTemplate = (template: { title: string, purpose: string, hours: number }) => {
        setPurpose(template.purpose);
        setDestination(template.title);
        setDurationHours(template.hours);
    };

    const selectedEmployee = isAdmin
        ? employees.find(emp => emp.id.toString() === employeeId)
        : currentEmployee;

    return (
        <Layout>
            <Head title="Create Movement" />

            <PageSurface className="max-w-4xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <Link 
                            href={route('movements.index')} 
                            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                            <span>Back to Movements</span>
                        </Link>
                        <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 mt-0.5">New Movement</h1>
                    </div>
                </div>

                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Could not create movement</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                {flash?.warning && (
                    <Alert className="mb-4 border-amber-200 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-700" />
                        <AlertTitle>Notice</AlertTitle>
                        <AlertDescription>{flash.warning}</AlertDescription>
                    </Alert>
                )}

                {serverErrorMessages.length > 0 && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Please fix the following</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                                {serverErrorMessages.map((message) => (
                                    <li key={message}>{message}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {timeSnappedNotice && (
                    <Alert className="mb-4 border-blue-200 bg-blue-50">
                        <AlertCircle className="h-4 w-4 text-blue-700" />
                        <AlertDescription>{timeSnappedNotice}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-2">
                        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/20 py-2.5 px-4 space-y-0">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-slate-800">Movement Request Form</CardTitle>
                                        <CardDescription className="text-[11px] text-slate-500 hidden sm:block">Submit details for your movement</CardDescription>
                                    </div>
                                    <TabsList className="h-8 p-0.5 bg-slate-100 rounded-lg flex gap-0.5">
                                        <TabsTrigger 
                                            value="details" 
                                            className="rounded-md px-2.5 py-1 text-xs transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                                            title="Form Details"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="templates"
                                            className="rounded-md px-2.5 py-1 text-xs transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                                            title="Quick Templates"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                        </TabsTrigger>
                                    </TabsList>
                                </CardHeader>

                                <CardContent className="p-4">
                                    <TabsContent value="details" className="mt-0">
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            {(isAdmin || currentEmployee) && (
                                                <div className="space-y-1">
                                                    <Label htmlFor="employee" className="text-xs font-semibold text-slate-700">Employee</Label>
                                                    <Select
                                                        value={employeeId}
                                                        onValueChange={setEmployeeId}
                                                        disabled={!isAdmin}
                                                    >
                                                        <SelectTrigger id="employee" className="h-9 text-xs border-slate-200 bg-slate-50/50 focus:ring-blue-500/20">
                                                            <SelectValue placeholder="Select Employee" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(isAdmin ? employees : currentEmployee ? [currentEmployee] : []).map((employee) => (
                                                                <SelectItem key={employee.id} value={employee.id.toString()} className="text-xs">
                                                                    {employeeDisplayName(employee)} ({employee.employee_id})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.employee_id && (
                                                        <p className="text-xs font-medium text-red-500 mt-0.5">{errors.employee_id}</p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-700">Movement Type</Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isWeekendMovement) setMovementType('official');
                                                        }}
                                                        disabled={isWeekendMovement}
                                                        className={cn(
                                                            "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-2 text-center transition-all duration-200 outline-none",
                                                            movementType === 'official'
                                                                ? "border-blue-600 bg-blue-50/40 text-blue-700 shadow-sm"
                                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600",
                                                            isWeekendMovement && "opacity-50 cursor-not-allowed hover:border-slate-200 hover:bg-transparent"
                                                        )}
                                                    >
                                                        <BriefcaseBusiness className={cn("h-4 w-4", movementType === 'official' ? "text-blue-600" : "text-slate-400")} />
                                                        <span className="font-semibold text-xs">Official</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMovementType('personal')}
                                                        className={cn(
                                                            "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-2 text-center transition-all duration-200 outline-none",
                                                            movementType === 'personal'
                                                                ? "border-purple-600 bg-purple-50/40 text-purple-700 shadow-sm"
                                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600"
                                                        )}
                                                    >
                                                        <User className={cn("h-4 w-4", movementType === 'personal' ? "text-purple-600" : "text-slate-400")} />
                                                        <span className="font-semibold text-xs">Personal</span>
                                                    </button>
                                                </div>
                                                {isWeekendMovement && (
                                                    <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1.5">
                                                        Weekend day: type is locked to Personal for log book only. Attendance is not affected.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-semibold text-slate-700">From Date</Label>
                                                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full justify-start text-left font-normal h-9 border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs",
                                                                    !fromDate && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                {fromDate ? format(fromDate, 'PPP') : <span>Select date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <SafeCalendar
                                                                mode="single"
                                                                selected={fromDate}
                                                                onSelect={(date: Date | undefined) => {
                                                                    setFromDate(date);
                                                                    setFromDateOpen(false);
                                                                }}
                                                                disabledDates={(date: Date) =>
                                                                    isBefore(startOfDay(date), startOfDay(new Date()))
                                                                }
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>

                                                <TimePicker
                                                    value={fromTime}
                                                    onChange={setFromTime}
                                                    label="From Time"
                                                    error={errors.from_time}
                                                />
                                            </div>

                                            {errors.from_datetime && (
                                                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 p-2.5">
                                                    <AlertDescription className="text-xs">
                                                        {errors.from_datetime}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {errors.to_datetime && (
                                                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 p-2.5">
                                                    <AlertDescription className="text-xs">
                                                        {errors.to_datetime}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {errors.remarks && (
                                                <p className="text-xs font-medium text-red-500">{errors.remarks}</p>
                                            )}

                                            <div className="space-y-1 relative">
                                                <Label htmlFor="destination" className="text-xs font-semibold text-slate-700">Destination</Label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                                    <Input
                                                        id="destination"
                                                        placeholder="Where are you going?"
                                                        value={destination}
                                                        onChange={(e) => {
                                                            setDestination(e.target.value);
                                                            setShowDropdown(true);
                                                        }}
                                                        onFocus={() => setShowDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                                        className="pl-8 h-9 text-xs border-slate-200 focus:ring-blue-500/20"
                                                    />
                                                </div>
                                                {errors.destination && (
                                                    <p className="text-xs font-medium text-red-500 mt-0.5">{errors.destination}</p>
                                                )}

                                                {showDropdown && filteredBranches.length > 0 && (
                                                    <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 shadow-lg rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-50 focus:outline-none scrollbar-thin">
                                                        {filteredBranches.map((branch, index) => (
                                                            <li
                                                                key={index}
                                                                onClick={() => {
                                                                    setDestination(branch);
                                                                    setShowDropdown(false);
                                                                }}
                                                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700"
                                                            >
                                                                {branch}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="purpose" className="text-xs font-semibold text-slate-700">Purpose</Label>
                                                <Textarea
                                                    id="purpose"
                                                    placeholder="What is the purpose of this movement?"
                                                    rows={2}
                                                    value={purpose}
                                                    onChange={(e) => setPurpose(e.target.value)}
                                                    className="border-slate-200 text-xs focus:ring-blue-500/20 resize-none py-2 px-3 min-h-[60px]"
                                                />
                                                {errors.purpose && (
                                                    <p className="text-xs font-medium text-red-500 mt-0.5">{errors.purpose}</p>
                                                )}

                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {['Branch Audit', 'Branch Monitor', 'Officer Monitor', 'Client Meeting'].map((template) => (
                                                        <button
                                                            key={template}
                                                            type="button"
                                                            onClick={() => setPurpose(template)}
                                                            className="px-2 py-0.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 text-[10px] rounded-full transition-all duration-200 font-medium"
                                                        >
                                                            {template}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700">Remarks (Optional)</Label>
                                                <Textarea
                                                    id="remarks"
                                                    placeholder="Any additional information?"
                                                    rows={1}
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    className="border-slate-200 text-xs focus:ring-blue-500/20 resize-none py-1.5 px-3 min-h-[40px]"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                                <Link href={route('movements.index')}>
                                                    <Button variant="outline" type="button" className="h-9 text-xs border-slate-200 hover:bg-slate-50 px-4">
                                                        Cancel
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    type="submit" 
                                                    disabled={submitting} 
                                                    className="h-9 text-xs px-5 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all"
                                                >
                                                    {submitting ? 'Submitting...' : 'Create Movement'}
                                                </Button>
                                            </div>
                                        </form>
                                    </TabsContent>

                                    <TabsContent value="templates" className="mt-0">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-xs font-bold text-indigo-900 mb-2 flex items-center">
                                                    <BriefcaseBusiness className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                                                    Official Movement Templates
                                                </h3>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {officialTemplates.map((template, index) => (
                                                        <div 
                                                            key={`official-${index}`} 
                                                            onClick={() => {
                                                                if (isWeekendMovement) return;
                                                                setMovementType('official');
                                                                applyTemplate(template);
                                                                setActiveTab('details');
                                                            }}
                                                            className={cn(
                                                                "group p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 shadow-sm transition-all duration-200",
                                                                isWeekendMovement ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                                            )}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-slate-800 text-xs group-hover:text-indigo-900 transition-colors truncate">{template.title}</h4>
                                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{template.purpose}</p>
                                                                </div>
                                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2 text-[9px] py-0 px-1.5 font-semibold shrink-0">
                                                                    {template.hours}h
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xs font-bold text-purple-900 mb-2 flex items-center">
                                                    <User className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
                                                    Personal Movement Templates
                                                </h3>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {personalTemplates.map((template, index) => (
                                                        <div 
                                                            key={`personal-${index}`} 
                                                            className="group p-2.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/10 shadow-sm transition-all duration-200 cursor-pointer"
                                                            onClick={() => {
                                                                setMovementType('personal');
                                                                applyTemplate(template);
                                                                setActiveTab('details');
                                                            }}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-slate-800 text-xs group-hover:text-purple-900 transition-colors truncate">{template.title}</h4>
                                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{template.purpose}</p>
                                                                </div>
                                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 ml-2 text-[9px] py-0 px-1.5 font-semibold shrink-0">
                                                                    {template.hours}h
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <Button variant="outline" onClick={() => setActiveTab('details')} className="h-8 text-xs px-3">
                                                    Back to Form
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </CardContent>
                            </Tabs>
                        </Card>
                    </div>

                    <div className="md:col-span-1 space-y-4">
                        {selectedEmployee ? (
                            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white sticky top-4">
                                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-2.5 px-4">
                                    <CardTitle className="flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        <User className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                                        Summary Voucher
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center space-x-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                            {selectedEmployee.name_en ? selectedEmployee.name_en.charAt(0) : 'E'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-slate-800 text-xs truncate">{employeeDisplayName(selectedEmployee)}</h4>
                                            <span className="text-[9px] text-slate-400 block font-mono">ID: {selectedEmployee.employee_id}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div className="bg-slate-50/30 p-2 rounded border border-slate-100 min-w-0">
                                            <span className="text-[9px] font-medium text-slate-400 block mb-0.5">Dept</span>
                                            <span className="font-semibold text-slate-700 truncate block">
                                                {selectedEmployee.department?.name || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50/30 p-2 rounded border border-slate-100 min-w-0">
                                            <span className="text-[9px] font-medium text-slate-400 block mb-0.5">Desg</span>
                                            <span className="font-semibold text-slate-700 truncate block">
                                                {selectedEmployee.designation?.name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
                                        <div className="flex justify-between items-center py-0.5">
                                            <span className="text-slate-400">Type:</span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[9px] py-0 px-1.5 font-semibold",
                                                    movementType === 'official'
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : "bg-purple-50 text-purple-700 border-purple-200"
                                                )}
                                            >
                                                {movementType.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5">
                                            <span className="text-slate-400">Start Time:</span>
                                            <span className="font-semibold text-slate-700">
                                                {fromDate ? format(fromDate, 'MMM dd') : ''} @ {formatTime12hFromHm(fromTime)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5">
                                            <span className="text-slate-400">End Time:</span>
                                            <span className="font-semibold text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] border border-emerald-100">
                                                Auto-tracked
                                            </span>
                                        </div>
                                        {destination && (
                                            <div className="flex justify-between items-start py-0.5">
                                                <span className="text-slate-400">Destination:</span>
                                                <span className="font-semibold text-slate-700 truncate max-w-[65%]" title={destination}>{destination}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-2 px-4">
                                    <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">Movement Info</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <Clock className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="font-semibold text-slate-700 text-xs mb-0.5">Select an Employee</p>
                                    <p className="text-[10px] text-slate-400 max-w-[150px]">Choose an employee to load their movement profile.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
