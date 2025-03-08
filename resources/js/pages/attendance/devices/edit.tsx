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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ArrowLeft, Building, Network } from 'lucide-react';

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
}

interface EditProps {
  device: AttendanceDevice;
  branches: Branch[];
  statuses: string[];
}

export default function Edit({ device, branches, statuses }: EditProps) {
  const [deviceId, setDeviceId] = useState(device.device_id);
  const [name, setName] = useState(device.name);
  const [ipAddress, setIpAddress] = useState(device.ip_address);
  const [port, setPort] = useState(device.port.toString());
  const [branchId, setBranchId] = useState(device.branch_id.toString());
  const [status, setStatus] = useState(device.status);
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

    router.put(route('attendance.devices.update', device.id), {
      device_id: deviceId,
      name,
      ip_address: ipAddress,
      port: parseInt(port),
      branch_id: parseInt(branchId),
      status
    }, {
      onError: (errors) => {
        setErrors(errors);
        setSubmitting(false);
      },
      onFinish: () => setSubmitting(false)
    });
  };

  const testConnection = () => {
    router.post(route('attendance.devices.test-connection', device.id));
  };

  return (
    <Layout>
      <Head title="Edit Attendance Device" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('attendance.devices.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Devices
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Attendance Device</h1>
          <Button variant="outline" onClick={testConnection}>
            Test Connection
          </Button>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
            <CardDescription>Update information for this attendance device</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Device Name</Label>
                  <Input
                    id="name"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Select
                    value={branchId}
                    onValueChange={setBranchId}
                  >
                    <SelectTrigger id="branch">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
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
                  {submitting ? 'Updating...' : 'Update Device'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
