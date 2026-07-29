import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartKm } from '@/lib/format-smart-number';
import { ArrowLeft, Save } from 'lucide-react';

interface Employee extends EmployeeNameFields {
    pin?: string | null;
    employee_id: string;
    branch?: { name: string } | null;
}

interface LogBook {
    id: number;
    start_place: string;
    destination: string | null;
    purpose: string;
    work_result: string | null;
    start_meter_reading: string | number;
    end_meter_reading: string | number;
    distance_km: string | number;
    personal_km: string | number | null;
    official_km: string | number;
    employee: Employee;
}

interface Props {
    logBook: LogBook;
    ratePerKm: number;
}

export default function MovementLogBookEdit({ logBook, ratePerKm }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        start_place: logBook.start_place || '',
        destination: logBook.destination || '',
        purpose: logBook.purpose || '',
        work_result: logBook.work_result || '',
        start_meter_reading: String(logBook.start_meter_reading ?? ''),
        end_meter_reading: String(logBook.end_meter_reading ?? ''),
        personal_km: logBook.personal_km != null ? String(logBook.personal_km) : '',
    });

    const computed = useMemo(() => {
        const start = Number(data.start_meter_reading);
        const end = Number(data.end_meter_reading);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
            return { totalKm: 0, personalKm: 0, officialKm: 0, payable: 0 };
        }
        const totalKm = Math.round((end - start) * 100) / 100;
        const personalKm = data.personal_km !== '' ? Math.max(0, Number(data.personal_km) || 0) : 0;
        const officialKm = Math.round((totalKm - personalKm) * 100) / 100;
        return {
            totalKm,
            personalKm,
            officialKm,
            payable: officialKm * ratePerKm,
        };
    }, [data.start_meter_reading, data.end_meter_reading, data.personal_km, ratePerKm]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('movement-log-books.update', logBook.id));
    };

    return (
        <Layout>
            <Head title={`Edit Log Book Register #${logBook.id}`} />
            <div className="container mx-auto max-w-3xl py-8 px-4">
                <div className="mb-6">
                    <Link href={route('movement-log-books.show', logBook.id)} className="flex items-center text-blue-600 hover:text-blue-800">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to entry
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Edit Log Book Register Entry #{logBook.id}</CardTitle>
                        <p className="text-sm text-slate-500">
                            {employeeDisplayName(logBook.employee)}
                            {logBook.employee.pin || logBook.employee.employee_id ? ` · ${logBook.employee.pin || logBook.employee.employee_id}` : ''}
                            {logBook.employee.branch?.name ? ` · ${logBook.employee.branch.name}` : ''}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="start_place">Start place</Label>
                                    <Input id="start_place" value={data.start_place} onChange={(e) => setData('start_place', e.target.value)} />
                                    {errors.start_place && <p className="text-sm text-red-500">{errors.start_place}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="destination">Destination</Label>
                                    <Input id="destination" value={data.destination} onChange={(e) => setData('destination', e.target.value)} />
                                    {errors.destination && <p className="text-sm text-red-500">{errors.destination}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="purpose">Purpose</Label>
                                    <Input id="purpose" value={data.purpose} onChange={(e) => setData('purpose', e.target.value)} required />
                                    {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="start_meter_reading">Start meter</Label>
                                    <Input id="start_meter_reading" type="number" step="0.01" min="0" value={data.start_meter_reading} onChange={(e) => setData('start_meter_reading', e.target.value)} required />
                                    {errors.start_meter_reading && <p className="text-sm text-red-500">{errors.start_meter_reading}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="end_meter_reading">End meter</Label>
                                    <Input id="end_meter_reading" type="number" step="0.01" min="0" value={data.end_meter_reading} onChange={(e) => setData('end_meter_reading', e.target.value)} required />
                                    {errors.end_meter_reading && <p className="text-sm text-red-500">{errors.end_meter_reading}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="personal_km">Personal KM</Label>
                                    <Input id="personal_km" type="number" step="0.01" min="0" value={data.personal_km} onChange={(e) => setData('personal_km', e.target.value)} />
                                    {errors.personal_km && <p className="text-sm text-red-500">{errors.personal_km}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-slate-50 p-3 text-sm sm:grid-cols-4">
                                <div><p className="text-slate-500">Total</p><p className="font-semibold">{formatSmartKm(computed.totalKm)}</p></div>
                                <div><p className="text-slate-500">Personal</p><p className="font-semibold">{formatSmartKm(computed.personalKm)}</p></div>
                                <div><p className="text-slate-500">Official</p><p className="font-semibold text-emerald-700">{formatSmartKm(computed.officialKm)}</p></div>
                                <div><p className="text-slate-500">Payable</p><p className="font-semibold text-emerald-700">৳{computed.payable.toFixed(2)}</p></div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="work_result">Work result</Label>
                                <Textarea id="work_result" rows={4} value={data.work_result} onChange={(e) => setData('work_result', e.target.value)} />
                                {errors.work_result && <p className="text-sm text-red-500">{errors.work_result}</p>}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('movement-log-books.show', logBook.id)}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Save className="mr-1.5 h-4 w-4" />
                                    Save changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
