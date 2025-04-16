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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, addHours, addDays, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, CalendarClock, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department?: {
    id: number;
    name: string;
  };
  designation?: {
    id: number;
    name: string;
  };
}

interface Movement {
  id: number;
  employee_id: number;
  movement_type: 'official' | 'personal';
  from_datetime: string;
  to_datetime: string;
  purpose: string;
  destination: string;
  remarks: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
}

interface EditMovementProps {
  movement: Movement;
  employees: Employee[];
  isAdmin: boolean;
  movementTypes: string[];
}

export default function EditMovement({ movement, employees, isAdmin, movementTypes }: EditMovementProps) {
  const fromDateTime = new Date(movement.from_datetime);
  const toDateTime = new Date(movement.to_datetime);

  const formatTimeString = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const [employeeId, setEmployeeId] = useState(movement.employee_id.toString());
  const [movementType, setMovementType] = useState(movement.movement_type);
  const [fromDate, setFromDate] = useState<Date>(fromDateTime);
  const [fromTime, setFromTime] = useState<string>(formatTimeString(fromDateTime));
  const [toDate, setToDate] = useState<Date>(toDateTime);
  const [toTime, setToTime] = useState<string>(formatTimeString(toDateTime));
  const [purpose, setPurpose] = useState(movement.purpose);
  const [destination, setDestination] = useState(movement.destination);
  const [remarks, setRemarks] = useState(movement.remarks || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  // Get combined datetime objects
  const getFromDateTime = () => {
    if (!fromDate || !fromTime) return null;
    const [hours, minutes] = fromTime.split(':').map(Number);
    const dateTime = new Date(fromDate);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  };

  const getToDateTime = () => {
    if (!toDate || !toTime) return null;
    const [hours, minutes] = toTime.split(':').map(Number);
    const dateTime = new Date(toDate);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  };

  // Default time options
  const times = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (isAdmin && !employeeId) newErrors.employee_id = 'Employee is required';
    if (!movementType) newErrors.movement_type = 'Movement type is required';
    if (!fromDate) newErrors.from_date = 'From date is required';
    if (!fromTime) newErrors.from_time = 'From time is required';
    if (!toDate) newErrors.to_date = 'To date is required';
    if (!toTime) newErrors.to_time = 'To time is required';
    if (!purpose.trim()) newErrors.purpose = 'Purpose is required';
    if (!destination.trim()) newErrors.destination = 'Destination is required';

    // Check if to datetime is after from datetime
    const fromDateTime = getFromDateTime();
    const toDateTime = getToDateTime();

    if (fromDateTime && toDateTime && !isAfter(toDateTime, fromDateTime)) {
      newErrors.to_datetime = 'To datetime must be after From datetime';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    const fromDateTime = getFromDateTime();
    const toDateTime = getToDateTime();

    router.put(route('movements.update', movement.id), {
      employee_id: isAdmin ? employeeId : undefined,
      movement_type: movementType,
      from_datetime: fromDateTime ? format(fromDateTime, 'yyyy-MM-dd HH:mm:ss') : '',
      to_datetime: toDateTime ? format(toDateTime, 'yyyy-MM-dd HH:mm:ss') : '',
      purpose,
      destination,
      remarks,
    }, {
      onError: (errors) => {
        setErrors(errors);
        setSubmitting(false);
      },
      onFinish: () => setSubmitting(false)
    });
  };

  // Selected employee
  const selectedEmployee = employees.find(emp => emp.id.toString() === employeeId);

  return (
    <Layout>
      <Head title="Edit Movement Request" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('movements.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Movement Requests
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Movement Request</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Movement Details</CardTitle>
                <CardDescription>Edit your movement request</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="employee">Employee</Label>
                      <Select
                        value={employeeId}
                        onValueChange={setEmployeeId}
                      >
                        <SelectTrigger id="employee">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {employee.first_name} {employee.last_name} ({employee.employee_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.employee_id && (
                        <p className="text-sm font-medium text-red-500">{errors.employee_id}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="movementType">Movement Type</Label>
                    <Select
                      value={movementType}
                      onValueChange={setMovementType}
                    >
                      <SelectTrigger id="movementType">
                        <SelectValue placeholder="Select Movement Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {movementTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.movement_type && (
                      <p className="text-sm font-medium text-red-500">{errors.movement_type}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>From Date</Label>
                      <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !fromDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {fromDate ? format(fromDate, 'PPP') : <span>Select date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={fromDate}
                            onSelect={(date) => {
                              if (date) setFromDate(date);
                              if (date && (!toDate || isAfter(date, toDate))) {
                                setToDate(date);
                              }
                              setFromDateOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.from_date && (
                        <p className="text-sm font-medium text-red-500">{errors.from_date}</p>
                      )}

                      <div className="mt-2">
                        <Label>From Time</Label>
                        <Select
                          value={fromTime}
                          onValueChange={setFromTime}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {times.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.from_time && (
                          <p className="text-sm font-medium text-red-500">{errors.from_time}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>To Date</Label>
                      <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !toDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {toDate ? format(toDate, 'PPP') : <span>Select date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={toDate}
                            onSelect={(date) => {
                              if (date) setToDate(date);
                              setToDateOpen(false);
                            }}
                            initialFocus
                            disabled={(date) => fromDate ? isAfter(fromDate, date) : false}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.to_date && (
                        <p className="text-sm font-medium text-red-500">{errors.to_date}</p>
                      )}

                      <div className="mt-2">
                        <Label>To Time</Label>
                        <Select
                          value={toTime}
                          onValueChange={setToTime}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {times.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.to_time && (
                          <p className="text-sm font-medium text-red-500">{errors.to_time}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {errors.to_datetime && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {errors.to_datetime}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="destination"
                        placeholder="Where are you going?"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.destination && (
                      <p className="text-sm font-medium text-red-500">{errors.destination}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Textarea
                      id="purpose"
                      placeholder="What is the purpose of this movement?"
                      rows={3}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    />
                    {errors.purpose && (
                      <p className="text-sm font-medium text-red-500">{errors.purpose}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                    <Textarea
                      id="remarks"
                      placeholder="Any additional information?"
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                    {errors.remarks && (
                      <p className="text-sm font-medium text-red-500">{errors.remarks}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Link href={route('movements.show', movement.id)}>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Updating...' : 'Update Request'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            {selectedEmployee ? (
              <Card>
                <CardHeader>
                  <CardTitle>Employee Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="font-medium">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Employee ID</p>
                      <p>{selectedEmployee.employee_id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Department</p>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedEmployee.department?.name || 'No Department'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Designation</p>
                      <p>{selectedEmployee.designation?.name || 'No Designation'}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center mb-4">
                      <CalendarClock className="h-5 w-5 mr-2 text-blue-600" />
                      <h3 className="font-medium">Movement Summary</h3>
                    </div>

                    {fromDate && toDate && fromTime && toTime ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">From:</span>
                          <span className="font-medium">
                            {format(fromDate, 'MMM dd, yyyy')} at {fromTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">To:</span>
                          <span className="font-medium">
                            {format(toDate, 'MMM dd, yyyy')} at {toTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span className="font-medium capitalize">
                            {movementType || 'Not selected'}
                          </span>
                        </div>
                        {destination && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Destination:</span>
                            <span className="font-medium">{destination}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Fill out the form to see your movement details here.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Movement Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <div className="text-gray-400 mb-2">
                      <CalendarClock className="h-12 w-12 mx-auto mb-2" />
                      {isAdmin ?
                        <p>Select an employee to view their information</p> :
                        <p>No employee information found</p>
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
