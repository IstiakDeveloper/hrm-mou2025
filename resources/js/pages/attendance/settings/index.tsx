import React, { useState } from 'react';
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
  Building
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/utils';

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

  return (
    <Layout>
      <Head title="Attendance Settings" />

      <div className="container mx-auto py-8">
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
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableRow key={setting.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4 text-gray-400" />
                          <span className="font-medium">{setting.branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4 text-gray-400" />
                          <span>
                            {setting.work_start_time} - {setting.work_end_time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {setting.late_threshold_minutes} minutes
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          {setting.half_day_hours} hours
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            let weekendDaysArray: number[] = [];
                            try {
                              if (typeof setting.weekend_days === 'string') {
                                // First, remove extra backslashes and quotes
                                const cleanStr = setting.weekend_days.replace(/\\/g, '').replace(/"/g, '');
                                weekendDaysArray = JSON.parse(cleanStr);
                              } else {
                                weekendDaysArray = setting.weekend_days;
                              }
                            } catch (error) {
                              console.error("Error parsing weekend days:", error);
                              return <span>Error parsing weekend days</span>;
                            }

                            return weekendDaysArray.map((day: number) => (
                              <Badge key={day} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {getWeekdayName(day)}
                              </Badge>
                            ));
                          })()}
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
                      No attendance settings found. Click "Add Settings" to create new settings for a branch.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
