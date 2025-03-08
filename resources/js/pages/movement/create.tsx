import React, { useState, FormEvent, useEffect } from 'react';
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
import { format, addDays, isAfter, addHours, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar as CalendarIcon, CalendarClock, Clock, MapPin, CheckCircle, AlertCircle, Building2, User, BriefcaseBusiness } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from '@/components/ui/calendar';

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

interface CreateMovementProps {
  employees: Employee[];
  currentEmployee: Employee | null;
  isAdmin: boolean;
  movementTypes: string[];
}

// Custom Calendar wrapper to avoid passing disabled prop to SVG elements
const SafeCalendar = ({ disabledDates, ...props }: any) => {
  // We rename the disabled prop to disabledDates to avoid passing it down to DOM elements
  return (
    <Calendar
      {...props}
      // Handle the date disabling in the component implementation
      // but don't pass a prop named 'disabled' that would go to DOM elements
      modifiers={{
        disabled: disabledDates ? (date: Date) => disabledDates(date) : undefined,
      }}
    />
  );
};

export default function CreateMovement({ employees, currentEmployee, isAdmin, movementTypes }: CreateMovementProps) {
  const [employeeId, setEmployeeId] = useState(currentEmployee ? currentEmployee.id.toString() : '');
  const [movementType, setMovementType] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [fromTime, setFromTime] = useState<string>('09:00');
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [toTime, setToTime] = useState<string>('17:00');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Quick templates for movement types
  const officialTemplates = [
    { title: 'Client Meeting', purpose: 'Meeting with client to discuss project requirements and timeline', hours: 3 },
    { title: 'Site Visit', purpose: 'Visiting site for inspection and assessment', hours: 5 },
    { title: 'Training', purpose: 'Attending professional development training on company technologies', hours: 6 }
  ];

  const personalTemplates = [
    { title: 'Doctor Appointment', purpose: 'Medical checkup at hospital', hours: 2 },
    { title: 'Bank Errand', purpose: 'Visit to bank for personal financial matters', hours: 1 },
    { title: 'Family Emergency', purpose: 'Attending to urgent family matter', hours: 4 }
  ];

  // Set default times on component mount
  useEffect(() => {
    if (!fromDate) {
      setFromDate(new Date());
    }
    if (!toDate) {
      setToDate(new Date());
    }
  }, []);

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

    router.post(route('movements.store'), {
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

  // Apply a template
  const applyTemplate = (template: { title: string, purpose: string, hours: number }) => {
    setPurpose(template.purpose);
    setDestination(template.title);

    const fromDateTime = getFromDateTime() || new Date();
    const newToDateTime = addHours(fromDateTime, template.hours);

    setToDate(newToDateTime);
    setToTime(format(newToDateTime, 'HH:mm'));
  };

  // Selected employee
  const selectedEmployee = isAdmin
    ? employees.find(emp => emp.id.toString() === employeeId)
    : currentEmployee;

  // Calculate hours difference (if both datetimes are valid)
  const fromDateTime = getFromDateTime();
  const toDateTime = getToDateTime();
  let hoursDiff = 0;

  if (fromDateTime && toDateTime && isAfter(toDateTime, fromDateTime)) {
    hoursDiff = Math.ceil((toDateTime.getTime() - fromDateTime.getTime()) / (1000 * 60 * 60));
  }

  return (
    <Layout>
      <Head title="Create Movement Request" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('movements.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Movement Requests
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Movement Request</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Movement Request Form</CardTitle>
                <CardDescription>Fill out the details for your movement request</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="templates">Quick Templates</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details">
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
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fromDate ? format(fromDate, 'PPP') : <span>Select date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <SafeCalendar
                                mode="single"
                                selected={fromDate}
                                onSelect={(date: Date | undefined) => {
                                  setFromDate(date);
                                  if (date && (!toDate || isAfter(date, toDate))) {
                                    setToDate(date);
                                  }
                                  setFromDateOpen(false);
                                }}
                                disabledDates={(date: Date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return date < subDays(today, 1);
                                }}
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
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {toDate ? format(toDate, 'PPP') : <span>Select date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <SafeCalendar
                                mode="single"
                                selected={toDate}
                                onSelect={(date: Date | undefined) => {
                                  setToDate(date);
                                  setToDateOpen(false);
                                }}
                                disabledDates={(date: Date) => fromDate ? date < fromDate : date < new Date()}
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
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {errors.to_datetime}
                          </AlertDescription>
                        </Alert>
                      )}

                      {fromDate && toDate && fromTime && toTime && hoursDiff > 0 && (
                        <Alert variant="default" className="bg-blue-50 text-blue-800 border border-blue-200">
                          <Clock className="h-4 w-4" />
                          <AlertDescription>
                            Duration: <strong>{hoursDiff} {hoursDiff === 1 ? 'hour' : 'hours'}</strong>
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
                        <Link href={route('movements.index')}>
                          <Button variant="outline" type="button">
                            Cancel
                          </Button>
                        </Link>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="templates">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-3 flex items-center">
                          <BriefcaseBusiness className="h-5 w-5 mr-2 text-indigo-600" />
                          Official Movement Templates
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {officialTemplates.map((template, index) => (
                            <Card key={`official-${index}`} className="cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => {
                              setMovementType('official');
                              applyTemplate(template);
                              setActiveTab('details');
                            }}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">{template.title}</h4>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.purpose}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                    {template.hours}h
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-3 flex items-center">
                          <User className="h-5 w-5 mr-2 text-purple-600" />
                          Personal Movement Templates
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {personalTemplates.map((template, index) => (
                            <Card key={`personal-${index}`} className="cursor-pointer hover:border-purple-300 transition-colors" onClick={() => {
                              setMovementType('personal');
                              applyTemplate(template);
                              setActiveTab('details');
                            }}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">{template.title}</h4>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.purpose}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {template.hours}h
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Click on any template to pre-fill the movement request form. You can still edit the details before submitting.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setActiveTab('details')}>
                          Back to Form
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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
                        <Building2 className="h-3.5 w-3.5 mr-1" />
                        {selectedEmployee.department?.name || 'No Department'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Designation</p>
                      <p>{selectedEmployee.designation?.name || 'No Designation'}</p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="mt-4">
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

                        {hoursDiff > 0 && (
                          <div className="bg-blue-50 p-2 rounded mt-2 text-center">
                            <span className="text-blue-700 font-medium">
                              Duration: {hoursDiff} {hoursDiff === 1 ? 'hour' : 'hours'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Fill out the form to see your movement details here.
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <h3 className="font-medium mb-3">Request Guidelines</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p>Submit requests at least 24 hours in advance when possible</p>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p>Include accurate destination and purpose details</p>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p>For official movements, approval must be obtained before departure</p>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p>Mark the movement as completed upon return</p>
                      </div>
                    </div>
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

            <TooltipProvider>
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Help</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-between items-center cursor-help p-2 rounded hover:bg-gray-50">
                          <span className="font-medium">Official vs Personal</span>
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Official movements are work-related and may require approval. Personal movements are for non-work errands or appointments.
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-between items-center cursor-help p-2 rounded hover:bg-gray-50">
                          <span className="font-medium">Approval Process</span>
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Movements require approval from a manager or supervisor before they are considered authorized.
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-between items-center cursor-help p-2 rounded hover:bg-gray-50">
                          <span className="font-medium">Approval Process</span>
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Movements require approval from a manager or supervisor before they are considered authorized.
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-between items-center cursor-help p-2 rounded hover:bg-gray-50">
                          <span className="font-medium">Use Templates</span>
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Use the Templates tab for quick pre-filled movement requests for common situations.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </Layout>
  );
}
