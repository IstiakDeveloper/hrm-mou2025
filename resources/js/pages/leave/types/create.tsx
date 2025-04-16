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
  Switch
} from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';

export default function Create() {
  const [name, setName] = useState('');
  const [daysAllowed, setDaysAllowed] = useState('0');
  const [isPaid, setIsPaid] = useState(true);
  const [description, setDescription] = useState('');
  const [carryForward, setCarryForward] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Leave type name is required';
    if (!daysAllowed.trim()) newErrors.daysAllowed = 'Days allowed is required';
    else if (parseInt(daysAllowed) < 0) newErrors.daysAllowed = 'Days allowed must be a positive number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    router.post(route('leave.types.store'), {
      name,
      days_allowed: parseInt(daysAllowed),
      is_paid: isPaid,
      description: description || null,
      carry_forward: carryForward
    }, {
      onError: (errors) => {
        setErrors(errors);
        setSubmitting(false);
      },
      onFinish: () => setSubmitting(false)
    });
  };

  return (
    <Layout>
      <Head title="Create Leave Type" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('leave.types.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leave Types
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Leave Type</h1>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Leave Type Details</CardTitle>
            <CardDescription>Configure a new type of leave for employees</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Leave Type Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Annual Leave, Sick Leave, etc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && (
                  <p className="text-sm font-medium text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="daysAllowed">Days Allowed</Label>
                <Input
                  id="daysAllowed"
                  type="number"
                  min="0"
                  placeholder="Number of days allowed per year"
                  value={daysAllowed}
                  onChange={(e) => setDaysAllowed(e.target.value)}
                />
                {errors.daysAllowed && (
                  <p className="text-sm font-medium text-red-500">{errors.daysAllowed}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Maximum number of days an employee can take per year
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isPaid" className="cursor-pointer">Is This Paid Leave?</Label>
                <Switch
                  id="isPaid"
                  checked={isPaid}
                  onCheckedChange={setIsPaid}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="carryForward" className="cursor-pointer">Can Be Carried Forward to Next Year?</Label>
                <Switch
                  id="carryForward"
                  checked={carryForward}
                  onCheckedChange={setCarryForward}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description for this leave type"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Provide details about when and how this leave type should be used
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Link href={route('leave.types.index')}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Leave Type'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
