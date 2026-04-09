import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    UserCircle,
    Building2,
    MapPin,
    Calendar as CalendarIcon,
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
    CalendarDays
} from "lucide-react";
import { format, parseISO, differenceInMinutes, differenceInHours } from "date-fns";
import AdminLayout from "@/layouts/AdminLayout";
import { Link, router } from "@inertiajs/react";

// Types for better code organization
interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_id: string;
    photo?: string;
    department?: { name: string };
    branch?: { name: string };
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

interface DashboardProps {
    employee: Employee;
    todayAttendance?: Attendance;
    recentAttendance: Attendance[];
    leaveBalances: LeaveBalance[];
    recentLeaves: LeaveApplication[];
    recentMovements: Movement[];
}

export default function EmployeeDashboard({
    employee,
    todayAttendance,
    recentAttendance,
    leaveBalances,
    recentLeaves,
    recentMovements
}: DashboardProps) {
    // State management
    const [currentDate, setCurrentDate] = useState(new Date());
    const [clockTime, setClockTime] = useState("");
    const [activeMovements, setActiveMovements] = useState<Movement[]>([]);
    const [countdownTimes, setCountdownTimes] = useState<Record<string, string>>({});
    const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completedMovementIds, setCompletedMovementIds] = useState<string[]>([]);

    // Initialize active movements
    useEffect(() => {
        if (recentMovements?.length > 0) {
            const active = recentMovements.filter(m =>
                m.status === 'active' && !completedMovementIds.includes(m.id)
            );
            setActiveMovements(active);
        }
    }, [recentMovements, completedMovementIds]);

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

    // Utility functions
    const getInitials = (firstName: string) => {
        return firstName?.charAt(0).toUpperCase() || "N";
    };

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
    const fullName = employee ? `${employee.first_name} ${employee.last_name}`.trim() : "Employee";
    const photoUrl = employee?.photo ? `/storage/${employee.photo}` : null;

    return (
        <AdminLayout>
            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Active Movements Alert Section */}
                {activeMovements.length > 0 && (
                    <div className="space-y-3">
                        {activeMovements.map(movement => (
                            <Alert key={movement.id} className="border-amber-200 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <AlertTitle className="text-amber-800 flex items-center flex-wrap gap-2">
                                            <MapPin className="h-4 w-4" />
                                            <span>{movement.destination}</span>
                                            <Badge
                                                variant="outline"
                                                className={`${movement.movement_type === 'official'
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                                    }`}
                                            >
                                                {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                                            </Badge>
                                        </AlertTitle>
                                        <AlertDescription className="text-amber-700 mt-1">
                                            <div className="text-sm">
                                                From: {format(new Date(movement.from_datetime), "MMM d, h:mm a")} •
                                                Expected return: {format(new Date(movement.to_datetime), "MMM d, h:mm a")}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <div className="flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs">
                                                    <Clock className="h-3.5 w-3.5 mr-1" />
                                                    Elapsed: {elapsedTimes[movement.id] || "Calculating..."}
                                                </div>
                                                <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                                    {countdownTimes[movement.id] || "Calculating..."}
                                                </div>
                                            </div>
                                        </AlertDescription>
                                    </div>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                                        onClick={() => openGlobalCloseMovement(movement.id)}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            "Processing..."
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Close Movement
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={photoUrl || undefined} alt={fullName} />
                            <AvatarFallback className="text-lg font-semibold">
                                {getInitials(employee?.first_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                            <div className="flex flex-wrap items-center gap-2 text-gray-600 text-sm">
                                <div className="flex items-center gap-1">
                                    <UserCircle className="h-4 w-4" />
                                    <span>{employee?.employee_id || "N/A"}</span>
                                </div>
                                <span className="text-gray-400">•</span>
                                <div className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    <span>{employee?.department?.name || "N/A"}</span>
                                </div>
                                <span className="text-gray-400">•</span>
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{employee?.branch?.name || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-3">
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={goToCreateLeave}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <CalendarDays className="h-4 w-4 mr-2" />
                                Apply Leave
                            </Button>
                            <Button
                                onClick={goToCreateMovement}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Movement
                            </Button>
                        </div>

                        {/* Date and Time */}
                        <div className="text-right">
                            <div className="text-sm text-gray-500">
                                {format(currentDate, "EEEE, MMMM d, yyyy")}
                            </div>
                            <div className="text-xl font-mono text-gray-900">{clockTime}</div>
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
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <Badge
                                    className={`${todayAttendance
                                            ? "bg-green-100 text-green-800 border-green-300"
                                            : "bg-yellow-100 text-yellow-800 border-yellow-300"
                                        }`}
                                >
                                    {getAttendanceStatus(todayAttendance)}
                                </Badge>
                                {todayAttendance && (
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <LogIn className="h-4 w-4 text-green-600" />
                                            <span className="font-medium">In: {formatTime(todayAttendance.check_in)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <LogOut className="h-4 w-4 text-red-600" />
                                            <span className="font-medium">Out: {formatTime(todayAttendance.check_out)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {!todayAttendance && (
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        <LogIn className="h-4 w-4 mr-2" />
                                        Check In
                                    </Button>
                                )}
                                {todayAttendance && !todayAttendance.check_out && (
                                    <Button className="bg-red-600 hover:bg-red-700">
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Check Out
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Dashboard Content */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column - Calendar & Attendance */}
                    <div className="xl:col-span-1 flex flex-col gap-6">
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                                    Calendar
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Calendar
                                    mode="single"
                                    selected={currentDate}
                                    onSelect={(day) => {
                                        if (day) setCurrentDate(day);
                                    }}
                                    className="rounded-md border"
                                />
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Recent Attendance</CardTitle>
                                <CardDescription>Your attendance history</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentAttendance?.length > 0 ? (
                                        recentAttendance.map((attendance, index) => (
                                            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        {format(new Date(attendance.date), "EEEE, MMM d")}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatTime(attendance.check_in)} - {formatTime(attendance.check_out)}
                                                    </div>
                                                </div>
                                                <Badge
                                                    className={`text-xs ${attendance.status === "Present"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                        }`}
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

                    {/* Right Columns - Tabs Content */}
                    <div className="xl:col-span-2">
                        <Tabs defaultValue="leaves" className="w-full">
                            <TabsList className="grid grid-cols-3 mb-6 h-auto p-1">
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
                                            <FileText className="h-5 w-5 text-blue-600" />
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
                                                            className={`${leave.status === "Approved" ? "bg-green-100 text-green-800" :
                                                                    leave.status === "Rejected" ? "bg-red-100 text-red-800" :
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
                                        <div className="mt-6 flex justify-end">
                                            <Button variant="outline" className="border-gray-300">
                                                View All Applications
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="movements" className="mt-0">
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Briefcase className="h-5 w-5 text-purple-600" />
                                            Recent Movements
                                        </CardTitle>
                                        <CardDescription>Your recent movements and transfers</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {recentMovements?.length > 0 ? (
                                                recentMovements
                                                    .filter(movement => !(completedMovementIds.includes(movement.id) && movement.status === 'active'))
                                                    .map((movement, index) => (
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
                                                                    <CalendarIcon className="h-4 w-4" />
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
                                                            {movement.status === 'active' && !completedMovementIds.includes(movement.id) && (
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
                                            <Button onClick={goToCreateMovement} className="w-full bg-blue-600 hover:bg-blue-700">
                                                <Briefcase className="h-4 w-4 mr-2" />
                                                Add Movement
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
