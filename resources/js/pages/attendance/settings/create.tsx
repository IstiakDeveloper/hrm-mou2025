import React, { useState, FormEvent } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Clock, Building } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
}

interface CreateProps {
  branches: Branch[];
}

const weekdays = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' }
];

export default function Create({ branches }: CreateProps) {
  const [branchId, setBranchId] = useState('');
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState('15');
  const [halfDayHours, setHalfDayHours] = useState('4');
  const [weekendDays, setWeekendDays] = useState<number[]>([0, 6]); // Default to Saturday and Sunday
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!branchId) newErrors.branchId = 'Branch is required';
    if (!workStartTime) newErrors.workStartTime = 'Start time is required';
    if (!workEndTime) newErrors.workEndTime = 'End time is required';

    if (!lateThresholdMinutes) newErrors.lateThresholdMinutes = 'Late threshold is required';
    else if (parseInt(lateThresholdMinutes) < 0)
      newErrors.lateThresholdMinutes = 'Late threshold must be a positive number';

    if (!halfDayHours) newErrors.halfDayHours = 'Half day hours is required';
    else if (parseInt(halfDayHours) < 1)
      newErrors.halfDayHours = 'Half day hours must be at least 1';

    if (weekendDays.length === 0)
      newErrors.weekendDays = 'At least one weekend day is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    router.post(route('attendance.settings.store'), {
      branch_id: parseInt(branchId),
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      late_threshold_minutes: parseInt(lateThresholdMinutes),
      half_day_hours: parseInt(halfDayHours),
      weekend_days: weekendDays
    }, {
      onError: (errors) => {
        setErrors(errors);
        setSubmitting(false);
      },
      onFinish: () => setSubmitting(false)
    });
  };

  const handleWeekendDayChange = (id: number, checked: boolean) => {
    if (checked) {
      setWeekendDays([...weekendDays, id]);
    } else {
      setWeekendDays(weekendDays.filter(day => day !== id));
    }
  };

  return (
    <Layout>
      <Head title="Create Attendance Settings" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('attendance.settings.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Attendance Settings
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Attendance Settings</h1>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Branch Attendance Rules</CardTitle>
            <CardDescription>Configure working hours and attendance rules for a branch</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={branchId}
                  onValueChange={setBranchId}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branchId && (
                  <p className="text-sm font-medium text-red-500">{errors.branchId}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Select the branch for these attendance settings
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="workStartTime">Work Start Time</Label>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                    <Input
                      id="workStartTime"
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                    />
                  </div>
                  {errors.workStartTime && (
                    <p className="text-sm font-medium text-red-500">{errors.workStartTime}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workEndTime">Work End Time</Label>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                    <Input
                      id="workEndTime"
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                    />
                  </div>
                  {errors.workEndTime && (
                    <p className="text-sm font-medium text-red-500">{errors.workEndTime}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lateThresholdMinutes">Late Threshold (minutes)</Label>
                  <Input
                    id="lateThresholdMinutes"
                    type="number"
                    min="0"
                    value={lateThresholdMinutes}
                    onChange={(e) => setLateThresholdMinutes(e.target.value)}
                  />
                  {errors.lateThresholdMinutes && (
                    <p className="text-sm font-medium text-red-500">{errors.lateThresholdMinutes}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minutes after start time to mark as late
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="halfDayHours">Half Day Hours</Label>
                  <Input
                    id="halfDayHours"
                    type="number"
                    min="1"
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(e.target.value)}
                  />
                  {errors.halfDayHours && (
                    <p className="text-sm font-medium text-red-500">{errors.halfDayHours}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minimum hours for half day presence
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Weekend Days</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    Select days to mark as weekend (non-working days)
                  </p>
                  {errors.weekendDays && (
                    <p className="text-sm font-medium text-red-500">{errors.weekendDays}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {weekdays.map((day) => (
                    <div
                      key={day.id}
                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                    >
                      <Checkbox
                        id={`day-${day.id}`}
                        checked={weekendDays.includes(day.id)}
                        onCheckedChange={(checked) =>
                          handleWeekendDayChange(day.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`day-${day.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {day.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Link href={route('attendance.settings.index')}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
