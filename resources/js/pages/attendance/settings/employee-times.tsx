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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { PageSurface } from '@/components/page-surface';
import {
  Search,
  Clock,
  User,
  Building,
  Briefcase,
  ArrowLeft,
  Timer,
  Trash2
} from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Department {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Designation {
  id: number;
  name: string;
}

interface CustomAttendanceTime {
  id: number;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number | null;
  half_day_hours: number | null;
  is_active: boolean;
  remarks: string | null;
}

interface Employee extends EmployeeNameFields {
  id: number;
  employee_id: string;
  department: Department;
  branch: Branch;
  designation: Designation;
  custom_attendance_time: CustomAttendanceTime | null;
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

interface EmployeesResponse {
  data: Employee[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface GlobalSettings {
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  half_day_hours: number;
}

interface EmployeeTimesProps {
  employees: EmployeesResponse;
  filters: {
    search?: string;
    custom_only?: boolean;
  };
  globalSettings: GlobalSettings;
}

const formatTime12h = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export default function EmployeeAttendanceTimes({
  employees,
  filters,
  globalSettings,
}: EmployeeTimesProps) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [customOnly, setCustomOnly] = useState(Boolean(filters.custom_only));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    work_start_time: globalSettings.work_start_time,
    work_end_time: globalSettings.work_end_time,
    late_threshold_minutes: '' as string | number,
    half_day_hours: '' as string | number,
    is_active: true,
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSearch = () => {
    router.get(route('attendance.settings.employee-times'), {
      search: search || undefined,
      custom_only: customOnly || undefined,
    }, { preserveState: true });
  };

  const openDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    const custom = employee.custom_attendance_time;
    setForm({
      work_start_time: custom?.work_start_time ?? globalSettings.work_start_time,
      work_end_time: custom?.work_end_time ?? globalSettings.work_end_time,
      late_threshold_minutes: custom?.late_threshold_minutes ?? '',
      half_day_hours: custom?.half_day_hours ?? '',
      is_active: custom?.is_active ?? true,
      remarks: custom?.remarks ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedEmployee) return;
    setSaving(true);
    router.put(
      route('attendance.settings.employee-times.upsert', selectedEmployee.id),
      {
        work_start_time: form.work_start_time,
        work_end_time: form.work_end_time,
        late_threshold_minutes: form.late_threshold_minutes === '' ? null : Number(form.late_threshold_minutes),
        half_day_hours: form.half_day_hours === '' ? null : Number(form.half_day_hours),
        is_active: form.is_active,
        remarks: form.remarks || null,
      },
      {
        onFinish: () => {
          setSaving(false);
          setDialogOpen(false);
        },
      }
    );
  };

  const handleRemove = (employee: Employee) => {
    if (!employee.custom_attendance_time) return;
    if (!confirm(`Remove custom attendance time for ${employeeDisplayName(employee)}?`)) return;
    router.delete(route('attendance.settings.employee-times.destroy', employee.id));
  };

  return (
    <Layout>
      <Head title="Employee Attendance Times" />

      <PageSurface>
        <div className="mb-6 space-y-4">
          <Link
            href={route('attendance.settings.index')}
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Attendance Settings
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employee Custom Times</h1>
              <p className="mt-1 text-sm text-slate-500">
                Set different check-in/check-out rules for specific employees.
                Others use default settings ({formatTime12h(globalSettings.work_start_time)} – {formatTime12h(globalSettings.work_end_time)}).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 h-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <Checkbox
                checked={customOnly}
                onCheckedChange={(v) => setCustomOnly(Boolean(v))}
              />
              Custom time only
            </label>
            <Button size="sm" onClick={handleSearch} className="h-9">
              Search
            </Button>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Timer className="h-5 w-5 text-emerald-600" />
              Employee Schedule Overrides
            </CardTitle>
            <CardDescription className="text-xs">
              Late, half-day, and present status will be calculated using these times for configured employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="pl-6">Employee</TableHead>
                    <TableHead>Branch / Dept</TableHead>
                    <TableHead>Custom Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employees.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.data?.map((employee) => {
                      const custom = employee.custom_attendance_time;
                      const hasCustom = custom?.is_active;

                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />
                              <div>
                                <div className="font-medium">{employeeDisplayName(employee)}</div>
                                <div className="text-xs text-slate-500">{employee.employee_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm flex flex-col gap-0.5">
                              <span className="flex items-center gap-1 text-slate-600">
                                <Building className="h-3 w-3" />
                                {employee.branch?.name ?? '—'}
                              </span>
                              <span className="flex items-center gap-1 text-slate-500 text-xs">
                                <Briefcase className="h-3 w-3" />
                                {employee.designation?.name ?? employee.department?.name ?? '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {hasCustom ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                                {formatTime12h(custom.work_start_time)} – {formatTime12h(custom.work_end_time)}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">Default</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasCustom ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Custom</Badge>
                            ) : (
                              <Badge variant="outline">Default</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDialog(employee)}>
                                {hasCustom ? 'Edit' : 'Set Time'}
                              </Button>
                              {hasCustom && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemove(employee)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {employees.meta && employees.meta.last_page > 1 && (
              <div className="p-4 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={employees.links.prev ?? '#'}
                        className={!employees.links.prev ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {employees.meta.links
                      .filter((l) => l.label !== '&laquo; Previous' && l.label !== 'Next &raquo;')
                      .map((link, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink href={link.url ?? '#'} isActive={link.active}>
                            {link.label}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        href={employees.links.next ?? '#'}
                        className={!employees.links.next ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Custom Attendance Time</DialogTitle>
              <DialogDescription>
                {selectedEmployee && (
                  <>Set work hours for {employeeDisplayName(selectedEmployee)} ({selectedEmployee.employee_id})</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="work_start_time">Check-in Time</Label>
                  <Input
                    id="work_start_time"
                    type="time"
                    value={form.work_start_time}
                    onChange={(e) => setForm({ ...form, work_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="work_end_time">Check-out Time</Label>
                  <Input
                    id="work_end_time"
                    type="time"
                    value={form.work_end_time}
                    onChange={(e) => setForm({ ...form, work_end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="late_threshold">Late Grace (min)</Label>
                  <Input
                    id="late_threshold"
                    type="number"
                    min={0}
                    placeholder={`Default: ${globalSettings.late_threshold_minutes}`}
                    value={form.late_threshold_minutes}
                    onChange={(e) => setForm({ ...form, late_threshold_minutes: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="half_day_hours">Half Day Hours</Label>
                  <Input
                    id="half_day_hours"
                    type="number"
                    min={1}
                    placeholder={`Default: ${globalSettings.half_day_hours}`}
                    value={form.half_day_hours}
                    onChange={(e) => setForm({ ...form, half_day_hours: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  placeholder="e.g. Customer service shift"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: Boolean(v) })}
                />
                Active (use custom time for status calculation)
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageSurface>
    </Layout>
  );
}
