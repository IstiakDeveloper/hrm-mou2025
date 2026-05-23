import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { DISPLAY_DATE_FMT, displayDateToServer, parseFormDateValue } from '@/lib/display-date';
import { ArrowLeft } from 'lucide-react';

export default function PayscaleCreate() {
    const { data, setData, post, processing, errors, transform } = useForm({
        name: '',
        description: '',
        effective_from: '',
        is_active: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            effective_from: displayDateToServer(payload.effective_from),
        }));
        post(route('payscales.store'));
    };

    return (
        <Layout>
            <Head title="Create Payscale" />
            <div className="container mx-auto max-w-2xl py-8">
                <Link href={route('payscales.index')} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <form onSubmit={submit}>
                    <Card>
                        <CardHeader><CardTitle>New payscale</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
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
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild><Link href={route('payscales.index')}>Cancel</Link></Button>
                            <Button type="submit" disabled={processing}>Save</Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
