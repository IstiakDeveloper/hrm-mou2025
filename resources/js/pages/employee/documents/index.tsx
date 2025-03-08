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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Download,
  Edit,
  File,
  FileText,
  MoreHorizontal,
  Plus,
  Trash2,
  User,
  CalendarClock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_type: string;
  title: string;
  file_path: string;
  description: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeDocumentsIndexProps {
  employee: Employee;
  documents: EmployeeDocument[];
}

export default function EmployeeDocumentsIndex({ employee, documents }: EmployeeDocumentsIndexProps) {

  const handleDelete = (documentId: number) => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      router.delete(route('employees.documents.destroy', [employee.id, documentId]));
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, { label: string, color: string }> = {
      national_id: { label: 'National ID', color: 'bg-blue-100 text-blue-800' },
      passport: { label: 'Passport', color: 'bg-purple-100 text-purple-800' },
      driving_license: { label: 'Driving License', color: 'bg-green-100 text-green-800' },
      education: { label: 'Education', color: 'bg-yellow-100 text-yellow-800' },
      certificate: { label: 'Certificate', color: 'bg-indigo-100 text-indigo-800' },
      contract: { label: 'Contract', color: 'bg-pink-100 text-pink-800' },
      other: { label: 'Other', color: 'bg-gray-100 text-gray-800' }
    };

    return types[type] || { label: type.replace('_', ' '), color: 'bg-gray-100 text-gray-800' };
  };

  const getFileIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension as string)) {
      return <File className="h-4 w-4 text-purple-500" />;
    } else if (['pdf'].includes(extension as string)) {
      return <File className="h-4 w-4 text-red-500" />;
    } else if (['doc', 'docx'].includes(extension as string)) {
      return <File className="h-4 w-4 text-blue-500" />;
    } else {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Layout>
      <Head title={`${employee.first_name} ${employee.last_name} - Documents`} />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('employees.show', employee.id)}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Employee Profile</span>
          </Link>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Documents</h1>
            <p className="mt-1 text-gray-500">
              Manage documents for {employee.first_name} {employee.last_name} ({employee.employee_id})
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <Link href={route('employees.documents.create', employee.id)}>
              <Button className="flex items-center">
                <Plus className="mr-1 h-4 w-4" />
                Upload Document
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length > 0 ? (
                  documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {getFileIcon(document.file_path)}
                          <span className="ml-2">{document.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDocumentTypeLabel(document.document_type).color}>
                          {getDocumentTypeLabel(document.document_type).label}
                        </Badge>
                      </TableCell>
                      <TableCell>{document.description || '-'}</TableCell>
                      <TableCell>
                        {document.expiry_date ? (
                          <div className="flex items-center">
                            <CalendarClock className="mr-1 h-4 w-4 text-gray-400" />
                            {format(new Date(document.expiry_date), 'MMM dd, yyyy')}
                          </div>
                        ) : (
                          <span className="text-gray-500">No expiry date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(document.created_at), 'MMM dd, yyyy')}
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
                              onClick={() => window.location.href = route('employees.documents.download', [employee.id, document.id])}
                              className="cursor-pointer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.get(route('employees.documents.edit', [employee.id, document.id]))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(document.id)}
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
                      No documents found for this employee.
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
