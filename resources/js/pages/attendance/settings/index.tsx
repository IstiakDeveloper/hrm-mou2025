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
  AlertCircle
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Settings</h1>
            <p className="mt-1 text-gray-500">
              Configure work hours, late thresholds, and weekend settings for each branch
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <Link href={route('attendance.settings.create')}>
              <Button className="flex items-center">
                <Plus className="mr-1 h-4 w-4" />
                Add Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Settings Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Branch Attendance Configurations</CardTitle>
            <CardDescription>
              Manage attendance parameters for each branch of your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Branch</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Late Threshold</TableHead>
                  <TableHead>Half Day Hours</TableHead>
                  <TableHead>Weekend Days</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.length > 0 ? (
                  settings.map((setting) => (
                    <TableRow key={setting.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4 text-blue-500" />
                          <span className="font-medium">{setting.branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <AlarmClock className="mr-2 h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-700">
                              {formatTime(setting.work_start_time)}
                            </span>
                            <span className="mx-1 text-gray-400">to</span>
                            <span className="font-medium text-red-700">
                              {formatTime(setting.work_end_time)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center pl-6">
                            <Timer className="mr-1 h-3 w-3" />
                            <span>Duration: {calculateWorkHours(setting.work_start_time, setting.work_end_time)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {setting.late_threshold_minutes} minutes
                          </Badge>
                          <span className="ml-2 text-xs text-gray-500">
                            Grace period
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <BarChart2 className="mr-2 h-4 w-4 text-yellow-500" />
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Less than {setting.half_day_hours} hours
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarDays className="mr-2 h-4 w-4 text-purple-500" />
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              let weekendDaysArray: number[] = [];
                              try {
                                if (typeof setting.weekend_days === 'string') {
                                  // Handle double or triple quoted JSON strings
                                  let jsonString = setting.weekend_days;

                                  // Remove extra quotes that might be in the string
                                  if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
                                    jsonString = jsonString.slice(1, -1);
                                  }

                                  // Replace escaped quotes
                                  jsonString = jsonString.replace(/\\"/g, '"');

                                  weekendDaysArray = JSON.parse(jsonString);
                                } else {
                                  weekendDaysArray = setting.weekend_days as number[];
                                }
                              } catch (error) {
                                console.error("Error parsing weekend days:", error, setting.weekend_days);
                                return (
                                  <div className="flex items-center text-red-500">
                                    <AlertCircle className="mr-1 h-4 w-4" />
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.get(route('attendance.settings.edit', setting.id))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(setting.id)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          </CardContent>
        </Card>
      </PageSurface>
    </Layout>
  );
}
