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
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

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

interface Employee extends EmployeeNameFields {
  id: number;
  employee_id: string;
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
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Devices</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage and sync ZKTeco biometric devices
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSyncAll}
                variant="outline"
                size="sm"
                className="h-9 bg-white border-slate-200 text-slate-700 shadow-sm font-medium"
              >
                <RefreshCcw className="mr-2 h-4 w-4 text-slate-500" />
                Sync All Devices
              </Button>
              <Link href="">
                <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Device
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        {/* Devices Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Device Name</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">IP Address</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Branch</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Last Sync</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.length > 0 ? (
                    devices.map((device) => (
                      <TableRow key={device.id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="pl-6">
                          <div className="flex items-center">
                            <Server className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-xs text-slate-800">{device.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">{device.ip_address}:{device.port}</TableCell>
                        <TableCell className="text-xs text-slate-600">{device.branch.name}</TableCell>
                        <TableCell>
                          <div className="scale-90 origin-left">
                            {getStatusBadge(device.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {device.last_sync
                            ? new Date(device.last_sync).toLocaleString()
                            : 'Never synced'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleSyncDevice(device)}
                              disabled={device.status !== 'active'}
                              className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                              title="Sync Device"
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleTestConnection(device)}
                              className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors"
                              title="Test Connection"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openUploadDialog(device)}
                              disabled={device.status !== 'active'}
                              className="h-8 w-8 text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-colors"
                              title="Upload Employees"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => router.get(route('zkteco.devices.edit', device.id))}
                              className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                              title="Edit Device"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Server className="h-12 w-12 text-gray-400 mb-2" />
                        <p>No attendance devices found.</p>
                        <Link href="">
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
            </div>
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
                      {employee.employee_id} - {employeeDisplayName(employee)}
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
