import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Briefcase } from 'lucide-react';

interface Department {
  id: number;
  name: string;
}

interface DesignationCreateProps {
  departments: Department[];
}

export default function DesignationCreate({ departments }: DesignationCreateProps) {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    description: '',
    department_id: '',
    rank: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('designations.store'));
  };

  return (
    <Layout>
      <Head title="Create Designation" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('designations.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Designations</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Designation</h1>
          <p className="mt-1 text-gray-500">
            Add a new job position or title
          </p>
        </div>

        <form onSubmit={submit}>
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-purple-100 p-1.5">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Designation Information</CardTitle>
                  <CardDescription>Details about the job position</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Designation Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={e => setData('name', e.target.value)}
                  placeholder="Enter designation name"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={e => setData('description', e.target.value)}
                  placeholder="Enter designation description"
                  rows={3}
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_id">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={data.department_id}
                  onValueChange={(value) => setData('department_id', value)}
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
                <Label htmlFor="rank">
                  Rank <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rank"
                  type="number"
                  min="1"
                  value={data.rank}
                  onChange={e => setData('rank', e.target.value)}
                  placeholder="Enter rank number (e.g., 1, 2, 3)"
                  required
                />
                {errors.rank && <p className="mt-1 text-sm text-red-500">{errors.rank}</p>}
                <p className="text-xs text-gray-500">
                  Numerical value to indicate the position's hierarchy level (lower number = higher rank)
                </p>
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
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {processing ? 'Creating...' : 'Create Designation'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
