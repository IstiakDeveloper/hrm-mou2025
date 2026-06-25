import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Edit,
  Trash2,
  MoreHorizontal,
  Plus,
  Building,
  AlarmClock,
  CalendarDays,
  Timer,
  BarChart2,
  AlertCircle,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { PageSurface } from '@/components/page-surface';

interface Branch {
  id: number;
  name: string;
}

interface AttendanceSetting {
  id: number;
  branch_id: number;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  half_day_hours: number;
  weekend_days: number[] | string; // Can be either array or JSON string
  branch: Branch;
}

interface AttendanceSettingsIndexProps {
  settings: AttendanceSetting[];
  branches: Branch[];
}

export default function AttendanceSettingsIndex({ settings, branches }: AttendanceSettingsIndexProps) {
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete these attendance settings? This action cannot be undone.')) {
      router.delete(route('attendance.settings.destroy', id));
    }
  };

  const getWeekdayName = (day: number): string => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[day];
  };

  // Function to format time in 12-hour format
  const formatTime = (timeString: string): string => {
    try {
      // Parse the time string properly
      const [hoursStr, minutesStr] = timeString.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = minutesStr ? minutesStr.substring(0, 2) : '00'; // Get only the first two digits for minutes

      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert to 12-hour format

      return `${hours12}:${minutes} ${period}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString;
    }
  };

  // Calculate work hours duration
  const calculateWorkHours = (startTime: string, endTime: string): string => {
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      let totalHours = endHours - startHours;
      let totalMinutes = endMinutes - startMinutes;

      if (totalMinutes < 0) {
        totalHours -= 1;
        totalMinutes += 60;
      }

      if (totalHours < 0) {
        totalHours += 24; // Assuming end time is next day if it's earlier than start time
      }

      return `${totalHours}h ${totalMinutes ? totalMinutes + 'm' : ''}`;
    } catch (error) {
      console.error("Error calculating work hours:", error);
      return "";
    }
  };

  return (
    <Layout>
      <Head title="Attendance Settings" />

      <PageSurface>
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Settings</h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure work hours, late thresholds, and weekend settings for each branch
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href={route('attendance.settings.employee-times')}>
                <Button variant="outline" size="sm" className="h-9 border-slate-200 text-slate-700 shadow-sm font-medium">
                  <User className="mr-1 h-4 w-4" />
                  Employee Times
                </Button>
              </Link>
              <Link href={route('attendance.settings.create')}>
                <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Settings Table */}
        {/* Settings Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-semibold text-slate-800">Branch Attendance Configurations</CardTitle>
            <CardDescription className="text-xs">
              Manage attendance parameters for each branch of your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Branch</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Work Hours</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Late Threshold</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Half Day Hours</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Weekend Days</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.length > 0 ? (
                    settings.map((setting) => (
                      <TableRow key={setting.id} className="hover:bg-slate-50 transition-colors group border-b border-slate-100">
                        <TableCell className="pl-6">
                          <div className="flex items-center">
                            <Building className="mr-2 h-4 w-4 text-emerald-500" />
                            <span className="font-semibold text-xs text-slate-800">{setting.branch.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-xs">
                              <AlarmClock className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                              <span className="font-medium text-green-700">
                                {formatTime(setting.work_start_time)}
                              </span>
                              <span className="mx-1.5 text-slate-400">to</span>
                              <span className="font-medium text-red-700">
                                {formatTime(setting.work_end_time)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center pl-5">
                              <Timer className="mr-1 h-3 w-3" />
                              <span>Duration: {calculateWorkHours(setting.work_start_time, setting.work_end_time)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center scale-90 origin-left">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {setting.late_threshold_minutes} min
                            </Badge>
                            <span className="ml-2 text-xs text-slate-500">
                              Grace period
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center scale-90 origin-left">
                            <BarChart2 className="mr-1.5 h-3.5 w-3.5 text-yellow-500" />
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              &lt; {setting.half_day_hours} hours
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-purple-500" />
                            <div className="flex flex-wrap gap-1 scale-90 origin-left">
                              {(() => {
                                let weekendDaysArray: number[] = [];
                                try {
                                  if (typeof setting.weekend_days === 'string') {
                                    let jsonString = setting.weekend_days;
                                    if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
                                      jsonString = jsonString.slice(1, -1);
                                    }
                                    jsonString = jsonString.replace(/\\"/g, '"');
                                    weekendDaysArray = JSON.parse(jsonString);
                                  } else {
                                    weekendDaysArray = setting.weekend_days as number[];
                                  }
                                } catch (error) {
                                  return (
                                    <div className="flex items-center text-red-500">
                                      <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                      <span>Error parsing data</span>
                                    </div>
                                  );
                                }

                                return weekendDaysArray.map((day: number) => (
                                  <Badge key={day} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {getWeekdayName(day)}
                                  </Badge>
                                ));
                              })()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => router.get(route('attendance.settings.edit', setting.id))}
                              className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                              title="Edit Settings"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(setting.id)}
                              className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                              title="Delete Settings"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <h3 className="font-medium">No attendance settings found</h3>
                        <p className="text-sm mt-1">
                          Click "Add Settings" to create new settings for a branch.
                        </p>
                        <Link href={route('attendance.settings.create')}>
                          <Button className="mt-4" variant="outline">
                            <Plus className="mr-1 h-4 w-4" />
                            Add Settings
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </PageSurface>
    </Layout>
  );
}
