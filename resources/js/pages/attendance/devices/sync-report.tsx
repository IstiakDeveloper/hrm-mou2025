import React from 'react';
import { Head, Link } from '@inertiajs/react';
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Building,
    Network,
    Clock,
    ArrowLeft
} from 'lucide-react';

interface Branch {
    id: number;
    name: string;
}

interface AttendanceDevice {
    id: number;
    device_id: string;
    name: string;
    ip_address: string;
    port: number;
    branch_id: number;
    status: string;
    branch: Branch;
    last_sync_at: string | null;
    last_sync_status: string | null;
}

interface SyncReportProps {
    devices: AttendanceDevice[];
}

export default function SyncReport({ devices }: SyncReportProps) {
    const formatDateTime = (dateTime: string | null) => {
        if (!dateTime) return 'Never';

        const date = new Date(dateTime);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSyncStatusBadge = (status: string | null) => {
        if (!status) return null;

        const statusColors: Record<string, string> = {
            success: 'bg-green-100 text-green-800',
            partial: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800'
        };

        const statusColor = statusColors[status] || 'bg-gray-100 text-gray-800';

        return (
            <Badge variant="outline" className={`${statusColor} border-0`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getDeviceStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            maintenance: 'bg-yellow-100 text-yellow-800'
        };

        const statusColor = statusColors[status] || 'bg-gray-100 text-gray-800';

        return (
            <Badge variant="outline" className={`${statusColor} border-0`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getSyncAgeClass = (dateTime: string | null) => {
        if (!dateTime) return 'text-red-600';

        const syncDate = new Date(dateTime);
        const now = new Date();
        const diffHours = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) return 'text-green-600';
        if (diffHours < 48) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <Layout>
            <Head title="Device Sync Report" />

            <div className="container mx-auto py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Device Sync Report</h1>
                        <p className="mt-1 text-gray-500">
                            Monitor attendance device synchronization status
                        </p>
                    </div>

                    <div className="mt-4 md:mt-0">
                        <Link href={route('attendance.devices.index')}>
                            <Button variant="outline" className="flex items-center">
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Back to Devices
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Sync Report Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>ZKTeco Device Sync Status</CardTitle>
                        <CardDescription>
                            Shows the most recent synchronization status for all attendance devices
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Device Name</TableHead>
                                    <TableHead>Device ID</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Sync</TableHead>
                                    <TableHead>Sync Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices && devices.length > 0 ? (
                                    devices.map((device) => (
                                        <TableRow key={device.id}>
                                            <TableCell>
                                                <div className="font-medium">{device.name}</div>
                                            </TableCell>
                                            <TableCell>{device.device_id}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Building className="mr-2 h-4 w-4 text-gray-400" />
                                                    <span>{device.branch.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Network className="mr-2 h-4 w-4 text-gray-400" />
                                                    <span>{device.ip_address}:{device.port}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getDeviceStatusBadge(device.status)}
                                            </TableCell>
                                            <TableCell>
                                                <div className={`flex items-center ${getSyncAgeClass(device.last_sync_at)}`}>
                                                    <Clock className="mr-2 h-4 w-4" />
                                                    <span>{formatDateTime(device.last_sync_at)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getSyncStatusBadge(device.last_sync_status)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No devices found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration Instructions</CardTitle>
                            <CardDescription>
                                How to set up the ZKTeco Agent for automatic attendance synchronization
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">ZKTeco Agent Config File</h3>
                                <p>
                                    Use the following configuration in your ZKTeco Agent's config.json file:
                                </p>

                                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                                    {`{
                                        "devices": [
                                            {
                                            "id": 1,
                                            "name": "Main Office",
                                            "ip": "192.168.5.149",
                                            "port": 4370
                                            }
                                        ],
                                        "api_endpoint": "${window.location.origin}/api/zkteco/sync",
                                        "api_key": "AWSKJSKJ934895395834985834958345",
                                        "clear_after_sync": false,
                                        "debug": true
                                    }`}
                                </pre>

                                <div className="text-sm text-gray-600 mt-2">
                                    <p>Make sure to:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>Set the correct IP addresses for your ZKTeco devices</li>
                                        <li>Ensure the API endpoint matches your server URL</li>
                                        <li>Use the API key configured in your .env file</li>
                                        <li>Set clear_after_sync to true if you want to clear attendance logs after sync</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
