import React, { useState, ChangeEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Briefcase,
  Building,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CreditCard,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Department {
  id: number;
  name: string;
}

interface Designation {
  id: number;
  name: string;
  department_id?: number;
}

interface Branch {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface EmployeeCreateProps {
  departments: Department[];
  designations: Designation[];
  branches: Branch[];
  managers: Employee[];
  statuses: string[];
  errors: {
    [key: string]: string;
  };
}

export default function EmployeeCreate({
  departments,
  designations,
  branches,
  managers,
  statuses,
  errors
}: EmployeeCreateProps) {

  const { data, setData, post, processing } = useForm({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    joining_date: format(new Date(), 'yyyy-MM-dd'),
    address: '',
    photo: null as File | null,
    nid: '',
    emergency_contact: '',
    department_id: '',
    designation_id: '',
    current_branch_id: '',
    reporting_to: '',
    status: 'active',
    basic_salary: '',
    bank_account_details: {
      account_name: '',
      account_number: '',
      bank_name: '',
      branch_name: '',
    },
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [joiningDateOpen, setJoiningDateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setData('photo', file);

      // Create a file reader and properly handle the load event
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setPhotoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBankDetailChange = (field: string, value: string) => {
    setData('bank_account_details', {
      ...data.bank_account_details,
      [field]: value,
    });
  };

  const filteredDesignations = designations.filter(
    designation => !data.department_id || designation.department_id === parseInt(data.department_id)
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('employees.store'));
  };

  return (
    <Layout>
      <Head title="Add New Employee" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('employees.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Employees</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
          <p className="mt-1 text-gray-500">
            Create a new employee record with personal and employment details
          </p>
        </div>

        <form onSubmit={submit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
              <TabsTrigger value="employment">Employment Details</TabsTrigger>
              <TabsTrigger value="contact">Contact Information</TabsTrigger>
              <TabsTrigger value="financial">Financial Details</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal">
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-blue-100 p-1.5">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Employee's basic personal details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Photo Upload */}
                  <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                    <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden">
                      {photoPreview ? (
                        <>
                          <img
                            src={photoPreview}
                            alt="Employee preview"
                            className="w-full h-full object-cover"
                          />
                        </>
                      ) : (
                        <>
                          <div className="text-center p-4 space-y-2">
                            <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <div className="text-xs text-gray-500">No photo uploaded</div>
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
                            <label htmlFor="photo-upload" className="cursor-pointer w-full h-full flex items-center justify-center">
                              <Upload className="h-6 w-6 text-gray-600 opacity-0 hover:opacity-100" />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <Label htmlFor="photo-upload">
                          Employee Photo <span className="text-gray-500 text-sm">(Optional)</span>
                        </Label>
                        <Input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="mt-1"
                        />
                        {errors.photo && <p className="mt-1 text-sm text-red-500">{errors.photo}</p>}
                        <p className="mt-1 text-xs text-gray-500">
                          Upload a professional photo. Max size 2MB. Formats: JPEG, PNG.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">
                            First Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="first_name"
                            value={data.first_name}
                            onChange={e => setData('first_name', e.target.value)}
                            placeholder="Enter first name"
                            required
                          />
                          {errors.first_name && <p className="mt-1 text-sm text-red-500">{errors.first_name}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">
                            Last Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="last_name"
                            value={data.last_name}
                            onChange={e => setData('last_name', e.target.value)}
                            placeholder="Enter last name"
                            required
                          />
                          {errors.last_name && <p className="mt-1 text-sm text-red-500">{errors.last_name}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="employee_id">
                        Employee ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="employee_id"
                        value={data.employee_id}
                        onChange={e => setData('employee_id', e.target.value)}
                        placeholder="e.g., EMP-0001"
                        required
                      />
                      {errors.employee_id && <p className="mt-1 text-sm text-red-500">{errors.employee_id}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nid">
                        National ID <span className="text-gray-500 text-sm">(Optional)</span>
                      </Label>
                      <Input
                        id="nid"
                        value={data.nid}
                        onChange={e => setData('nid', e.target.value)}
                        placeholder="Enter national ID number"
                      />
                      {errors.nid && <p className="mt-1 text-sm text-red-500">{errors.nid}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={data.gender}
                        onValueChange={(value) => setData('gender', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Popover open={dobOpen} onOpenChange={setDobOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !data.date_of_birth && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {data.date_of_birth ? format(new Date(data.date_of_birth), "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={data.date_of_birth ? new Date(data.date_of_birth) : undefined}
                            onSelect={(date) => {
                              date && setData('date_of_birth', format(date, 'yyyy-MM-dd'));
                              setDobOpen(false);
                            }}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.date_of_birth && <p className="mt-1 text-sm text-red-500">{errors.date_of_birth}</p>}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 px-6 py-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('employment')}
                    className="ml-auto"
                  >
                    Next: Employment Details
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Employment Details Tab */}
            <TabsContent value="employment">
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-purple-100 p-1.5">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>Employment Details</CardTitle>
                      <CardDescription>Job role and organizational information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="department_id">
                        Department <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={data.department_id}
                        onValueChange={(value) => {
                          setData('department_id', value);
                          setData('designation_id', ''); // Reset designation when department changes
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id.toString()}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.department_id && <p className="mt-1 text-sm text-red-500">{errors.department_id}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="designation_id">
                        Designation <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={data.designation_id}
                        onValueChange={(value) => setData('designation_id', value)}
                        disabled={!data.department_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={data.department_id ? "Select designation" : "Select department first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDesignations.map((designation) => (
                            <SelectItem key={designation.id} value={designation.id.toString()}>
                              {designation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.designation_id && <p className="mt-1 text-sm text-red-500">{errors.designation_id}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current_branch_id">
                        Branch <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={data.current_branch_id}
                        onValueChange={(value) => setData('current_branch_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.current_branch_id && <p className="mt-1 text-sm text-red-500">{errors.current_branch_id}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reporting_to">Reports To</Label>
                      <Select
                        value={data.reporting_to}
                        onValueChange={(value) => setData('reporting_to', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.first_name} {manager.last_name} ({manager.employee_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.reporting_to && <p className="mt-1 text-sm text-red-500">{errors.reporting_to}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="joining_date">
                        Joining Date <span className="text-red-500">*</span>
                      </Label>
                      <Popover open={joiningDateOpen} onOpenChange={setJoiningDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !data.joining_date && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {data.joining_date ? format(new Date(data.joining_date), "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={data.joining_date ? new Date(data.joining_date) : undefined}
                            onSelect={(date) => {
                              date && setData('joining_date', format(date, 'yyyy-MM-dd'));
                              setJoiningDateOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.joining_date && <p className="mt-1 text-sm text-red-500">{errors.joining_date}</p>}
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
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('personal')}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                  >
                    Next: Contact Information
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Contact Information Tab */}
            <TabsContent value="contact">
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-green-100 p-1.5">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Contact Information</CardTitle>
                      <CardDescription>Contact and emergency details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={e => setData('email', e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={data.phone}
                        onChange={e => setData('phone', e.target.value)}
                        placeholder="Enter phone number"
                      />
                      {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">
                        Address
                      </Label>
                      <Textarea
                        id="address"
                        value={data.address}
                        onChange={e => setData('address', e.target.value)}
                        placeholder="Enter residential address"
                        rows={3}
                      />
                      {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="emergency_contact">
                        Emergency Contact
                      </Label>
                      <Input
                        id="emergency_contact"
                        value={data.emergency_contact}
                        onChange={e => setData('emergency_contact', e.target.value)}
                        placeholder="Name and phone number of emergency contact"
                      />
                      {errors.emergency_contact && <p className="mt-1 text-sm text-red-500">{errors.emergency_contact}</p>}
                      <p className="mt-1 text-xs text-gray-500">
                        Provide the name and contact number of a person to contact in case of emergency
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('employment')}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('financial')}
                  >
                    Next: Financial Details
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Financial Details Tab */}
            <TabsContent value="financial">
              <Card className="shadow-sm mb-8">
                <CardHeader className="border-b bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-amber-100 p-1.5">
                      <CreditCard className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle>Financial Details</CardTitle>
                      <CardDescription>Salary and banking information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <div className="mb-4 space-y-2">
                      <Label htmlFor="basic_salary">
                        Basic Salary <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="basic_salary"
                        type="number"
                        step="0.01"
                        value={data.basic_salary}
                        onChange={e => setData('basic_salary', e.target.value)}
                        placeholder="Enter basic salary amount"
                        required
                      />
                      {errors.basic_salary && <p className="mt-1 text-sm text-red-500">{errors.basic_salary}</p>}
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Bank Account Details</h3>
                      <p className="text-sm text-gray-500">
                        Provide bank account information for salary transfers
                      </p>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="account_name">
                            Account Holder Name
                          </Label>
                          <Input
                            id="account_name"
                            value={data.bank_account_details.account_name}
                            onChange={e => handleBankDetailChange('account_name', e.target.value)}
                            placeholder="Enter account holder's name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="account_number">
                            Account Number
                          </Label>
                          <Input
                            id="account_number"
                            value={data.bank_account_details.account_number}
                            onChange={e => handleBankDetailChange('account_number', e.target.value)}
                            placeholder="Enter account number"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bank_name">
                            Bank Name
                          </Label>
                          <Input
                            id="bank_name"
                            value={data.bank_account_details.bank_name}
                            onChange={e => handleBankDetailChange('bank_name', e.target.value)}
                            placeholder="Enter bank name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="branch_name">
                            Branch Name
                          </Label>
                          <Input
                            id="branch_name"
                            value={data.bank_account_details.branch_name}
                            onChange={e => handleBankDetailChange('branch_name', e.target.value)}
                            placeholder="Enter branch name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('contact')}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? 'Creating...' : 'Create Employee'}
                  </Button>
                </CardFooter>
              </Card>

              <div className="flex justify-end mb-8">
                <Button
                  type="submit"
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? 'Creating...' : 'Create Employee'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </Layout>
  );
}
