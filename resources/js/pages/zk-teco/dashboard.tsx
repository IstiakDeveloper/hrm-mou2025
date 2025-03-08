import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MoreHorizontal,
  RefreshCcw,
  Plus,
  Server,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AttendanceDevice {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  status: 'active' | 'inactive' | 'maintenance';
  branch: {
    id: number;
    name: string;
  };
  last_sync?: string;
}

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  current_branch_id: number;
}

interface ZKTecoDashboardProps {
  devices: AttendanceDevice[];
  flash?: {
    success?: string;
    error?: string;
    warning?: string;
  };
}

export default function ZKTecoDashboard({ devices, flash }: ZKTecoDashboardProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<AttendanceDevice | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle sync device
  const handleSyncDevice = (device: AttendanceDevice) => {
    if (confirm(`Are you sure you want to sync attendance logs from ${device.name}?`)) {
      router.post(route('zkteco.sync-device', device.id));
    }
  };

  // Handle sync all devices
  const handleSyncAll = () => {
    if (confirm('Are you sure you want to sync all active devices?')) {
      router.post(route('zkteco.sync-all'));
    }
  };

  // Handle test connection
  const handleTestConnection = (device: AttendanceDevice) => {
    router.post(route('zkteco.test-connection', device.id));
  };

  // Handle upload employees dialog
  const openUploadDialog = async (device: AttendanceDevice) => {
    setCurrentDevice(device);
    setIsLoading(true);

    try {
      // This would be replaced with an actual API call to fetch employees for this branch
      const response = await fetch(route('api.employees.by-branch', device.branch.id));
      const data = await response.json();
      setEmployees(data);
      setSelectedEmployees([]);
      setIsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load employees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle employee selection
  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Handle upload employees
  const handleUploadEmployees = () => {
    if (!currentDevice || selectedEmployees.length === 0) return;

    router.post(route('zkteco.upload-employees', currentDevice.id), {
      employee_ids: selectedEmployees
    });

    setIsDialogOpen(false);
  };

  // Show flash messages
  React.useEffect(() => {
    if (flash?.success) {
      toast({
        title: "Success",
        description: flash.success,
      });
    }
    if (flash?.error) {
      toast({
        title: "Error",
        description: flash.error,
        variant: "destructive",
      });
    }
    if (flash?.warning) {
      toast({
        title: "Warning",
        description: flash.warning,
        variant: "warning",
      });
    }
  }, [flash, toast]);

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactive</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <Head title="ZK Teco Devices" />

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Devices</h1>
            <p className="mt-1 text-gray-500">
              Manage and sync ZKTeco biometric devices
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSyncAll}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Sync All Devices
            </Button>
            <Link href="">
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </Link>
          </div>
        </div>

        {/* Devices Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length > 0 ? (
                  devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Server className="mr-2 h-4 w-4 text-gray-500" />
                          {device.name}
                        </div>
                      </TableCell>
                      <TableCell>{device.ip_address}:{device.port}</TableCell>
                      <TableCell>{device.branch.name}</TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell>
                        {device.last_sync
                          ? new Date(device.last_sync).toLocaleString()
                          : 'Never synced'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleSyncDevice(device)}
                              className="cursor-pointer"
                              disabled={device.status !== 'active'}
                            >
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              <span>Sync Device</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleTestConnection(device)}
                              className="cursor-pointer"
                            >
                              <LinkIcon className="mr-2 h-4 w-4" />
                              <span>Test Connection</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openUploadDialog(device)}
                              className="cursor-pointer"
                              disabled={device.status !== 'active'}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              <span>Upload Employees</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.get(route('zkteco.devices.edit', device.id))}
                              className="cursor-pointer"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Edit Device</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Server className="h-12 w-12 text-gray-400 mb-2" />
                        <p>No attendance devices found.</p>
                        <Link href={route('zkteco.devices.create')}>
                          <Button
                            variant="link"
                            className="px-2 font-normal mt-2"
                          >
                            Add your first device
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Upload Employees Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Employees to Device</DialogTitle>
            <DialogDescription>
              {currentDevice && (
                <>Select employees to upload to the device "{currentDevice.name}"</>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center items-center p-6">
              <RefreshCcw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <ScrollArea className="h-[300px] p-4 rounded border">
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id={`employee-${employee.id}`}
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                    />
                    <label
                      htmlFor={`employee-${employee.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {employee.employee_id} - {employee.first_name} {employee.last_name}
                    </label>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Users className="h-12 w-12 text-gray-400 mb-2" />
                  <p>No employees found for this branch.</p>
                </div>
              )}
            </ScrollArea>
          )}

          <DialogFooter className="sm:justify-between">
            <div className="text-sm text-gray-500">
              {selectedEmployees.length} employees selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadEmployees}
                disabled={selectedEmployees.length === 0 || isLoading}
              >
                Upload Employees
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
