import React, { useState, ChangeEvent } from 'react';
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
  Upload,
  FileText,
  Calendar
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

interface EmployeeDocumentCreateProps {
  employee: Employee;
  documentTypes: string[];
}

export default function EmployeeDocumentCreate({ employee, documentTypes }: EmployeeDocumentCreateProps) {
  const { data, setData, post, processing, progress, errors } = useForm({
    document_type: '',
    title: '',
    file: null as File | null,
    description: '',
    expiry_date: '',
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setData('file', file);
      setSelectedFileName(file.name);
    }
  };

  const formatDocumentType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('employees.documents.store', employee.id));
  };

  return (
    <Layout>
      <Head title={`Upload Document - ${employee.first_name} ${employee.last_name}`} />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('employees.documents.index', employee.id)}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Documents</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
          <p className="mt-1 text-gray-500">
            Add a new document for {employee.first_name} {employee.last_name} ({employee.employee_id})
          </p>
        </div>

        <form onSubmit={submit}>
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-blue-100 p-1.5">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Document Information</CardTitle>
                  <CardDescription>Upload and provide details about the document</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="document_type">
                  Document Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={data.document_type}
                  onValueChange={(value) => setData('document_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatDocumentType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.document_type && <p className="mt-1 text-sm text-red-500">{errors.document_type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Document Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={e => setData('title', e.target.value)}
                  placeholder="Enter document title"
                  required
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={e => setData('description', e.target.value)}
                  placeholder="Enter description or notes about this document"
                  rows={3}
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date">
                  Expiry Date <span className="text-gray-500 text-sm">(if applicable)</span>
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !data.expiry_date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {data.expiry_date ? format(new Date(data.expiry_date), "PPP") : "Select expiry date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={data.expiry_date ? new Date(data.expiry_date) : undefined}
                      onSelect={(date) => {
                        date && setData('expiry_date', format(date, 'yyyy-MM-dd'));
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.expiry_date && <p className="mt-1 text-sm text-red-500">{errors.expiry_date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">
                  Document File <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="file-upload"
                    className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Select File</span>
                  </label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <span className="text-sm text-gray-500 truncate max-w-xs">
                    {selectedFileName || "No file selected"}
                  </span>
                </div>
                {errors.file && <p className="mt-1 text-sm text-red-500">{errors.file}</p>}
                <p className="text-xs text-gray-500">
                  Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG. Maximum size: 5MB.
                </p>
              </div>

              {progress && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                  <p className="text-xs text-gray-500 mt-1">Uploading: {progress.percentage}%</p>
                </div>
              )}
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
                  {processing ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
