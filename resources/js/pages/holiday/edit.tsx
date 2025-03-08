import React, { useState, FormEvent, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, ArrowLeft, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Branch {
    id: number;
    name: string;
}

interface Holiday {
    id: number;
    title: string;
    date: string;
    description: string | null;
    is_recurring: boolean;
    applicable_branches: number[] | null;
}

interface EditHolidayProps {
    holiday: Holiday;
    branches: Branch[];
}

export default function EditHoliday({ holiday, branches }: EditHolidayProps) {
    const [title, setTitle] = useState(holiday.title);
    const [date, setDate] = useState<Date>(parseISO(holiday.date));
    const [description, setDescription] = useState(holiday.description || '');
    const [isRecurring, setIsRecurring] = useState(holiday.is_recurring);
    const [applicableBranches, setApplicableBranches] = useState<number[]>(holiday.applicable_branches || []);
    const [allBranches, setAllBranches] = useState(holiday.applicable_branches === null || holiday.applicable_branches.length === 0);
    const [openCalendar, setOpenCalendar] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const handleAllBranchesChange = (checked: boolean) => {
        setAllBranches(checked);
        if (checked) {
            setApplicableBranches([]);
        }
    };

    const handleBranchSelect = (branchId: number) => {
        setApplicableBranches(prev => {
            if (prev.includes(branchId)) {
                return prev.filter(id => id !== branchId);
            } else {
                return [...prev, branchId];
            }
        });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        router.put(route('holidays.update', holiday.id), {
            title,
            date: format(date, 'yyyy-MM-dd'),
            description,
            is_recurring: isRecurring,
            applicable_branches: allBranches ? [] : applicableBranches,
        }, {
            onError: (errors) => {
                setErrors(errors);
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false)
        });
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) newErrors.title = 'Title is required';
        if (!date) newErrors.date = 'Date is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    return (
        <Layout>
            <Head title="Edit Holiday" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('holidays.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Holidays
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Holiday</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Holiday Details</CardTitle>
                                <CardDescription>Update holiday information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Holiday Title</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Enter holiday title"
                                        />
                                        {errors.title && (
                                            <p className="text-sm font-medium text-red-500">{errors.title}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date ? format(date, 'MMMM d, yyyy') : <span>Select date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={date}
                                                    onSelect={(newDate) => {
                                                        if (newDate) {
                                                            setDate(newDate);
                                                        }
                                                        setOpenCalendar(false);
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.date && (
                                            <p className="text-sm font-medium text-red-500">{errors.date}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description (Optional)</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Enter holiday description"
                                            rows={4}
                                        />
                                        {errors.description && (
                                            <p className="text-sm font-medium text-red-500">{errors.description}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="is_recurring"
                                            checked={isRecurring}
                                            onCheckedChange={setIsRecurring}
                                        />
                                        <Label htmlFor="is_recurring">Recurring Holiday</Label>
                                    </div>

                                    {isRecurring && (
                                        <Alert className="bg-amber-50 border-amber-200">
                                            <Info className="h-4 w-4 text-amber-700" />
                                            <AlertDescription className="text-amber-700">
                                                Recurring holidays repeat every year on the same date.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-4">
                                        <Label>Applicable Branches</Label>

                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="all_branches"
                                                checked={allBranches}
                                                onCheckedChange={handleAllBranchesChange}
                                            />
                                            <Label htmlFor="all_branches" className="font-medium">
                                                Apply to all branches
                                            </Label>
                                        </div>

                                        {!allBranches && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
                                                {branches.map((branch) => (
                                                    <div key={branch.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`branch-${branch.id}`}
                                                            checked={applicableBranches.includes(branch.id)}
                                                            onCheckedChange={() => handleBranchSelect(branch.id)}
                                                        />
                                                        <Label htmlFor={`branch-${branch.id}`}>
                                                            {branch.name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {errors.applicable_branches && (
                                            <p className="text-sm font-medium text-red-500">{errors.applicable_branches}</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        <Link href={route('holidays.index')}>
                                            <Button variant="outline" type="button">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={submitting}>
                                            {submitting ? 'Updating...' : 'Update Holiday'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Holiday Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Holidays are dates when employees are not expected to work. You can set up one-time holidays or recurring annual holidays.
                                    </p>

                                    <div className="space-y-2">
                                        <h3 className="font-medium">Types of Holidays:</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                            <li><span className="font-medium">One-time:</span> Occurs only once on the specified date</li>
                                            <li><span className="font-medium">Recurring:</span> Repeats every year on the same calendar date</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="font-medium">Branch-specific Holidays:</h3>
                                        <p className="text-sm text-gray-600">
                                            You can specify if a holiday applies to all branches or only select branches. This is useful for regional or local holidays.
                                        </p>
                                    </div>

                                    <Alert className="bg-blue-50 border-blue-200">
                                        <Info className="h-4 w-4 text-blue-700" />
                                        <AlertDescription className="text-blue-700">
                                            Holidays will be visible in the calendar view and can be used for attendance and leave tracking.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
