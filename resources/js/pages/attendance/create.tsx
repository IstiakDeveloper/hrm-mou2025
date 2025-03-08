import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface Device {
  id: number;
  name: string;
}

interface AttendanceCreateProps {
  employees: Employee[];
  devices: Device[];
  date: string;
  statuses: string[];
}

export default function AttendanceCreate({ employees, devices, date, statuses }: AttendanceCreateProps) {
  const { data, setData, post, processing, errors } = useForm({
    employee_id: '',
    date: date,
    check_in: '',
    check_out: '',
    status: '',
    device_id: null as string | null,
    location_coordinates: null as { lat: string; lng: string } | null,
    remarks: '',
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [getLocation, setGetLocation] = useState(false);

  const handleGetLocation = () => {
    setGetLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setData('location_coordinates', {
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString()
        });
        setGetLocation(false);
      }, (error) => {
        console.error("Error obtaining location", error);
        setGetLocation(false);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
      setGetLocation(false);
    }
  };

  const formatStatusLabel = (status: string): string => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('attendance.store'));
  };

  return (
    <Layout>
      <Head title="Create Attendance Record" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('attendance.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Attendance</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Attendance Record</h1>
          <p className="mt-1 text-gray-500">
            Add a new attendance record for an employee
          </p>
        </div>

        <form onSubmit={submit}>
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-blue-100 p-1.5">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Attendance Details</CardTitle>
                  <CardDescription>Enter attendance information for an employee</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="employee_id">
                  Employee <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={data.employee_id}
                  onValueChange={(value) => setData('employee_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.first_name} {employee.last_name} ({employee.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employee_id && <p className="mt-1 text-sm text-red-500">{errors.employee_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !data.date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {data.date ? format(new Date(data.date), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={data.date ? new Date(data.date) : undefined}
                      onSelect={(date) => {
                        date && setData('date', format(date, 'yyyy-MM-dd'));
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="check_in">
                    Check In Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="check_in"
                      type="time"
                      value={data.check_in}
                      onChange={e => setData('check_in', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.check_in && <p className="mt-1 text-sm text-red-500">{errors.check_in}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="check_out">
                    Check Out Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="check_out"
                      type="time"
                      value={data.check_out}
                      onChange={e => setData('check_out', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.check_out && <p className="mt-1 text-sm text-red-500">{errors.check_out}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={data.status}
                  onValueChange={(value) => setData('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select attendance status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_id">
                  Device
                </Label>
                <Select
                  value={data.device_id || undefined}
                  onValueChange={(value) => setData('device_id', value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.device_id && <p className="mt-1 text-sm text-red-500">{errors.device_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Location Coordinates
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={getLocation}
                  >
                    <MapPin className="mr-1 h-4 w-4" />
                    {getLocation ? 'Getting Location...' : 'Get Current Location'}
                  </Button>
                  {data.location_coordinates && (
                    <span className="text-sm text-gray-600">
                      Lat: {data.location_coordinates.lat}, Lng: {data.location_coordinates.lng}
                    </span>
                  )}
                </div>
                {errors.location_coordinates && <p className="mt-1 text-sm text-red-500">{errors.location_coordinates}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">
                  Remarks
                </Label>
                <Textarea
                  id="remarks"
                  value={data.remarks}
                  onChange={e => setData('remarks', e.target.value)}
                  placeholder="Enter any additional notes or remarks"
                  rows={3}
                />
                {errors.remarks && <p className="mt-1 text-sm text-red-500">{errors.remarks}</p>}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-end">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? 'Creating...' : 'Create Attendance'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
