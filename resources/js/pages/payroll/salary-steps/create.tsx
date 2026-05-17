import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

type PayscaleOption = { id: number; name: string; code: string | null };
type GradeOption = { id: number; payscale_id: number; code: string; name: string | null };

export default function SalaryStepCreate({
    payscales,
    grades,
    preselectedGradeId,
}: {
    payscales: PayscaleOption[];
    grades: GradeOption[];
    preselectedGradeId: number | null;
}) {
    const preselected = grades.find((g) => g.id === preselectedGradeId);
    const { data, setData, post, processing, errors } = useForm({
        payscale_id: preselected ? String(preselected.payscale_id) : '',
        salary_grade_id: preselectedGradeId ? String(preselectedGradeId) : '',
        step_number: '',
        basic_salary: '',
        is_active: true,
    });

    const filteredGrades = useMemo(() => {
        if (!data.payscale_id) return grades;
        return grades.filter((g) => g.payscale_id === Number(data.payscale_id));
    }, [grades, data.payscale_id]);

    return (
        <Layout>
            <Head title="Create Salary Step" />
            <div className="container mx-auto max-w-2xl py-8">
                <Link href={route('salary-steps.index')} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post(route('salary-steps.store'));
                    }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>New salary step</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Payscale</Label>
                                <Select
                                    value={data.payscale_id}
                                    onValueChange={(v) => {
                                        setData('payscale_id', v);
                                        setData('salary_grade_id', '');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter grades by payscale" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {payscales.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Salary grade *</Label>
                                <Select value={data.salary_grade_id} onValueChange={(v) => setData('salary_grade_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredGrades.map((g) => (
                                            <SelectItem key={g.id} value={String(g.id)}>
                                                {g.name || '—'}
                                                {g.name ? ` — ${g.name}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.salary_grade_id && <p className="text-sm text-red-500">{errors.salary_grade_id}</p>}
                            </div>
                            <div>
                                <Label>Step number *</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={data.step_number}
                                    onChange={(e) => setData('step_number', e.target.value)}
                                    required
                                />
                                {errors.step_number && <p className="text-sm text-red-500">{errors.step_number}</p>}
                            </div>
                            <div>
                                <Label>Basic salary *</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={data.basic_salary}
                                    onChange={(e) => setData('basic_salary', e.target.value)}
                                    required
                                />
                                {errors.basic_salary && <p className="text-sm text-red-500">{errors.basic_salary}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('salary-steps.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Save
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
