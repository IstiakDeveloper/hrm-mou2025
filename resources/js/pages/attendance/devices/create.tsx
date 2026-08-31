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
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { ArrowLeft, Network, Radio } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

function mapServerErrorsToFormErrors(
  raw: Record<string, string | string[]>
): Record<string, string> {
  const snakeToCamel: Record<string, string> = {
    device_id: 'deviceId',
    ip_address: 'ipAddress',
    branch_id: 'branchId',
    serial_number: 'serialNumber',
    adms_enabled: 'admsEnabled',
    agent_sync_enabled: 'agentSyncEnabled',
  };
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const msg = Array.isArray(val) ? val[0] : String(val);
    const targetKey = snakeToCamel[key] ?? key;
    out[targetKey] = msg;
  }
  return out;
}

interface Branch {
    id: number;
    name: string;
}

interface CreateProps {
    branches: Branch[];
    statuses: string[];
}

export default function Create({ branches, statuses }: CreateProps) {
    const [deviceId, setDeviceId] = useState('');
    const [name, setName] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('4370'); // Default ZKTeco port
    const [serialNumber, setSerialNumber] = useState('');
    const [branchId, setBranchId] = useState('');
    const [status, setStatus] = useState('active');
    const [admsEnabled, setAdmsEnabled] = useState(false);
    const [agentSyncEnabled, setAgentSyncEnabled] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!deviceId) newErrors.deviceId = 'Device ID is required';
        if (!name) newErrors.name = 'Name is required';
        if (!ipAddress) newErrors.ipAddress = 'IP address is required';
        // Basic IP validation
        else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress))
            newErrors.ipAddress = 'Please enter a valid IP address';

        if (!port) newErrors.port = 'Port is required';
        else if (parseInt(port) < 1 || parseInt(port) > 65535)
            newErrors.port = 'Port must be between 1 and 65535';

        if (!branchId) newErrors.branchId = 'Branch is required';
        if (!status) newErrors.status = 'Status is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        router.post(route('attendance.devices.store'), {
            device_id: deviceId,
            name,
            ip_address: ipAddress,
            port: parseInt(port),
            serial_number: serialNumber || null,
            branch_id: parseInt(branchId),
            status,
            adms_enabled: admsEnabled,
            agent_sync_enabled: agentSyncEnabled,
        }, {
            onError: (errs) => {
                setErrors(mapServerErrorsToFormErrors(errs as Record<string, string | string[]>));
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false)
        });
    };

    return (
        <Layout>
            <Head title="Add Attendance Device" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('attendance.devices.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Devices
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Add Attendance Device</h1>
                </div>

                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Device Information</CardTitle>
                        <CardDescription>Add a new biometric or attendance tracking device</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Device Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Main Office Scanner"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                    {errors.name && (
                                        <p className="text-sm font-medium text-red-500">{errors.name}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        A human-readable name for this device
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="deviceId">Device ID</Label>
                                    <Input
                                        id="deviceId"
                                        placeholder="ZKTS001"
                                        value={deviceId}
                                        onChange={(e) => setDeviceId(e.target.value)}
                                    />
                                    {errors.deviceId && (
                                        <p className="text-sm font-medium text-red-500">{errors.deviceId}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Unique identifier for this device
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="ipAddress">IP Address</Label>
                                    <div className="flex items-center">
                                        <Network className="w-4 h-4 mr-2 text-gray-500" />
                                        <Input
                                            id="ipAddress"
                                            placeholder="192.168.1.100"
                                            value={ipAddress}
                                            onChange={(e) => setIpAddress(e.target.value)}
                                        />
                                    </div>
                                    {errors.ipAddress && (
                                        <p className="text-sm font-medium text-red-500">{errors.ipAddress}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Network IP address of the device
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="port">Port</Label>
                                    <Input
                                        id="port"
                                        type="number"
                                        min="1"
                                        max="65535"
                                        value={port}
                                        onChange={(e) => setPort(e.target.value)}
                                    />
                                    {errors.port && (
                                        <p className="text-sm font-medium text-red-500">{errors.port}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Communication port (default: 4370 for ZKTeco)
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="serialNumber">Device serial (ADMS SN)</Label>
                                <Input
                                    id="serialNumber"
                                    placeholder="QWC5244200223"
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                    className="font-mono"
                                />
                                {errors.serialNumber && (
                                    <p className="text-sm font-medium text-red-500">{errors.serialNumber}</p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                    From the machine Cloud Server / ADMS handshake. Leave blank to auto-bind on first live connect if this is the only ADMS device.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-lg border border-slate-200 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Label htmlFor="admsEnabled" className="flex items-center gap-2">
                                            <Radio className="h-4 w-4 text-emerald-600" />
                                            Live ADMS
                                        </Label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Machine pushes punches to the VPS as they happen.
                                        </p>
                                    </div>
                                    <Switch
                                        id="admsEnabled"
                                        checked={admsEnabled}
                                        onCheckedChange={setAdmsEnabled}
                                    />
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Label htmlFor="agentSyncEnabled">Local PC agent</Label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Office PC still posts to /api/zkteco/sync. Turn off after live ADMS is confirmed.
                                        </p>
                                    </div>
                                    <Switch
                                        id="agentSyncEnabled"
                                        checked={agentSyncEnabled}
                                        onCheckedChange={setAgentSyncEnabled}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="branch">Branch</Label>
                                    <Select
                                        value={branchId}
                                        onValueChange={(value) => {
                                            console.log('Selected branch:', value);
                                            setBranchId(value);
                                        }}
                                    >
                                        <SelectTrigger id="branch">
                                            <SelectValue placeholder="Select Branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches && branches.length > 0 ? (
                                                sortPayrollBranches(branches).map((branch) => (
                                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                                        {formatBranchSelectLabel(branch)}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="" disabled>
                                                    No branches available
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.branchId && (
                                        <p className="text-sm font-medium text-red-500">{errors.branchId}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Branch where this device is located
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={status}
                                        onValueChange={setStatus}
                                    >
                                        <SelectTrigger id="status">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((statusOption) => (
                                                <SelectItem key={statusOption} value={statusOption}>
                                                    {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.status && (
                                        <p className="text-sm font-medium text-red-500">{errors.status}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Current operational status of the device
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Link href={route('attendance.devices.index')}>
                                    <Button variant="outline" type="button">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save Device'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
