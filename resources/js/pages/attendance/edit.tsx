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

interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
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

  const { data, setData, post, processing, errors } = useForm({
    _method: 'PUT',
    check_in: attendance.check_in || '',
    check_out: attendance.check_out || '',
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
      <Head title={`Edit Attendance - ${attendance.employee.first_name} ${attendance.employee.last_name}`} />

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
            Update attendance record for {attendance.employee.first_name} {attendance.employee.last_name} on {new Date(attendance.date).toLocaleDateString()}
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
                    {attendance.employee.first_name} {attendance.employee.last_name} ({attendance.employee.employee_id})
                  </span>
                </div>
                <div className="mt-2 flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">Date:</span>
                  <span className="ml-2 text-gray-700">
                    {new Date(attendance.date).toLocaleDateString()}
                  </span>
                </div>
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
