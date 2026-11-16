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
  Clock,
  MapPin,
  User
} from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Employee extends EmployeeNameFields {
  id: number;
  employee_id: string;
}

interface Device {
  id: number;
  name: string;
}

interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_formatted: string | null;  // Added formatted values
  check_out_formatted: string | null; // Added formatted values
  auto_remarks: string | null;        // Added auto-generated remarks
  status: string;
  device_id: number | null;
  location_coordinates: string | null;
  remarks: string | null;
  employee: Employee;
}

interface AttendanceEditProps {
  attendance: Attendance;
  devices: Device[];
  statuses: string[];
}

export default function AttendanceEdit({ attendance, devices, statuses }: AttendanceEditProps) {
  // Parse location coordinates if exists
  let locationCoordinates = null;
  if (attendance.location_coordinates) {
    try {
      locationCoordinates = JSON.parse(attendance.location_coordinates);
    } catch (e) {
      console.error('Error parsing location coordinates:', e);
    }
  }

  // Convert the time format for the form inputs
  const convertTimeFormat = (timeString: string | null): string => {
    if (!timeString) return '';

    // If it's already in 24-hour format like "14:30:00", extract just "14:30"
    if (timeString.includes(':')) {
      const timeParts = timeString.split(':');
      return `${timeParts[0]}:${timeParts[1]}`;
    }

    // If it's in AM/PM format like "02:30 PM", convert to 24-hour
    try {
      const date = new Date(`2000-01-01 ${timeString}`);
      return date.getHours().toString().padStart(2, '0') + ':' +
             date.getMinutes().toString().padStart(2, '0');
    } catch (e) {
      console.error('Error converting time format:', e);
      return '';
    }
  };

  // Extract hours and minutes from formatted time for display in the input field
  const extractTimeFromFormatted = (formattedTime: string | null): string => {
    if (!formattedTime) return '';

    try {
      // Convert from "12:19 PM" format to "12:19" (for AM) or add 12 hours for PM except for 12 PM
      const [timePart, ampm] = formattedTime.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);

      let hour = hours;
      if (ampm === 'PM' && hours !== 12) {
        hour = hours + 12;
      } else if (ampm === 'AM' && hours === 12) {
        hour = 0;
      }

      return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error('Error extracting time from formatted time:', e);
      return '';
    }
  };

  const { data, setData, post, processing, errors } = useForm({
    _method: 'PUT',
    // Use formatted time if available, otherwise fall back to converting the original time
    check_in: attendance.check_in_formatted
      ? extractTimeFromFormatted(attendance.check_in_formatted)
      : convertTimeFormat(attendance.check_in),
    check_out: attendance.check_out_formatted
      ? extractTimeFromFormatted(attendance.check_out_formatted)
      : convertTimeFormat(attendance.check_out),
    status: attendance.status || '',
    device_id: attendance.device_id ? attendance.device_id.toString() : null,
    location_coordinates: locationCoordinates,
    remarks: attendance.remarks || '',
  });

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
    post(route('attendance.update', attendance.id));
  };

  return (
    <Layout>
      <Head title={`Edit Attendance - ${employeeDisplayName(attendance.employee)}`} />

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
          <h1 className="text-3xl font-bold text-gray-900">Edit Attendance Record</h1>
          <p className="mt-1 text-gray-500">
            Update attendance record for {employeeDisplayName(attendance.employee)} on {new Date(attendance.date).toLocaleDateString()}
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
                  <CardDescription>Update attendance information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">Employee:</span>
                  <span className="ml-2 text-gray-700">
                    {employeeDisplayName(attendance.employee)} ({attendance.employee.employee_id})
                  </span>
                </div>
                <div className="mt-2 flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">Date:</span>
                  <span className="ml-2 text-gray-700">
                    {new Date(attendance.date).toLocaleDateString()}
                  </span>
                </div>
                {attendance.auto_remarks && (
                  <div className="mt-2 flex items-center">
                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-medium">Auto Remarks:</span>
                    <span className="ml-2 text-gray-700">
                      {attendance.auto_remarks}
                    </span>
                  </div>
                )}
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
                    {attendance.check_in_formatted && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        {attendance.check_in_formatted}
                      </div>
                    )}
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
                    {getLocation ? 'Getting Location...' : 'Update Location'}
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
                  {processing ? 'Updating...' : 'Update Attendance'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
