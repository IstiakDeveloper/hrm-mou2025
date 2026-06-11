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
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import {
  Edit,
  Trash2,
  MoreHorizontal,
  Plus,
  Search,
  Activity,
  Network,
  Building,
  RefreshCw,
  Clock,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageSurface } from '@/components/page-surface';

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

interface PaginationLinks {
  url: string | null;
  label: string;
  active: boolean;
}

interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  links: PaginationLinks[];
  path: string;
  per_page: number;
  to: number;
  total: number;
}

interface DevicesResponse {
  data: AttendanceDevice[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface DevicesIndexProps {
  devices: DevicesResponse;
  branches: Branch[];
  filters: {
    search: string;
    branch_id: string;
    status: string;
  };
  statuses: string[];
}

export default function DevicesIndex({ devices, branches, filters, statuses }: DevicesIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [branchId, setBranchId] = useState(filters.branch_id || 'all');
  const [status, setStatus] = useState(filters.status || 'all');

  const handleSearch = () => {
    router.get(route('attendance.devices.index'), {
      search,
      branch_id: branchId === 'all' ? '' : branchId,
      status: status === 'all' ? '' : status
    }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setBranchId('all');
    setStatus('all');
    router.get(route('attendance.devices.index'));
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
      router.delete(route('attendance.devices.destroy', id));
    }
  };

  const testConnection = (id: number) => {
    router.post(route('attendance.devices.test-connection', id));
  };

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

  const getStatusBadge = (status: string) => {
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

  return (
    <Layout>
      <Head title="Attendance Devices" />

      <PageSurface>
        <div className="mb-6 space-y-4">
          {/* Top row: Title and primary actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Devices</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage biometric and attendance tracking devices
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href={route('attendance.devices.biometric-ids')}>
                <Button variant="outline" size="sm" className="h-9 bg-white border-slate-200 text-slate-700 shadow-sm font-medium">
                  <UserCheck className="mr-2 h-4 w-4 text-slate-500" />
                  Biometric IDs
                </Button>
              </Link>
              <Link href={route('attendance.devices.sync-report')}>
                <Button variant="outline" size="sm" className="h-9 bg-white border-slate-200 text-slate-700 shadow-sm font-medium">
                  <RefreshCw className="mr-2 h-4 w-4 text-slate-500" />
                  Sync Report
                </Button>
              </Link>
              <Link href={route('attendance.devices.create')}>
                <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Device
                </Button>
              </Link>
            </div>
          </div>

          {/* Compact Filter Bar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full bg-slate-50/50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, device ID or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
              />
            </div>

            <div className="w-[160px]">
              <Select value={branchId} onValueChange={(value) => setBranchId(value)}>
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 rounded-lg">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {sortPayrollBranches(branches).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {formatBranchSelectLabel(branch)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <Select value={status} onValueChange={(value) => setStatus(value)}>
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={resetFilters} size="sm" className="h-9 text-slate-500 hover:text-slate-700">
                Reset
              </Button>
              <Button onClick={handleSearch} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Name</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Device ID</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Branch</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">IP Address</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Last Sync</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Sync Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.data && devices.data.length > 0 ? (
                    devices.data.map((device) => (
                      <TableRow key={device.id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="pl-6">
                          <div className="font-semibold text-xs text-slate-800">{device.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-[11px] text-slate-500">{device.device_id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-xs text-slate-600">
                            <Building className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                            <span>{device.branch.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-xs text-slate-600">
                            <Network className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono">{device.ip_address}:{device.port}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="scale-90 origin-left">
                            {getStatusBadge(device.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-xs text-slate-600">
                            <Clock className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                            <span>{formatDateTime(device.last_sync_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="scale-90 origin-left">
                            {getSyncStatusBadge(device.last_sync_status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => testConnection(device.id)}
                              className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                              title="Test Connection"
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => router.get(route('attendance.devices.edit', device.id))}
                              className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                              title="Edit Device"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(device.id)}
                              className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                              title="Delete Device"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No devices found.
                      {(search || branchId || status) && (
                        <Button
                          variant="link"
                          onClick={resetFilters}
                          className="px-2 font-normal"
                        >
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {devices.meta && devices.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {devices.meta.current_page > 1 && devices.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={devices.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(devices.links.prev || '', {
                          search,
                          branch_id: branchId === 'all' ? '' : branchId,
                          status: status === 'all' ? '' : status
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {devices.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
                  const isPageNumber = !isNaN(Number(link.label));

                  if (!isPageNumber && link.label === '...') {
                    return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href={link.url || '#'}
                        isActive={link.active}
                        onClick={(e) => {
                          e.preventDefault();
                          if (link.url) {
                            router.get(link.url, {
                              search,
                              branch_id: branchId,
                              status
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {devices.meta.current_page < devices.meta.last_page && devices.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={devices.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(devices.links.next || '', {
                          search,
                          branch_id: branchId,
                          status
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </PageSurface>
    </Layout>
  );
}
