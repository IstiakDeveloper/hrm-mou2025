import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    UserCircle,
    Building2,
    MapPin,
    CalendarDays,
    Clock,
    FileText,
    Briefcase,
    CheckCircle2,
    XCircle,
    ArrowRight,
    LogOut,
    LogIn,
    Plus,
    AlertTriangle,
    AlertCircle,
    IdCard,
    Palmtree,
} from "lucide-react";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import AdminLayout from "@/layouts/AdminLayout";
import { PageSurface } from "@/components/page-surface";
import { cn } from "@/lib/utils";
import { employeeDisplayName, employeeInitials, type EmployeeNameFields } from "@/lib/employee-name";
import { useSelfAttendanceCheck } from "@/hooks/use-self-attendance-check";

// Types for better code organization
interface Employee extends EmployeeNameFields {
    id: string;
    employee_id: string;
    photo?: string;
    department?: { name: string };
    branch?: {
        name: string;
        geofence_enabled?: boolean;
        geofence_latitude?: number | null;
        geofence_longitude?: number | null;
        geofence_radius_meters?: number | null;
        geofence_max_accuracy_meters?: number | null;
    };
}

interface Attendance {
    date: string;
    check_in?: string;
    check_out?: string;
    status: string;
}

interface Movement {
    id: string;
    destination: string;
    purpose: string;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    to_datetime: string;
    actual_return_datetime?: string;
    status: 'active' | 'completed';
}

interface LeaveBalance {
    leave_type?: { name: string; is_paid: boolean };
    remaining_days: number;
    allocated_days: number;
}

interface LeaveApplication {
    leave_type?: { name: string };
    start_date: string;
    end_date: string;
    status: 'Approved' | 'Rejected' | 'Pending';
}

interface HrProfile {
    designation?: string | null;
    department?: string | null;
    branch?: string | null;
    joining_date?: string | null;
    confirmation_date?: string | null;
    employment_status?: string | null;
    work_email?: string | null;
    phone?: string | null;
    reporting_manager?: string | null;
    reporting_employee_id?: string | null;
    employee_type?: string | null;
    program?: string | null;
    project?: string | null;
}

interface HolidayRow {
    date: string;
    title: string;
    description?: string | null;
}

export interface EmployeeDashboardProps {
    employee: Employee;
    todayAttendance?: Attendance;
    recentAttendance: Attendance[];
    leaveBalances: LeaveBalance[];
    recentLeaves: LeaveApplication[];
    recentMovements: Movement[];
    hrProfile: HrProfile;
    upcomingHolidays: HolidayRow[];
    weekendDaySummary?: string | null;
}

type EmployeeDashboardViewProps = EmployeeDashboardProps & {
    /** When true, renders only dashboard body (no layout/head) for embedding in admin section tabs. */
    embedded?: boolean;
};

