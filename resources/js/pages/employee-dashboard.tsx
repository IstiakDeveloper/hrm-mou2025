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
    AlertCircle
} from "lucide-react";
import { format, parseISO, differenceInMinutes, differenceInHours } from "date-fns";
import AdminLayout from "@/layouts/AdminLayout";
import { Link, router } from "@inertiajs/react";
import axios from 'axios';

export default function EmployeeDashboard({
    employee,
    todayAttendance,
    recentAttendance,
    leaveBalances,
    recentLeaves,
    recentMovements
}) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [clockTime, setClockTime] = useState("");
    const [activeMovements, setActiveMovements] = useState([]);
    const [countdownTimes, setCountdownTimes] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completedMovementIds, setCompletedMovementIds] = useState([]);
    const [elapsedTimes, setElapsedTimes] = useState({});


    // Initialize active movements on component mount
    useEffect(() => {
        if (recentMovements && recentMovements.length > 0) {
            // Filter active movements that aren't marked as completed in local state
            const active = recentMovements.filter(m =>
                m.status === 'active' && !completedMovementIds.includes(m.id)
            );
            setActiveMovements(active);

            // Initialize countdown for each active movement
            updateAllCountdowns(active);
        }
    }, [recentMovements, completedMovementIds]);

    // Function to update all countdowns
    const updateAllCountdowns = (movements) => {
        const times = {};

        movements.forEach(movement => {
            const now = new Date();
            const expectedReturn = new Date(movement.to_datetime);

            // Check if expected return time has passed
            if (now > expectedReturn) {
                times[movement.id] = "Return time passed";
                return;
            }

            // Calculate remaining time
            const diffMs = expectedReturn - now;
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            // Format display based on remaining time
            if (days > 0) {
                times[movement.id] = `${days}d ${hours}h ${minutes}m remaining`;
            } else {
                times[movement.id] = `${hours}h ${minutes}m remaining`;
            }
        });

        setCountdownTimes(times);
    };

    // useEffect for timer calculation needs to be updated:
    useEffect(() => {
        if (activeMovements.length === 0) return;

        // Function to update both countdowns and elapsed time
        const updateAllTimers = () => {
            const newCountdowns = {};
            const newElapsedTimes = {};
            const now = new Date();

            activeMovements.forEach(movement => {
                // 1. Calculate countdown time (time remaining)
                const expectedReturn = new Date(movement.to_datetime);

                if (now > expectedReturn) {
                    newCountdowns[movement.id] = "Return time passed";
                } else {
                    const diffMs = expectedReturn - now;
                    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                    if (days > 0) {
                        newCountdowns[movement.id] = `${days}d ${hours}h ${minutes}m remaining`;
                    } else {
                        newCountdowns[movement.id] = `${hours}h ${minutes}m remaining`;
                    }
                }

                // 2. Calculate elapsed time (time spent)
                const startTime = new Date(movement.from_datetime);
                if (startTime > now) {
                    // Movement hasn't started yet
                    newElapsedTimes[movement.id] = "Not started yet";
                } else {
                    const elapsedMs = now - startTime;
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

        // Initial call to set countdowns and elapsed times
        updateAllTimers();

        // Update every second for real-time clock effect
        const interval = setInterval(updateAllTimers, 1000);

        return () => clearInterval(interval);
    }, [activeMovements]);

    // Update clock time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setClockTime(format(new Date(), "HH:mm:ss"));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Close movement directly from dashboard without redirecting
    const handleCloseMovement = async (movementId) => {
        if (isSubmitting) return; // Prevent multiple submissions

        try {
            setIsSubmitting(true);

            // Get CSRF token from meta tag
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            // Make POST request to complete the movement
            const response = await axios.post(
                route('movements.complete', movementId),
                { actual_return_datetime: null }, // Send null to use current time
                {
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    }
                }
            );

            // If successful, update UI
            if (response.status === 200 || response.status === 201 || response.status === 204) {
                // Add this movement to completed list to visually remove it
                setCompletedMovementIds(prev => [...prev, movementId]);

                // Show success toast or alert
                alert('Movement completed successfully!');
            }
        } catch (error) {
            console.error('Error closing movement:', error);
            alert('Error closing movement. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format attendance status
    const getAttendanceStatus = (attendance) => {
        if (!attendance) return "Not Recorded";
        return attendance.status || "Present";
    };

    // Generate initials for avatar
    const fullName = employee ? `${employee.first_name} ${employee.last_name}`.trim() : "Employee";

    // Get initials from first name only
    const getInitials = (firstName) => {
        return firstName ? firstName.charAt(0).toUpperCase() : "N";
    };

    // Get complete photo URL (adjust base URL as needed)
    const photoUrl = employee?.photo ? `/storage/${employee.photo}` : null;

    const goToCreatePage = () => {
        // Use router.visit instead of router.get to ensure proper navigation
        router.visit(route('leave.applications.create'));
    };

    // Improved time formatter that handles various time formats
    const formatTime = (timeString) => {
        if (!timeString) return "N/A";

        try {
            // Handle different time formats
            if (typeof timeString === 'string') {
                // If it's already in a format like "14:30:00" or "14:30"
                if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
                    // Ensure the time has seconds
                    const timeParts = timeString.split(':');
                    const fullTimeString = timeParts.length === 2
                        ? `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:00`
                        : `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${timeParts[2].padStart(2, '0')}`;

                    // Create a reference date and append the time
                    const date = new Date();
                    date.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), timeParts.length === 3 ? parseInt(timeParts[2]) : 0);

                    return format(date, "h:mm a");
                }

                // If it's an ISO date string with time
                if (timeString.includes('T')) {
                    return format(new Date(timeString), "h:mm a");
                }
            }

            // If it's a Date object
            if (timeString instanceof Date) {
                return format(timeString, "h:mm a");
            }

            return "Invalid format";
        } catch (e) {
            console.error("Error formatting time:", e, timeString);
            return "N/A";
        }
    };

    // Calculate duration between times
    const calculateDuration = (fromTime, toTime) => {
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

    const dashboardContent = (
        <div className="flex flex-col gap-6 p-6">
            {/* Active Movements Alert - Only show if there are active movements */}
            {/* Active Movements Alert - Update the existing code for active movements */}
            {activeMovements.map(movement => (
                <div key={movement.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-3 rounded border border-amber-100">
                    <div>
                        <div className="font-medium text-gray-800 flex items-center flex-wrap gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>{movement.destination}</span>
                            <Badge
                                variant="outline"
                                style={{
                                    background: movement.movement_type === 'official'
                                        ? 'rgba(79, 70, 229, 0.1)'
                                        : 'rgba(168, 85, 247, 0.1)',
                                    color: movement.movement_type === 'official'
                                        ? 'rgb(79, 70, 229)'
                                        : 'rgb(168, 85, 247)',
                                    borderColor: movement.movement_type === 'official'
                                        ? 'rgba(79, 70, 229, 0.3)'
                                        : 'rgba(168, 85, 247, 0.3)',
                                }}
                            >
                                {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                            </Badge>
                        </div>
                        <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-2 mt-1">
                            <span>From: {format(new Date(movement.from_datetime), "MMM d, h:mm a")}</span>
                            <span>Expected return: {format(new Date(movement.to_datetime), "MMM d, h:mm a")}</span>
                        </div>

                        {/* Timer display */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {/* Elapsed time (stopwatch) */}
                            <div className="flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Elapsed: {elapsedTimes[movement.id] || "Calculating..."}
                            </div>

                            {/* Countdown */}
                            <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                {countdownTimes[movement.id] || "Calculating..."}
                            </div>
                        </div>
                    </div>
                    <Button
                        className="mt-3 md:mt-0 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleCloseMovement(movement.id)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Close Movement
                            </>
                        )}
                    </Button>
                </div>
            ))}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={photoUrl} alt={fullName} />
                        <AvatarFallback>{getInitials(employee?.first_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold">{fullName}</h1>
                        <div className="flex items-center gap-2 text-gray-500">
                            <UserCircle className="h-4 w-4" />
                            <span>{employee?.employee_id || "N/A"}</span>
                            <span className="mx-1">•</span>
                            <Building2 className="h-4 w-4" />
                            <span>{employee?.department?.name || "N/A"}</span>
                            <span className="mx-1">•</span>
                            <MapPin className="h-4 w-4" />
                            <span>{employee?.branch?.name || "N/A"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-4">
                        <Link href={route('movements.create')} className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors">
                            <Plus className="h-4 w-4" />
                            Add Movement
                        </Link>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">
                            {currentDate instanceof Date && !isNaN(currentDate.getTime())
                                ? format(currentDate, "EEEE, MMMM d, yyyy")
                                : "Invalid date"}
                        </div>

                        <div className="text-xl font-mono">{clockTime}</div>
                    </div>
                </div>
            </div>

            {/* Today's Attendance Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Today's Attendance</CardTitle>
                    <CardDescription>Your attendance record for today</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Badge className={todayAttendance ? "bg-green-500" : "bg-yellow-500"}>
                                {getAttendanceStatus(todayAttendance)}
                            </Badge>
                            {todayAttendance && (
                                <div className="flex items-center gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Calendar & Attendance */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Calendar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Calendar
                                mode="single"
                                selected={currentDate}
                                onSelect={setCurrentDate}
                                className="rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Recent Attendance</CardTitle>
                            <CardDescription>Your attendance history</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentAttendance && recentAttendance.length > 0 ? (
                                    recentAttendance.map((attendance, index) => (
                                        <div key={index} className="flex justify-between items-center pb-2 border-b">
                                            <div>
                                                <div className="font-medium">
                                                    {format(new Date(attendance.date), "EEEE, MMM d")}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatTime(attendance.check_in)} - {formatTime(attendance.check_out)}
                                                </div>
                                            </div>
                                            <Badge className={attendance.status === "Present" ? "bg-green-500" : "bg-yellow-500"}>
                                                {attendance.status}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 py-4">No recent attendance records</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Middle & Right Columns - Leave Balances & Recent Activities */}
                <div className="md:col-span-2">
                    <Tabs defaultValue="leaves" className="w-full">
                        <TabsList className="grid grid-cols-3 mb-4">
                            <TabsTrigger value="leaves">Leave Balances</TabsTrigger>
                            <TabsTrigger value="applications">Leave Applications</TabsTrigger>
                            <TabsTrigger value="movements">Movements</TabsTrigger>
                        </TabsList>

                        <TabsContent value="leaves">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Leave Balances</CardTitle>
                                    <CardDescription>Your remaining leave balances for the current year</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {leaveBalances && leaveBalances.length > 0 ? (
                                            leaveBalances.map((balance, index) => (
                                                <div key={index} className="flex justify-between items-center pb-2 border-b">
                                                    <div className="flex flex-col">
                                                        <div className="font-medium">{balance.leave_type?.name || "N/A"}</div>
                                                        {balance.leave_type?.is_paid &&
                                                            <span className="text-xs text-green-600">Paid Leave</span>
                                                        }
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">{balance.remaining_days}</span>
                                                        <span className="text-sm text-gray-500">/ {balance.allocated_days} days</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-500 py-4">No leave balances found</div>
                                        )}
                                    </div>
                                    <div className="mt-6">
                                        <Button onClick={goToCreatePage} className="w-full">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Apply for Leave
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="applications">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Leave Applications</CardTitle>
                                    <CardDescription>Status of your recent leave requests</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {recentLeaves && recentLeaves.length > 0 ? (
                                            recentLeaves.map((leave, index) => (
                                                <div key={index} className="flex justify-between items-center pb-2 border-b">
                                                    <div>
                                                        <div className="font-medium">{leave.leave_type?.name || "N/A"}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {format(new Date(leave.start_date), "MMM d")} - {format(new Date(leave.end_date), "MMM d, yyyy")}
                                                        </div>
                                                    </div>
                                                    <Badge className={
                                                        leave.status === "Approved" ? "bg-green-500" :
                                                            leave.status === "Rejected" ? "bg-red-500" : "bg-yellow-500"
                                                    }>
                                                        {leave.status}
                                                    </Badge>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-500 py-4">No recent leave applications</div>
                                        )}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Button variant="outline">
                                            View All Applications
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="movements">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Movements</CardTitle>
                                    <CardDescription>Your recent movements and transfers</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {recentMovements && recentMovements.length > 0 ? (
                                            recentMovements.map((movement, index) => {
                                                // Skip movements that have been completed via the dashboard
                                                if (completedMovementIds.includes(movement.id) && movement.status === 'active') {
                                                    return null;
                                                }

                                                return (
                                                    <div key={index} className="flex flex-col pb-2 border-b">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <div className="font-medium flex items-center">
                                                                    <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                                                                    {movement.destination}
                                                                    <Badge
                                                                        className="ml-2"
                                                                        variant="outline"
                                                                        style={{
                                                                            background: movement.movement_type === 'official'
                                                                                ? 'rgba(79, 70, 229, 0.1)'
                                                                                : 'rgba(168, 85, 247, 0.1)',
                                                                            color: movement.movement_type === 'official'
                                                                                ? 'rgb(79, 70, 229)'
                                                                                : 'rgb(168, 85, 247)',
                                                                            borderColor: movement.movement_type === 'official'
                                                                                ? 'rgba(79, 70, 229, 0.3)'
                                                                                : 'rgba(168, 85, 247, 0.3)',
                                                                        }}
                                                                    >
                                                                        {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {movement.purpose}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <Badge
                                                                    className={movement.status === 'active'
                                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                        : 'bg-green-50 text-green-700 border-green-200'
                                                                    }
                                                                >
                                                                    {movement.status === 'active' ? 'Active' : 'Completed'}
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap justify-between text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <CalendarIcon className="h-3.5 w-3.5 text-gray-500" />
                                                                <span>
                                                                    {format(new Date(movement.from_datetime), "MMM d, yyyy h:mm a")}
                                                                </span>
                                                                <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                                                                <span>
                                                                    {movement.status === 'completed' && movement.actual_return_datetime
                                                                        ? format(new Date(movement.actual_return_datetime), "MMM d, yyyy h:mm a")
                                                                        : format(new Date(movement.to_datetime), "MMM d, yyyy h:mm a")}
                                                                </span>
                                                            </div>

                                                            {/* Duration for completed movements */}
                                                            {movement.status === 'completed' && movement.actual_return_datetime && (
                                                                <div className="mt-1 text-xs text-green-600 font-medium">
                                                                    <Clock className="h-3.5 w-3.5 inline mr-1" />
                                                                    Duration: {calculateDuration(movement.from_datetime, movement.actual_return_datetime)}
                                                                </div>
                                                            )}

                                                            {/* Close button for active movements */}
                                                            {movement.status === 'active' && !completedMovementIds.includes(movement.id) && (
                                                                <div className="mt-2 flex items-center justify-between w-full">
                                                                    <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                                                                        {countdownTimes[movement.id] || "Calculating..."}
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                                        onClick={() => handleCloseMovement(movement.id)}
                                                                        disabled={isSubmitting}
                                                                    >
                                                                        {isSubmitting ? "Processing..." : (
                                                                            <>
                                                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                                                Close
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }).filter(item => item !== null) // Filter out null items (completed movements)
                                        ) : (
                                            <div className="text-center text-gray-500 py-4">No recent movements</div>
                                        )}
                                    </div>

                                    {/* Add Movement Button */}
                                    <div className="mt-6">
                                        <Button onClick={() => router.visit(route('movements.create'))} className="w-full">
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
    );

    return (
        <AdminLayout>
            {dashboardContent}
        </AdminLayout>
    );
}
