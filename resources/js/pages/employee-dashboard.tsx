import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    Plus
} from "lucide-react";
import { format, parseISO } from "date-fns";
import AdminLayout from "@/layouts/AdminLayout";
import { Link, router } from "@inertiajs/react";

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

    // Update clock time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setClockTime(format(new Date(), "HH:mm:ss"));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

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

    const dashboardContent = (
        <div className="flex flex-col gap-6 p-6">
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
                        <Link href="/movements/create" className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors">
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
                                            recentMovements.map((movement, index) => (
                                                <div key={index} className="flex justify-between items-center pb-2 border-b">
                                                    <div>
                                                        <div className="font-medium">{movement.type}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {isNaN(new Date(movement.created_at))
                                                                ? "Invalid Date"
                                                                : format(new Date(movement.created_at), "MMMM d, yyyy")}
                                                        </div>

                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm">{movement.from} <ArrowRight className="inline h-3 w-3" /> {movement.to}</div>
                                                        <Badge className="mt-1">{movement.status}</Badge>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-500 py-4">No recent movements</div>
                                        )}
                                    </div>
                                    {/* Add Movement Button - Add this code */}
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
