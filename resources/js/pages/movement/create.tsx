import React, { useState, FormEvent, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
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
import { format, formatISO, parse, isAfter, addHours, startOfDay, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar as CalendarIcon, CalendarClock, Clock, MapPin, CheckCircle, AlertCircle, Building2, User, BriefcaseBusiness } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from '@/components/ui/calendar';

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
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

// Enhanced Time Picker Component
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

    // Initialize from value (must support any minute 0–59 — defaults from getCurrentTime() are not only :00/:15/:30/:45)
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

    const formatDisplayTime = () => formatTime12hFromHm(value);

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        {formatDisplayTime()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {/* Hour Selection */}
                            <div>
                                <Label className="text-xs text-gray-500">Hour</Label>
                                <Select
                                    value={selectedHour.toString()}
                                    onValueChange={(val) => {
                                        const hour = parseInt(val);
                                        setSelectedHour(hour);
                                        updateTime(hour, selectedMinute, selectedPeriod);
                                    }}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hours.map((hour) => (
                                            <SelectItem key={hour} value={hour.toString()}>
                                                {hour}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Minute Selection */}
                            <div>
                                <Label className="text-xs text-gray-500">Min</Label>
                                <Select
                                    value={selectedMinute.toString()}
                                    onValueChange={(val) => {
                                        const minute = parseInt(val);
                                        setSelectedMinute(minute);
                                        updateTime(selectedHour, minute, selectedPeriod);
                                    }}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[min(240px,50vh)]">
                                        {minutes.map((minute) => (
                                            <SelectItem key={minute} value={minute.toString()}>
                                                {minute.toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* AM/PM Selection */}
                            <div>
                                <Label className="text-xs text-gray-500">Period</Label>
                                <Select
                                    value={selectedPeriod}
                                    onValueChange={(period) => {
                                        setSelectedPeriod(period);
                                        updateTime(selectedHour, selectedMinute, period);
                                    }}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AM">AM</SelectItem>
                                        <SelectItem value="PM">PM</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Quick Time Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedHour(9);
                                    setSelectedMinute(0);
                                    setSelectedPeriod('AM');
                                    updateTime(9, 0, 'AM');
                                }}
                                className="text-xs"
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
                                className="text-xs"
                            >
                                5:00 PM
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedHour(10);
                                    setSelectedMinute(0);
                                    setSelectedPeriod('AM');
                                    updateTime(10, 0, 'AM');
                                }}
                                className="text-xs"
                            >
                                10:00 AM
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedHour(6);
                                    setSelectedMinute(0);
                                    setSelectedPeriod('PM');
                                    updateTime(6, 0, 'PM');
                                }}
                                className="text-xs"
                            >
                                6:00 PM
                            </Button>
                        </div>

                        <Button
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="w-full"
                        >
                            Done
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            {error && (
                <p className="text-sm font-medium text-red-500">{error}</p>
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

export default function CreateMovement({ employees, currentEmployee, isAdmin, movementTypes }: CreateMovementProps) {
    // Get current time and set defaults
    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    };

    const getDefaultEndTime = () => {
        const now = new Date();
        const endTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours
        return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
    };

    const [employeeId, setEmployeeId] = useState(currentEmployee ? currentEmployee.id.toString() : '');
    const [movementType, setMovementType] = useState('official'); // Default to 'official'
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
    const [fromTime, setFromTime] = useState<string>(getCurrentTime());
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [toTime, setToTime] = useState<string>(getDefaultEndTime());
    const [purpose, setPurpose] = useState('');
    const [destination, setDestination] = useState('');
    const [remarks, setRemarks] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [showDropdown, setShowDropdown] = useState(false);

    // Quick templates for movement types
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
        "01 Naogaon Sadar",
        "02 Atrai",
        "03 Raninagar",
        "04 Bhabanipur",
        "05 Bandaikhara",
        "06 Kritipur",
        "07 Abadpukur",
        "08 Hapania",
        "09 Badalgachi",
        "10 Saharpukur",
        "11 Adamdighi",
        "12 Shailgachi",
        "13 Betgari",
        "14 Tilakpur",
        "15 Santahar",
        "16 Charagpur",
        "17 Nazipur",
        "18 Mohadebpur",
        "19 Paharpur",
        "20 Chatra",
        "21 Sapahar",
        "22 Chaubaria Hat",
        "23 Fatepur",
        "24 Shishahat",
        "25 Hat Gangopara",
        "26 Katkhoir",
        "27 Hatkoroi",
        "28 Khajura",
        "29 Shibpur",
        "30 Dighirhat",
        "31 Naldanga",
        "32 Samaspara",
        "33 Rajbari",
        "34 Agradigun",
        "35 Dorgadanga",
        "36 Nachol",
        "37 Akkelpur",
        "38 Khetlal",
        "39 Chanpara",
        "40 Kichok",
        "41 Rajabirat",
        "42 Kahaloo"
    ];

    const filteredBranches = destination
        ? branches.filter(branch => branch.toLowerCase().includes(destination.toLowerCase()))
        : branches;

    // Set default times on component mount
    useEffect(() => {
        if (!fromDate) {
            setFromDate(new Date());
        }
        if (!toDate) {
            setToDate(new Date());
        }
    }, []);

    // Get combined datetime objects
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
        if (!toDate) newErrors.to_date = 'To date is required';
        if (!toTime) newErrors.to_time = 'To time is required';
        if (!purpose.trim()) newErrors.purpose = 'Purpose is required';
        if (!destination.trim()) newErrors.destination = 'Destination is required';

        // Check if to datetime is after from datetime
        const fromDateTime = getFromDateTime();
        const toDateTime = getToDateTime();

        if (fromDateTime && toDateTime && !isAfter(toDateTime, fromDateTime)) {
            newErrors.to_datetime = 'To datetime must be after From datetime';
        }

        // NOTE: start time must be within ~5 minutes of "now" or future (enforced on the server in app timezone).
        // Avoid client-side blocking due to device clock/timezone mismatches (common on mobile).

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            setActiveTab('details');
            return;
        }

        setSubmitting(true);

        const fromDateTime = getFromDateTime();
        const toDateTime = getToDateTime();

        router.post(route('movements.store'), {
            employee_id: isAdmin ? employeeId : undefined,
            movement_type: movementType,
            // ISO with offset so server/mobile never misread naive "Y-m-d H:i:ss"
            from_datetime: fromDateTime ? formatISO(fromDateTime) : '',
            to_datetime: toDateTime ? formatISO(toDateTime) : '',
            purpose,
            destination,
            remarks,
        }, {
            onError: (errors) => {
                setErrors(errors);
                setActiveTab('details');
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false)
        });
    };

    // Apply a template
    const applyTemplate = (template: { title: string, purpose: string, hours: number }) => {
        setPurpose(template.purpose);
        setDestination(template.title);

        const fromDateTime = getFromDateTime() || new Date();
        const newToDateTime = addHours(fromDateTime, template.hours);

        setToDate(newToDateTime);
        setToTime(format(newToDateTime, 'HH:mm'));
    };

    // Selected employee
    const selectedEmployee = isAdmin
        ? employees.find(emp => emp.id.toString() === employeeId)
        : currentEmployee;

    // Calculate hours difference
    const fromDateTime = getFromDateTime();
    const toDateTime = getToDateTime();
    let hoursDiff = 0;

    if (fromDateTime && toDateTime && isAfter(toDateTime, fromDateTime)) {
        hoursDiff = Math.ceil((toDateTime.getTime() - fromDateTime.getTime()) / (1000 * 60 * 60));
    }

    return (
        <Layout>
            <Head title="Create Movement Request" />

            <div className="container mx-auto py-4 px-4 sm:py-8">
                <div className="mb-6">
                    <Link href={route('movements.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Movement Requests
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Movement Request</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Movement Request Form</CardTitle>
                                <CardDescription>Fill out the details for your movement request</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList className="mb-4 grid w-full grid-cols-2">
                                        <TabsTrigger value="details">Details</TabsTrigger>
                                        <TabsTrigger value="templates">Quick Templates</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="details">
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {(isAdmin || currentEmployee) && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="employee">Employee</Label>
                                                    <Select
                                                        value={employeeId}
                                                        onValueChange={setEmployeeId}
                                                        disabled={!isAdmin}
                                                    >
                                                        <SelectTrigger id="employee">
                                                            <SelectValue placeholder="Select Employee" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(isAdmin ? employees : currentEmployee ? [currentEmployee] : []).map((employee) => (
                                                                <SelectItem key={employee.id} value={employee.id.toString()}>
                                                                    {employee.first_name} {employee.last_name} ({employee.employee_id})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {!isAdmin && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Movement requests are created for your own employee record only.
                                                        </p>
                                                    )}
                                                    {errors.employee_id && (
                                                        <p className="text-sm font-medium text-red-500">{errors.employee_id}</p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="movementType">Movement Type</Label>
                                                <Select
                                                    value={movementType}
                                                    onValueChange={setMovementType}
                                                >
                                                    <SelectTrigger id="movementType">
                                                        <SelectValue placeholder="Select Movement Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {movementTypes.map((type) => (
                                                            <SelectItem key={type} value={type}>
                                                                <div className="flex items-center space-x-2">
                                                                    {type === 'official' ? (
                                                                        <BriefcaseBusiness className="h-4 w-4 text-indigo-600" />
                                                                    ) : (
                                                                        <User className="h-4 w-4 text-purple-600" />
                                                                    )}
                                                                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.movement_type && (
                                                    <p className="text-sm font-medium text-red-500">{errors.movement_type}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label>From Date</Label>
                                                        <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "w-full justify-start text-left font-normal",
                                                                        !fromDate && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {fromDate ? format(fromDate, 'PPP') : <span>Select date</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <SafeCalendar
                                                                    mode="single"
                                                                    selected={fromDate}
                                                                    onSelect={(date: Date | undefined) => {
                                                                        setFromDate(date);
                                                                        if (date && (!toDate || isAfter(date, toDate))) {
                                                                            setToDate(date);
                                                                        }
                                                                        setFromDateOpen(false);
                                                                    }}
                                                                    disabledDates={(date: Date) =>
                                                                        isBefore(startOfDay(date), startOfDay(new Date()))
                                                                    }
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        {errors.from_date && (
                                                            <p className="text-sm font-medium text-red-500">{errors.from_date}</p>
                                                        )}
                                                    </div>

                                                    <TimePicker
                                                        value={fromTime}
                                                        onChange={setFromTime}
                                                        label="From Time"
                                                        error={errors.from_time}
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label>To Date</Label>
                                                        <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "w-full justify-start text-left font-normal",
                                                                        !toDate && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {toDate ? format(toDate, 'PPP') : <span>Select date</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <SafeCalendar
                                                                    mode="single"
                                                                    selected={toDate}
                                                                    onSelect={(date: Date | undefined) => {
                                                                        setToDate(date);
                                                                        setToDateOpen(false);
                                                                    }}
                                                                    disabledDates={(date: Date) =>
                                                                        fromDate
                                                                            ? isBefore(startOfDay(date), startOfDay(fromDate))
                                                                            : false
                                                                    }
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        {errors.to_date && (
                                                            <p className="text-sm font-medium text-red-500">{errors.to_date}</p>
                                                        )}
                                                    </div>

                                                    <TimePicker
                                                        value={toTime}
                                                        onChange={setToTime}
                                                        label="To Time"
                                                        error={errors.to_time}
                                                    />
                                                </div>
                                            </div>

                                            {errors.to_datetime && (
                                                <Alert variant="destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        {errors.to_datetime}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {errors.from_datetime && (
                                                <Alert variant="destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        {errors.from_datetime}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {fromDate && toDate && fromTime && toTime && hoursDiff > 0 && (
                                                <Alert variant="default" className="bg-blue-50 text-blue-800 border border-blue-200">
                                                    <Clock className="h-4 w-4" />
                                                    <AlertDescription>
                                                        Duration: <strong>{hoursDiff} {hoursDiff === 1 ? 'hour' : 'hours'}</strong>
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            <div className="space-y-2 relative">
                                                <Label htmlFor="destination">Destination</Label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                                    <Input
                                                        id="destination"
                                                        placeholder="Where are you going?"
                                                        value={destination}
                                                        onChange={(e) => {
                                                            setDestination(e.target.value);
                                                            setShowDropdown(true);
                                                        }}
                                                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                                        className="pl-10"
                                                    />
                                                </div>
                                                {errors.destination && (
                                                    <p className="text-sm font-medium text-red-500">{errors.destination}</p>
                                                )}

                                                {showDropdown && filteredBranches.length > 0 && (
                                                    <ul className="absolute z-10 w-full bg-white border border-gray-200 shadow-lg rounded-md max-h-48 overflow-y-auto">
                                                        {filteredBranches.map((branch, index) => (
                                                            <li
                                                                key={index}
                                                                onClick={() => {
                                                                    setDestination(branch);
                                                                    setShowDropdown(false);
                                                                }}
                                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                                            >
                                                                {branch}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="purpose">Purpose</Label>
                                                <Textarea
                                                    id="purpose"
                                                    placeholder="What is the purpose of this movement?"
                                                    rows={3}
                                                    value={purpose}
                                                    onChange={(e) => setPurpose(e.target.value)}
                                                />
                                                {errors.purpose && (
                                                    <p className="text-sm font-medium text-red-500">{errors.purpose}</p>
                                                )}

                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {['Branch Audit', 'Branch Monitor', 'Officer Monitor', 'Client Meeting'].map((template) => (
                                                        <button
                                                            key={template}
                                                            type="button"
                                                            onClick={() => setPurpose(template)}
                                                            className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200 transition-colors duration-200"
                                                        >
                                                            {template}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="remarks">Remarks (Optional)</Label>
                                                <Textarea
                                                    id="remarks"
                                                    placeholder="Any additional information?"
                                                    rows={2}
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                />
                                                {errors.remarks && (
                                                    <p className="text-sm font-medium text-red-500">{errors.remarks}</p>
                                                )}
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                                                <Link href={route('movements.index')}>
                                                    <Button variant="outline" type="button" className="w-full sm:w-auto">
                                                        Cancel
                                                    </Button>
                                                </Link>
                                                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                                                    {submitting ? 'Submitting...' : 'Create Movement'}
                                                </Button>
                                            </div>
                                        </form>
                                    </TabsContent>

                                    <TabsContent value="templates">
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-medium mb-3 flex items-center">
                                                    <BriefcaseBusiness className="h-5 w-5 mr-2 text-indigo-600" />
                                                    Official Movement Templates
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {officialTemplates.map((template, index) => (
                                                        <Card key={`official-${index}`} className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-200" onClick={() => {
                                                            setMovementType('official');
                                                            applyTemplate(template);
                                                            setActiveTab('details');
                                                        }}>
                                                            <CardContent className="p-4">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-medium">{template.title}</h4>
                                                                        <p className="text-sm text-gray-500 mt-1">{template.purpose}</p>
                                                                    </div>
                                                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2">
                                                                        {template.hours}h
                                                                    </Badge>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>

                                            <Separator />

                                            <div>
                                                <h3 className="text-lg font-medium mb-3 flex items-center">
                                                    <User className="h-5 w-5 mr-2 text-purple-600" />
                                                    Personal Movement Templates
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {personalTemplates.map((template, index) => (
                                                        <Card key={`personal-${index}`} className="cursor-pointer hover:border-purple-300 hover:shadow-md transition-all duration-200" onClick={() => {
                                                            setMovementType('personal');
                                                            applyTemplate(template);
                                                            setActiveTab('details');
                                                        }}>
                                                            <CardContent className="p-4">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-medium">{template.title}</h4>
                                                                        <p className="text-sm text-gray-500 mt-1">{template.purpose}</p>
                                                                    </div>
                                                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 ml-2">
                                                                        {template.hours}h
                                                                    </Badge>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                                <div className="flex items-start space-x-3">
                                                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-blue-800 font-medium">Quick Template Usage</p>
                                                        <p className="text-sm text-blue-700 mt-1">
                                                            Click on any template to pre-fill the movement request form with common details. You can still edit everything before submitting.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <Button variant="outline" onClick={() => setActiveTab('details')}>
                                                    Back to Form
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        {selectedEmployee ? (
                            <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <User className="h-5 w-5 mr-2 text-blue-600" />
                                        Employee Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-sm font-medium text-gray-500">Name</p>
                                            <p className="font-medium text-lg">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Employee ID</p>
                                                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedEmployee.employee_id}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Department</p>
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                    <Building2 className="h-3 w-3 mr-1" />
                                                    {selectedEmployee.department?.name || 'N/A'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Designation</p>
                                            <p className="text-sm">{selectedEmployee.designation?.name || 'No Designation'}</p>
                                        </div>
                                    </div>

                                    <Separator className="my-6" />

                                    <div className="mt-4">
                                        <div className="flex items-center mb-4">
                                            <CalendarClock className="h-5 w-5 mr-2 text-blue-600" />
                                            <h3 className="font-medium">Movement Summary</h3>
                                        </div>

                                        {fromDate && toDate && fromTime && toTime ? (
                                            <div className="space-y-3">
                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">From:</span>
                                                            <span className="font-medium text-gray-900">
                                                                {format(fromDate, 'MMM dd')} at {formatTime12hFromHm(fromTime)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">To:</span>
                                                            <span className="font-medium text-gray-900">
                                                                {format(toDate, 'MMM dd')} at {formatTime12hFromHm(toTime)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Type:</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-xs",
                                                                    movementType === 'official'
                                                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                        : "bg-purple-50 text-purple-700 border-purple-200"
                                                                )}
                                                            >
                                                                {movementType === 'official' ? (
                                                                    <BriefcaseBusiness className="h-3 w-3 mr-1" />
                                                                ) : (
                                                                    <User className="h-3 w-3 mr-1" />
                                                                )}
                                                                {movementType.charAt(0).toUpperCase() + movementType.slice(1)}
                                                            </Badge>
                                                        </div>
                                                        {destination && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Destination:</span>
                                                                <span className="font-medium text-gray-900 text-right max-w-[60%]">{destination}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {hoursDiff > 0 && (
                                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Clock className="h-4 w-4 text-green-600" />
                                                            <span className="text-green-800 font-medium">
                                                                Duration: {hoursDiff} {hoursDiff === 1 ? 'hour' : 'hours'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">
                                                    Fill out the form to see your movement details here.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t">
                                        <h3 className="font-medium mb-3 flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                            Movement Guidelines
                                        </h3>
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex items-start">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                <p>Create a movement before leaving the office</p>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                <p>Include accurate destination and purpose details</p>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                <p>Close the movement when you return to office</p>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                <p>Your actual return time will be tracked automatically</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Movement Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center justify-center text-center p-8">
                                        <div className="text-gray-400 mb-4">
                                            <CalendarClock className="h-16 w-16 mx-auto mb-4" />
                                            {isAdmin ? (
                                                <div>
                                                    <p className="text-lg font-medium mb-2">Select an Employee</p>
                                                    <p className="text-sm">Choose an employee to view their information and create a movement request</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-lg font-medium mb-2">No Employee Information</p>
                                                    <p className="text-sm">Employee information could not be found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <TooltipProvider>
                            <Card className="mt-4">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center">
                                        <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                                        Quick Help
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 text-sm">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex justify-between items-center cursor-help p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                                        <span className="font-medium">Official vs Personal</span>
                                                    </div>
                                                    <AlertCircle className="h-4 w-4 text-blue-500" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">
                                                    Official movements are work-related and count as "on duty". Personal movements are for non-work errands.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex justify-between items-center cursor-help p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        <span className="font-medium">Closing Movements</span>
                                                    </div>
                                                    <AlertCircle className="h-4 w-4 text-blue-500" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">
                                                    Always close your movement when returning to record your actual return time.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex justify-between items-center cursor-help p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                        <span className="font-medium">Templates</span>
                                                    </div>
                                                    <AlertCircle className="h-4 w-4 text-blue-500" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">
                                                    Use the Templates tab for quick pre-filled movement requests for common situations.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