export function EmployeeDashboardView({
    employee,
    todayAttendance,
    recentAttendance,
    leaveBalances,
    recentLeaves,
    recentMovements,
    hrProfile,
    upcomingHolidays,
    weekendDaySummary,
    embedded = false,
}: EmployeeDashboardViewProps) {
    // State management
    const [clockTime, setClockTime] = useState("");
    const [activeMovements, setActiveMovements] = useState<Movement[]>([]);
    const [countdownTimes, setCountdownTimes] = useState<Record<string, string>>({});
    const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});
    const {
        isSubmitting,
        attendanceError,
        locationStatus,
        locationProgress,
        locationPreview,
        handleCheckIn,
        handleCheckOut,
    } = useSelfAttendanceCheck();

    const hrDisplayRows = useMemo(
        () =>
            [
                ["Designation", hrProfile.designation],
                ["Department", hrProfile.department],
                ["Branch", hrProfile.branch],
                ["Employee type", hrProfile.employee_type],
                ["Program", hrProfile.program],
                ["Project", hrProfile.project],
                ["Joining date", hrProfile.joining_date],
                ["Confirmation", hrProfile.confirmation_date],
                ["Status", hrProfile.employment_status],
                ["Reporting to", hrProfile.reporting_manager],
                ["Supervisor ID", hrProfile.reporting_employee_id],
                ["Email", hrProfile.work_email],
                ["Phone", hrProfile.phone],
            ].filter(([, v]) => v != null && String(v).trim() !== ""),
        [hrProfile],
    );

    // Initialize active movements
    useEffect(() => {
        if (recentMovements?.length > 0) {
            const active = recentMovements.filter((m) => m.status === 'active');
            setActiveMovements(active);
        }
    }, [recentMovements]);

    // Timer management for movements
    useEffect(() => {
        if (activeMovements.length === 0) return;

        const updateTimers = () => {
            const newCountdowns: Record<string, string> = {};
            const newElapsedTimes: Record<string, string> = {};
            const now = new Date();

            activeMovements.forEach(movement => {
                // Countdown calculation
                const expectedReturn = new Date(movement.to_datetime);
                if (now > expectedReturn) {
                    newCountdowns[movement.id] = "Return time passed";
                } else {
                    const diffMs = expectedReturn.getTime() - now.getTime();
                    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                    newCountdowns[movement.id] = days > 0
                        ? `${days}d ${hours}h ${minutes}m remaining`
                        : `${hours}h ${minutes}m remaining`;
                }

                // Elapsed time calculation
                const startTime = new Date(movement.from_datetime);
                if (startTime > now) {
                    newElapsedTimes[movement.id] = "Not started yet";
                } else {
                    const elapsedMs = now.getTime() - startTime.getTime();
                    const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((elapsedMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);

                    if (days > 0) {
                        newElapsedTimes[movement.id] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                    } else if (hours > 0) {
                        newElapsedTimes[movement.id] = `${hours}h ${minutes}m ${seconds}s`;
                    } else {
                        newElapsedTimes[movement.id] = `${minutes}m ${seconds}s`;
                    }
                }
            });

            setCountdownTimes(newCountdowns);
            setElapsedTimes(newElapsedTimes);
        };

        updateTimers();
        const interval = setInterval(updateTimers, 1000);
        return () => clearInterval(interval);
    }, [activeMovements]);

    // Clock timer
    useEffect(() => {
        const timer = setInterval(() => {
            setClockTime(format(new Date(), "HH:mm:ss"));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (timeString?: string) => {
        if (!timeString) return "N/A";

        try {
            if (typeof timeString === 'string') {
                if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
                    const timeParts = timeString.split(':');
                    const date = new Date();
                    date.setHours(
                        parseInt(timeParts[0]),
                        parseInt(timeParts[1]),
                        timeParts.length === 3 ? parseInt(timeParts[2]) : 0
                    );
                    return format(date, "h:mm a");
                }

                if (timeString.includes('T')) {
                    return format(new Date(timeString), "h:mm a");
                }
            }

            return "Invalid format";
        } catch (e) {
            console.error("Error formatting time:", e, timeString);
            return "N/A";
        }
    };

    const calculateDuration = (fromTime: string, toTime: string) => {
        if (!fromTime || !toTime) return "N/A";

        try {
            const start = new Date(fromTime);
            const end = new Date(toTime);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return "N/A";
            }

            const hours = differenceInHours(end, start);
            const minutes = differenceInMinutes(end, start) % 60;

            return `${hours}h ${minutes}m`;
        } catch (e) {
            console.error("Error calculating duration:", e);
            return "N/A";
        }
    };

    const getAttendanceStatus = (attendance?: Attendance) => {
        if (!attendance) return "Not Recorded";
        return attendance.status || "Present";
    };

    const openGlobalCloseMovement = (movementId: string) => {
        if (!movementId) return;
        window.dispatchEvent(new CustomEvent('hrm:movement-close', { detail: { movementId: Number(movementId) } }));
    };

    // Navigation handlers
    const goToCreateLeave = () => {
        router.visit(route('leave.applications.create'));
    };

    const goToCreateMovement = () => {
        router.visit(route('movements.create'));
    };

    // Data preparation
    const fullName = employeeDisplayName(employee);
    const photoUrl = employee?.photo ? `/storage/${employee.photo}` : null;

    const dashboardBody = (
            <div className="flex flex-col gap-6">
                {(attendanceError || locationStatus) && (
                    <Alert className={attendanceError ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}>
                        {(attendanceError ? <XCircle className="h-4 w-4 text-red-600" /> : <AlertCircle className="h-4 w-4 text-blue-600" />)}
                        <AlertTitle className={attendanceError ? "text-red-800" : "text-blue-800"}>
                            {attendanceError ? "Attendance action blocked" : "Working"}
                        </AlertTitle>
                        <AlertDescription className={attendanceError ? "text-red-700" : "text-blue-700"}>
                            {attendanceError || locationStatus}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between border-b border-slate-100 pb-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 shadow-xs border-2 border-white ring-1 ring-zinc-200/60">
                            <AvatarImage src={photoUrl || undefined} alt={fullName} />
                            <AvatarFallback className="text-xl font-bold bg-emerald-50 text-emerald-800">
                                {employeeInitials(employee)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">Human resources</h1>
                            <p className="mt-1 text-base sm:text-lg font-semibold text-gray-800 leading-normal">{fullName}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-gray-500 text-xs sm:text-sm mt-2">
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100/80">
                                    <UserCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <span className="font-medium text-slate-700">{employee?.employee_id || "N/A"}</span>
                                </div>
                                <span className="text-gray-300 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100/80">
                                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <span className="font-medium text-slate-700">{employee?.department?.name || "N/A"}</span>
                                </div>
                                <span className="text-gray-300 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100/80">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <span className="font-medium text-slate-700">{employee?.branch?.name || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 w-full lg:w-auto justify-between shrink-0">
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button
                                onClick={goToCreateLeave}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                            >
                                <CalendarDays className="h-4 w-4 mr-2" />
                                Apply Leave
                            </Button>
                            <Button
                                onClick={goToCreateMovement}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Movement
                            </Button>
                        </div>

                        {/* Date and Time */}
                        <div className="text-left lg:text-right">
                            <div className="text-xs sm:text-sm text-gray-500 font-medium">
                                {format(new Date(), "EEEE, MMMM d, yyyy")}
                            </div>
                            <div className="text-lg sm:text-xl font-mono text-gray-900 mt-0.5">{clockTime}</div>
                        </div>
                    </div>
                </div>

                {/* Today's Attendance Card */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            Today's Attendance
                        </CardTitle>
                        <CardDescription>Your attendance record for today</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(isSubmitting || locationProgress > 0) && (
                            <div className="mb-4 rounded-xl border bg-gradient-to-b from-white to-gray-50 p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-medium text-gray-700 truncate">
                                            {locationStatus || "Checking location…"}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 ring-1 ring-blue-200">
                                                GPS
                                            </span>
                                            {locationPreview.sampleCount > 0 && (
                                                <span className="truncate">
                                                    Best accuracy:{" "}
                                                    <span className="font-semibold text-gray-700">
                                                        {locationPreview.bestAccuracy !== null
                                                            ? `${Math.round(locationPreview.bestAccuracy)}m`
                                                            : "N/A"}
                                                    </span>
                                                    {" • "}Samples:{" "}
                                                    <span className="font-semibold text-gray-700">
                                                        {locationPreview.sampleCount}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-xs font-semibold tabular-nums text-gray-700">
                                        {Math.min(100, Math.max(0, locationProgress))}%
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 ${locationProgress < 70 ? "text-gray-900" : "text-gray-500"}`}>
                                            <span className={`h-2 w-2 rounded-full ${locationProgress < 70 ? "bg-blue-600" : "bg-gray-300"}`} />
                                            Locating
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className={`inline-flex items-center gap-1 ${locationProgress >= 70 && locationProgress < 90 ? "text-gray-900" : "text-gray-500"}`}>
                                            <span className={`h-2 w-2 rounded-full ${locationProgress >= 70 && locationProgress < 90 ? "bg-indigo-600" : "bg-gray-300"}`} />
                                            Verifying
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className={`inline-flex items-center gap-1 ${locationProgress >= 90 ? "text-gray-900" : "text-gray-500"}`}>
                                            <span className={`h-2 w-2 rounded-full ${locationProgress >= 90 ? "bg-emerald-600" : "bg-gray-300"}`} />
                                            Submitting
                                        </span>
                                    </div>
                                    <div className="hidden sm:block text-gray-400">
                                        Keep GPS on for best accuracy
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <Progress
                                        value={locationProgress}
                                        className="h-3.5"
                                        indicatorClassName="animate-pulse"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                                <Badge
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-semibold w-fit",
                                        todayAttendance
                                            ? "bg-green-100 text-green-800 border-green-300"
                                            : "bg-yellow-100 text-yellow-800 border-yellow-300"
                                    )}
                                >
                                    {getAttendanceStatus(todayAttendance)}
                                </Badge>
                                {todayAttendance && (
                                    <div className="flex flex-wrap items-center gap-4 mt-2 sm:mt-0">
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs sm:text-sm">
                                            <LogIn className="h-4 w-4 text-emerald-600" />
                                            <span className="font-medium text-slate-700">In: {formatTime(todayAttendance.check_in)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs sm:text-sm">
                                            <LogOut className="h-4 w-4 text-rose-600" />
                                            <span className="font-medium text-slate-700">Out: {formatTime(todayAttendance.check_out)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                {(!todayAttendance || !todayAttendance.check_in) && (
                                    <Button
                                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                        onClick={handleCheckIn}
                                        disabled={isSubmitting}
                                    >
                                        <LogIn className="h-4 w-4 mr-2" />
                                        {isSubmitting ? "Processing..." : "Check In"}
                                    </Button>
                                )}
                                {todayAttendance?.check_in && (
                                    <Button
                                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-medium"
                                        onClick={handleCheckOut}
                                        disabled={isSubmitting}
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        {isSubmitting ? "Processing..." : "Check Out"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main dashboard */}
                <div className="flex flex-col xl:flex-row gap-4 xl:items-start xl:gap-5">
                    {/* Left — HR profile (rendered first on xl, but ordered second on smaller screens) */}
                    <div className="flex flex-col gap-4 xl:w-[380px] xl:shrink-0 order-2 xl:order-1">
                        <Card className="overflow-hidden border-emerald-200/70 bg-white/90 shadow-sm">
                            <CardHeader className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white py-3">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                                    <IdCard className="h-5 w-5 shrink-0 text-emerald-700" />
                                    HR information
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Posting, reporting line, and contact on record
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-0 pt-3 text-sm">
                                {hrDisplayRows.length === 0 ? (
                                    <p className="py-2 text-xs text-zinc-500">
                                        No HR profile fields are on file yet. Contact HR if something is missing.
                                    </p>
                                ) : (
                                    hrDisplayRows.map(([label, val]) => (
                                        <div
                                            key={label}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 border-b border-zinc-50 py-2.5 last:border-b-0 text-xs sm:text-sm"
                                        >
                                            <span className="text-zinc-500 shrink-0">{label}</span>
                                            <span className="font-medium text-zinc-900 text-left sm:text-right break-all sm:break-normal sm:max-w-[65%]">
                                                {String(val)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {weekendDaySummary ? (
                            <Card className="border-emerald-200/70 bg-white/90 shadow-sm">
                                <CardHeader className="py-3">
                                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                                        <Palmtree className="h-4 w-4 text-amber-600" />
                                        Weekend (this branch)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-3 pt-0 text-sm text-zinc-700">{weekendDaySummary}</CardContent>
                            </Card>
                        ) : null}
                    </div>

                    {/* Right — main content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-4 order-1 xl:order-2">
                        {/* Primary — leave & movements (always stays at top) */}
                        <Tabs defaultValue="leaves" className="w-full">
                            <TabsList className="grid grid-cols-3 mb-6 h-auto p-1 bg-white/80 border border-emerald-100">
                                <TabsTrigger
                                    value="leaves"
                                    className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                >
                                    <span className="hidden sm:inline">Leave </span>Balances
                                </TabsTrigger>
                                <TabsTrigger
                                    value="applications"
                                    className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                >
                                    <span className="hidden sm:inline">Leave </span>Applications
                                </TabsTrigger>
                                <TabsTrigger
                                    value="movements"
                                    className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                >
                                    Movements
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="leaves" className="mt-0">
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CalendarDays className="h-5 w-5 text-emerald-600" />
                                            Leave Balances
                                        </CardTitle>
                                        <CardDescription>Your remaining leave balances for the current year</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {leaveBalances?.length > 0 ? (
                                                leaveBalances.map((balance, index) => (
                                                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                                                        <div className="flex flex-col">
                                                            <div className="font-medium">{balance.leave_type?.name || "N/A"}</div>
                                                            {balance.leave_type?.is_paid && (
                                                                <span className="text-xs text-emerald-600 font-medium">Paid Leave</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-lg">{balance.remaining_days}</span>
                                                            <span className="text-sm text-gray-500">/ {balance.allocated_days} days</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-gray-500 py-8">No leave balances found</div>
                                            )}
                                        </div>
                                        <div className="mt-6">
                                            <Button onClick={goToCreateLeave} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                                <FileText className="h-4 w-4 mr-2" />
                                                Apply for Leave
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="applications" className="mt-0">
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-emerald-700" />
                                            Recent Leave Applications
                                        </CardTitle>
                                        <CardDescription>Status of your recent leave requests</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {recentLeaves?.length > 0 ? (
                                                recentLeaves.map((leave, index) => (
                                                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                                                        <div>
                                                            <div className="font-medium">{leave.leave_type?.name || "N/A"}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {format(new Date(leave.start_date), "MMM d")} - {format(new Date(leave.end_date), "MMM d, yyyy")}
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            className={`${String(leave.status).toLowerCase() === "approved" ? "bg-green-100 text-green-800" :
                                                                    String(leave.status).toLowerCase() === "rejected" ? "bg-red-100 text-red-800" :
                                                                        "bg-yellow-100 text-yellow-800"
                                                                }`}
                                                        >
                                                            {leave.status}
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-gray-500 py-8">No recent leave applications</div>
                                            )}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Button variant="outline" size="sm" className="border-gray-300" asChild>
                                                <Link href={route("leave.applications.index")}>
                                                    View all applications
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="movements" className="mt-0">
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Briefcase className="h-5 w-5 text-emerald-700" />
                                            Recent Movements
                                        </CardTitle>
                                        <CardDescription>Your recent movements and transfers</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {recentMovements?.length > 0 ? (
                                                recentMovements.map((movement, index) => (
                                                        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="font-medium flex items-center gap-2 flex-wrap">
                                                                        <MapPin className="h-4 w-4 text-gray-500" />
                                                                        {movement.destination}
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`${movement.movement_type === 'official'
                                                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                                                                }`}
                                                                        >
                                                                            {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="text-sm text-gray-600 mt-1">
                                                                        {movement.purpose}
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    className={`${movement.status === 'active'
                                                                            ? 'bg-blue-100 text-blue-700'
                                                                            : 'bg-green-100 text-green-700'
                                                                        }`}
                                                                >
                                                                    {movement.status === 'active' ? 'Active' : 'Completed'}
                                                                </Badge>
                                                            </div>

                                                            <div className="flex flex-wrap justify-between text-sm text-gray-600">
                                                                <div className="flex items-center gap-2">
                                                                    <CalendarDays className="h-4 w-4" />
                                                                    <span>
                                                                        {format(new Date(movement.from_datetime), "MMM d, h:mm a")}
                                                                    </span>
                                                                    <ArrowRight className="h-4 w-4 text-gray-400" />
                                                                    <span>
                                                                        {movement.status === 'completed' && movement.actual_return_datetime
                                                                            ? format(new Date(movement.actual_return_datetime), "MMM d, h:mm a")
                                                                            : format(new Date(movement.to_datetime), "MMM d, h:mm a")}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Duration for completed movements */}
                                                            {movement.status === 'completed' && movement.actual_return_datetime && (
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        Duration: {calculateDuration(movement.from_datetime, movement.actual_return_datetime)}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Timer and actions for active movements */}
                                                            {movement.status === 'active' && (
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                                                                            <Clock className="h-3.5 w-3.5" />
                                                                            Elapsed: {elapsedTimes[movement.id] || "Calculating..."}
                                                                        </div>
                                                                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                                                                            <AlertCircle className="h-3.5 w-3.5" />
                                                                            {countdownTimes[movement.id] || "Calculating..."}
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                                        onClick={() => openGlobalCloseMovement(movement.id)}
                                                                        disabled={isSubmitting}
                                                                    >
                                                                        {isSubmitting ? "Processing..." : (
                                                                            <>
                                                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                                                Close Movement
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="text-center text-gray-500 py-8">No recent movements</div>
                                            )}
                                        </div>

                                        {/* Add Movement Button */}
                                        <div className="mt-6">
                                            <Button onClick={goToCreateMovement} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                                <Briefcase className="h-4 w-4 mr-2" />
                                                Add Movement
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* Secondary — compact cards */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <Card className="border-emerald-200/70 bg-white/90 shadow-sm">
                                <CardHeader className="py-3">
                                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                                        <CalendarDays className="h-4 w-4 text-emerald-700" />
                                        Upcoming holidays
                                    </CardTitle>
                                    <CardDescription className="text-xs">Next dates for your branch rules</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {upcomingHolidays?.length ? (
                                        <ul className="divide-y divide-zinc-100">
                                            {upcomingHolidays.map((h, i) => (
                                                <li key={i} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                                                    <span className="min-w-0 font-medium leading-snug text-zinc-900">
                                                        {h.title}
                                                    </span>
                                                    <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                                                        {format(new Date(h.date), 'd MMM')}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="py-2 text-xs text-zinc-500">No upcoming holidays in this window.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-emerald-200/70 bg-white/90 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Recent attendance</CardTitle>
                                    <CardDescription>Last 7 days</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {recentAttendance?.length > 0 ? (
                                            recentAttendance.map((attendance, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium text-sm">
                                                            {format(new Date(attendance.date), "EEEE, MMM d")}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {formatTime(attendance.check_in)} - {formatTime(attendance.check_out)}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        className={cn(
                                                            "shrink-0 text-xs",
                                                            String(attendance.status).toLowerCase() === "present"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-amber-100 text-amber-800",
                                                        )}
                                                    >
                                                        {attendance.status}
                                                    </Badge>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-500 py-8 text-sm">
                                                No recent attendance records
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
    );

    if (embedded) {
        return dashboardBody;
    }

    return (
        <AdminLayout>
            <Head title="Human resources" />
            <PageSurface className="px-0 py-0 md:py-2">
                {dashboardBody}
            </PageSurface>
        </AdminLayout>
    );
}

export default function EmployeeDashboard(props: EmployeeDashboardProps) {
    return <EmployeeDashboardView {...props} />;
}
