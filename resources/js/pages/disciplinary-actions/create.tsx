import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ComboSelect, ComboSelectItem } from '@/components/ComboSelect';
import {
    ShieldAlert, ArrowLeft, User, Calendar, FileText, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeOption {
    id: number;
    pin: string;
    name_en: string;
    name_bn?: string;
    designation_name: string;
    branch_name: string;
}

interface ActionTypeOption {
    value: string;
    label: string;
}

interface PageProps {
    employees: EmployeeOption[];
    preselectedEmployeeId: string;
    actionTypes: ActionTypeOption[];
}

export default function DisciplinaryActionCreate({
    employees = [],
    preselectedEmployeeId = '',
    actionTypes = [],
}: PageProps) {
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data, setData, post, processing, errors } = useForm({
        employee_id: preselectedEmployeeId || '',
        action_type: 'Warning',
        action_date: today,
        details: '',
        redirect_to: preselectedEmployeeId ? 'employee_show' : 'index',
    });

    const employeeComboItems = useMemo<ComboSelectItem<number>[]>(() => {
        return employees.map((emp) => ({
            value: emp.id,
            label: `[PIN: ${emp.pin}] ${emp.name_en} ${emp.name_bn ? `(${emp.name_bn})` : ''} - ${emp.designation_name || 'Staff'} (${emp.branch_name || 'Head Office'})`,
            keywords: `${emp.pin} ${emp.name_en} ${emp.name_bn || ''} ${emp.designation_name} ${emp.branch_name}`,
        }));
    }, [employees]);

    const selectedEmp = employees.find((e) => String(e.id) === String(data.employee_id));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('disciplinary-actions.store'));
    };

    return (
        <Layout>
            <Head title="Issue Disciplinary Action" />

            <div className="container mx-auto py-4 px-3 sm:px-4 max-w-3xl space-y-4">
                
                {/* Back button */}
                <div className="flex items-center justify-between">
                    <Link
                        href={preselectedEmployeeId ? route('employees.show', preselectedEmployeeId) : route('disciplinary-actions.index')}
                        className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-rose-700 transition-colors"
                    >
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to {preselectedEmployeeId ? 'Employee Profile' : 'Disciplinary Actions'}
                    </Link>
                </div>

                {/* Form Card */}
                <Card className="border border-slate-300 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-gradient-to-r from-rose-900 to-rose-800 text-white p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg shrink-0">
                                <ShieldAlert className="w-6 h-6 text-rose-100" />
                            </div>
                            <div>
                                <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                                    Issue Disciplinary Action <span className="text-xs font-semibold bg-rose-950/60 px-2 py-0.5 rounded text-rose-200 border border-rose-700">শৃঙ্খলা সংক্রান্ত পদক্ষেপ</span>
                                </CardTitle>
                                <p className="text-xs text-rose-100/90 font-medium mt-0.5">
                                    Select an employee and record official warning, show cause letter, fine, or suspension
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* 1. Employee Selection with ComboSelect */}
                            <div className="space-y-2">
                                <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-rose-700" /> Select Employee (ইমপ্লয়ী নির্বাচন করুন) <span className="text-rose-600">*</span>
                                </label>

                                <ComboSelect
                                    value={data.employee_id ? Number(data.employee_id) : null}
                                    onChange={(val) => setData('employee_id', val ? String(val) : '')}
                                    items={employeeComboItems}
                                    placeholder="Type PIN or Employee Name to search..."
                                    className="w-full"
                                />

                                {selectedEmp && (
                                    <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-2.5 flex items-center justify-between text-xs mt-2">
                                        <div>
                                            <span className="font-black text-slate-950 block">{selectedEmp.name_en}</span>
                                            <span className="text-[11px] font-semibold text-slate-700">
                                                PIN: <span className="font-mono text-slate-900">{selectedEmp.pin}</span> • {selectedEmp.designation_name} • {selectedEmp.branch_name}
                                            </span>
                                        </div>
                                        <Badge className="bg-rose-600 text-white font-bold text-[10px]">Selected</Badge>
                                    </div>
                                )}

                                {errors.employee_id && (
                                    <p className="text-xs text-rose-600 font-semibold">{errors.employee_id}</p>
                                )}
                            </div>

                            {/* 2. Action Type */}
                            <div className="space-y-2">
                                <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-700" /> Action Type (পদক্ষেপের ধরন) <span className="text-rose-600">*</span>
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {actionTypes.map((type) => {
                                        const isSelected = data.action_type === type.value;
                                        return (
                                            <div
                                                key={type.value}
                                                onClick={() => setData('action_type', type.value)}
                                                className={`cursor-pointer p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500 shadow-2xs'
                                                        : 'bg-white border-slate-300 hover:border-rose-300 text-slate-800'
                                                }`}
                                            >
                                                <span>{type.label}</span>
                                                {isSelected && <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>

                                {errors.action_type && (
                                    <p className="text-xs text-rose-600 font-semibold">{errors.action_type}</p>
                                )}
                            </div>

                            {/* 3. Action Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-rose-700" /> Action Date (তারিখ) <span className="text-rose-600">*</span>
                                </label>
                                <Input
                                    type="date"
                                    value={data.action_date}
                                    onChange={(e) => setData('action_date', e.target.value)}
                                    className="h-9 text-xs font-bold border-slate-300 focus:border-rose-500 max-w-xs"
                                />
                                {errors.action_date && (
                                    <p className="text-xs text-rose-600 font-semibold">{errors.action_date}</p>
                                )}
                            </div>

                            {/* 4. Details / Remarks */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-rose-700" /> Details & Remarks (বিস্তারিত কারণ ও বিবরণ)
                                </label>
                                <Textarea
                                    rows={4}
                                    placeholder="Enter details of the warning letter, cause of deduction, order memo reference no..."
                                    value={data.details}
                                    onChange={(e) => setData('details', e.target.value)}
                                    className="text-xs border-slate-300 focus:border-rose-500 font-medium"
                                />
                                {errors.details && (
                                    <p className="text-xs text-rose-600 font-semibold">{errors.details}</p>
                                )}
                            </div>

                            {/* Submit & Cancel Buttons */}
                            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                                <Link
                                    href={preselectedEmployeeId ? route('employees.show', preselectedEmployeeId) : route('disciplinary-actions.index')}
                                >
                                    <Button type="button" variant="outline" className="h-9 text-xs border-slate-300 font-bold text-slate-700">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    disabled={processing || !data.employee_id}
                                    className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 shadow-2xs"
                                >
                                    {processing ? 'Saving...' : 'Issue Disciplinary Action'}
                                </Button>
                            </div>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
