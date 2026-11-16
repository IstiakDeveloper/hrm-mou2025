import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { DISPLAY_DATE_FMT, displayDateToServer, parseFormDateValue } from '@/lib/display-date';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

type PayscaleOption = { id: number; name: string };
type GradeOption = { id: number; payscale_id: number; name: string | null };
type HeadOption = { id: number; name: string; type: string };
type CalcType = { value: string; label: string };

type LineForm = {
    salary_head_id: string;
    calculation_type: string;
    value: string;
    sort_order: string;
};

const emptyLine = (): LineForm => ({
    salary_head_id: '',
    calculation_type: 'fixed',
    value: '',
    sort_order: '0',
});

export default function SalaryStructureCreate({
    payscales,
    grades,
    heads,
    calculationTypes,
}: {
    payscales: PayscaleOption[];
    grades: GradeOption[];
    heads: HeadOption[];
    calculationTypes: CalcType[];
}) {
    const { data, setData, post, processing, errors, transform } = useForm({
        payscale_id: '',
        salary_grade_id: '',
        name: '',
        description: '',
        effective_from: '',
        is_active: true,
        lines: [emptyLine()],
    });

    const filteredGrades = useMemo(() => {
        if (!data.payscale_id) return grades;
        return grades.filter((g) => g.payscale_id === Number(data.payscale_id));
    }, [grades, data.payscale_id]);

    const updateLine = (index: number, patch: Partial<LineForm>) => {
        setData(
            'lines',
            data.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
        );
    };

    const addLine = () => setData('lines', [...data.lines, emptyLine()]);
    const removeLine = (index: number) => {
        if (data.lines.length <= 1) return;
        setData(
            'lines',
            data.lines.filter((_, i) => i !== index),
        );
    };

    return (
        <Layout>
            <Head title="Create Salary Structure" />
            <div className="container mx-auto max-w-4xl py-8">
                <Link href={route('salary-structures.index')} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        transform((payload) => ({
                            ...payload,
                            effective_from: displayDateToServer(payload.effective_from),
                        }));
                        post(route('salary-structures.store'));
                    }}
                >
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>New salary structure</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Payscale *</Label>
                                <Select
                                    value={data.payscale_id}
                                    onValueChange={(v) => {
                                        setData('payscale_id', v);
                                        setData('salary_grade_id', '');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select payscale" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {payscales.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.payscale_id && <p className="text-sm text-red-500">{errors.payscale_id}</p>}
                            </div>
                            <div>
                                <Label>Salary grade (optional)</Label>
                                <Select
                                    value={data.salary_grade_id || 'none'}
                                    onValueChange={(v) => setData('salary_grade_id', v === 'none' ? '' : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All grades" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">— None —</SelectItem>
                                        {filteredGrades.map((g) => (
                                            <SelectItem key={g.id} value={String(g.id)}>{g.name || '—'}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.salary_grade_id && <p className="text-sm text-red-500">{errors.salary_grade_id}</p>}
                            </div>
                            <div>
                                <Label>Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div>
                                <Label>Effective from</Label>
                                <DatePicker
                                    selected={parseFormDateValue(data.effective_from)}
                                    onSelect={(d) => setData('effective_from', d ? format(d, DISPLAY_DATE_FMT) : '')}
                                />
                                {errors.effective_from && <p className="text-sm text-red-500">{errors.effective_from}</p>}
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Structure lines</CardTitle>
                            <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                <Plus className="mr-1 h-4 w-4" />
                                Add line
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {typeof errors.lines === 'string' && <p className="text-sm text-red-500">{errors.lines}</p>}
                            {data.lines.map((line, index) => (
                                <div key={index} className="rounded-lg border border-slate-200 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-600">Line {index + 1}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={data.lines.length <= 1}
                                            onClick={() => removeLine(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <Label>Salary head *</Label>
                                            <Select
                                                value={line.salary_head_id}
                                                onValueChange={(v) => updateLine(index, { salary_head_id: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select head" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {heads.map((h) => (
                                                        <SelectItem key={h.id} value={String(h.id)}>
                                                            {h.name} — {h.type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors[`lines.${index}.salary_head_id` as keyof typeof errors] && (
                                                <p className="text-sm text-red-500">
                                                    {errors[`lines.${index}.salary_head_id` as keyof typeof errors]}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Calculation *</Label>
                                            <Select
                                                value={line.calculation_type}
                                                onValueChange={(v) => updateLine(index, { calculation_type: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {calculationTypes.map((t) => (
                                                        <SelectItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Value *</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={line.value}
                                                onChange={(e) => updateLine(index, { value: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Sort order</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={line.sort_order}
                                                onChange={(e) => updateLine(index, { sort_order: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('salary-structures.index')}>Cancel</Link>
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
