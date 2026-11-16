import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Edit,
  Trash2,
  MoreHorizontal,
  Plus,
  Building,
  AlarmClock,
  CalendarDays,
  Timer,
  BarChart2,
  AlertCircle,
  User,
  Sparkles,
  Shield,
  CheckCheck,
  XCircle,
  HardDrive,
  Briefcase,
  Network,
  Layers,
  Search,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isSuperAdmin } from '@/lib/permissions';
import { format } from 'date-fns';
import { PageSurface } from '@/components/page-surface';

interface Branch {
  id: number;
  name: string;
  is_head_office?: boolean;
  allow_multi_day_movement?: boolean;
}

interface AttendanceSetting {
  id: number;
  branch_id: number;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  half_day_hours: number;
  weekend_days: number[] | string; // Can be either array or JSON string
  enable_bulk_attendance?: boolean;
  allow_multi_day_movement?: boolean;
  branch: Branch;
}

interface DeviceEmployeeRow {
  id: number;
  name: string;
  employee_code: string;
  pin: string;
  search?: string;
  on_device: boolean;
  queued: boolean;
  can_push?: boolean;
  is_multi_branch?: boolean;
  project_name?: string | null;
}

interface DevicePushRow {
  id: number;
  name: string;
  branch_name?: string | null;
  adms_enabled: boolean;
  adms_link: string;
  last_adms_at?: string | null;
  known_users: number;
  pending_commands: number;
  missing_users: number | null;
  employees?: DeviceEmployeeRow[];
}

interface OfficeOpenDateRow {
  id: number;
  date: string;
  note?: string | null;
}

interface MultiBranchProjectItem {
  project_id: number;
  project_name: string;
  project_code?: string | null;
  staff_count: number;
  branches: Array<{ id: number; name: string; branch_code?: string | null }>;
}

interface MultiBranchEmployeeItem {
  employee_id: number;
  employee_code: string;
  pin?: string | null;
  name: string;
  designation?: string | null;
  primary_branch?: { id: number; name: string } | null;
  project_name?: string | null;
  branches: Array<{ id: number; name: string; branch_code?: string | null }>;
}

interface MultiBranchPermissionsData {
  projects: MultiBranchProjectItem[];
  employees: MultiBranchEmployeeItem[];
  allProjects: Array<{ id: number; name: string; code?: string | null }>;
  allEmployees: Array<{
    id: number;
    employee_code: string;
    pin?: string | null;
    name: string;
    branch_name?: string | null;
    branch_id?: number | null;
    project_id?: number | null;
  }>;
}

interface AttendanceSettingsIndexProps {
  settings: AttendanceSetting[];
  branches: Branch[];
  isBulkAttendanceEnabled?: boolean;
  guardShift: GuardShiftForm;
  designations: GuardDesignation[];
  attlogKeepDays?: number;
  devicePushes?: DevicePushRow[];
  officeOpenDates?: OfficeOpenDateRow[];
  multiBranchPermissions?: MultiBranchPermissionsData;
}

interface GuardDesignation {
  id: number;
  name: string;
}

interface GuardShiftForm {
  is_enabled: boolean;
  work_on_weekend: boolean;
  grace_minutes: number;
  day_start: string;
  day_end: string;
  night_start: string;
  night_end: string;
  designation_ids: number[];
  uses_name_match?: boolean;
}

export default function AttendanceSettingsIndex({
  settings,
  branches,
  isBulkAttendanceEnabled = true,
  guardShift,
  designations = [],
  attlogKeepDays = 15,
  devicePushes = [],
  officeOpenDates = [],
  multiBranchPermissions = { projects: [], employees: [], allProjects: [], allEmployees: [] },
}: AttendanceSettingsIndexProps) {
  const { auth } = usePage().props as any;
  const isSuperAdminUser = isSuperAdmin(auth);

  const [bulkEnabled, setBulkEnabled] = useState(isBulkAttendanceEnabled);
  const [isUpdatingToggle, setIsUpdatingToggle] = useState(false);

  // Multi-Branch Permissions State
  const [multiBranchModalOpen, setMultiBranchModalOpen] = useState(false);
  const [activeMultiBranchTab, setActiveMultiBranchTab] = useState<'project' | 'employee'>('project');

  // Project Form State
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedProjectBranchIds, setSelectedProjectBranchIds] = useState<number[]>([]);
  const [projectBranchFilter, setProjectBranchFilter] = useState('');
  const [isSavingProjectBranches, setIsSavingProjectBranches] = useState(false);

  // Employee Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [selectedEmployeeBranchIds, setSelectedEmployeeBranchIds] = useState<number[]>([]);
  const [employeeSearchFilter, setEmployeeSearchFilter] = useState('');
  const [employeeBranchFilter, setEmployeeBranchFilter] = useState('');
  const [isSavingEmployeeBranches, setIsSavingEmployeeBranches] = useState(false);

  const handleEditProjectBranches = (item: MultiBranchProjectItem) => {
    setSelectedProjectId(item.project_id);
    setSelectedProjectBranchIds(item.branches.map((b) => b.id));
    setActiveMultiBranchTab('project');
    setMultiBranchModalOpen(true);
  };

  const handleDeleteProjectBranches = (projectId: number, projectName: string) => {
    if (confirm(`Are you sure you want to remove multi-branch attendance permissions for ${projectName}?`)) {
      router.delete(route('attendance.settings.project-branches.destroy', projectId), {
        preserveScroll: true,
      });
    }
  };

  const handleSaveProjectBranches = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }
    if (selectedProjectBranchIds.length === 0) {
      alert('Please select at least one branch');
      return;
    }
    setIsSavingProjectBranches(true);
    router.post(
      route('attendance.settings.project-branches.store'),
      {
        project_id: selectedProjectId,
        branch_ids: selectedProjectBranchIds,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSavingProjectBranches(false);
          setSelectedProjectId('');
          setSelectedProjectBranchIds([]);
        },
        onError: () => {
          setIsSavingProjectBranches(false);
        },
      }
    );
  };

  const handleEditEmployeeBranches = (item: MultiBranchEmployeeItem) => {
    setSelectedEmployeeId(item.employee_id);
    setSelectedEmployeeBranchIds(item.branches.map((b) => b.id));
    setActiveMultiBranchTab('employee');
    setMultiBranchModalOpen(true);
  };

  const handleDeleteEmployeeBranches = (employeeId: number, employeeName: string) => {
    if (confirm(`Are you sure you want to remove multi-branch attendance permissions for ${employeeName}?`)) {
      router.delete(route('attendance.settings.employee-branches.destroy', employeeId), {
        preserveScroll: true,
      });
    }
  };

  const handleSaveEmployeeBranches = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert('Please select an employee');
      return;
    }
    if (selectedEmployeeBranchIds.length === 0) {
      alert('Please select at least one branch');
      return;
    }
    setIsSavingEmployeeBranches(true);
    router.post(
      route('attendance.settings.employee-branches.store'),
      {
        employee_id: selectedEmployeeId,
        branch_ids: selectedEmployeeBranchIds,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSavingEmployeeBranches(false);
          setSelectedEmployeeId('');
          setSelectedEmployeeBranchIds([]);
        },
        onError: () => {
          setIsSavingEmployeeBranches(false);
        },
      }
    );
  };

  // Multi-Day Movement Branch Permissions State
  const [branchesList, setBranchesList] = useState<Branch[]>(branches);
  const [branchFilter, setBranchFilter] = useState('');
  const [updatingBranchId, setUpdatingBranchId] = useState<number | null>(null);
  const [multiDayModalOpen, setMultiDayModalOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const enabledBranchesCount = branchesList.filter(
    (b) => Boolean(b.allow_multi_day_movement ?? b.is_head_office)
  ).length;

  const handleToggleMultiDay = async (branchId: number, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setUpdatingBranchId(branchId);
    try {
      await axios.post(route('attendance.settings.toggle-multi-day-movement'), {
        branch_id: branchId,
        enabled: newEnabled,
      });
      setBranchesList((prev) =>
        prev.map((b) => (b.id === branchId ? { ...b, allow_multi_day_movement: newEnabled } : b))
      );
    } catch (e) {
      console.error('Failed to toggle multi-day movement:', e);
    } finally {
      setUpdatingBranchId(null);
    }
  };

  const handleToggleAllMultiDay = async (enabled: boolean) => {
    setIsBulkUpdating(true);
    try {
      await axios.post(route('attendance.settings.toggle-multi-day-movement'), {
        all: true,
        enabled,
      });
      setBranchesList((prev) =>
        prev.map((b) => ({
          ...b,
          allow_multi_day_movement: enabled,
        }))
      );
    } catch (e) {
      console.error('Failed to bulk toggle multi-day movement:', e);
    } finally {
      setIsBulkUpdating(false);
    }
  };
  const [guardForm, setGuardForm] = useState<GuardShiftForm>(guardShift);
  const [guardModalOpen, setGuardModalOpen] = useState(false);
  const [isSavingGuard, setIsSavingGuard] = useState(false);
  const [designationQuery, setDesignationQuery] = useState('');
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [logKeepDays, setLogKeepDays] = useState(attlogKeepDays);
  const [savingLogDays, setSavingLogDays] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState<number | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [pushingId, setPushingId] = useState<number | null>(null);
  const [openDate, setOpenDate] = useState('');
  const [openNote, setOpenNote] = useState('');
  const [savingOpenDate, setSavingOpenDate] = useState(false);

  const saturdayMissing = settings.some((setting) => {
    let days: number[] = [];
    if (Array.isArray(setting.weekend_days)) {
      days = setting.weekend_days.map(Number);
    } else if (typeof setting.weekend_days === 'string') {
      try {
        const parsed = JSON.parse(setting.weekend_days);
        days = Array.isArray(parsed) ? parsed.map(Number) : [];
      } catch {
        days = [];
      }
    }
    return days.length > 0 && !days.includes(6);
  });

  const saveOfficeOpenDate = () => {
    if (!openDate) {
      return;
    }

    setSavingOpenDate(true);
    router.post(route('attendance.settings.office-open-dates.store'), {
      date: openDate,
      note: openNote,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setOpenDate('');
        setOpenNote('');
      },
      onFinish: () => setSavingOpenDate(false),
    });
  };

  const removeOfficeOpenDate = (id: number) => {
    if (!confirm('Remove this office-open date? That day will follow the weekend again.')) {
      return;
    }

    router.delete(route('attendance.settings.office-open-dates.destroy', id), {
      preserveScroll: true,
    });
  };

  const handleToggleBulk = async (checked: boolean) => {
    setBulkEnabled(checked);
    setIsUpdatingToggle(true);
    try {
      await axios.post(route('attendance.settings.toggle-bulk-attendance'), {
        enable_bulk_attendance: checked,
      });
      router.reload({ only: ['isBulkAttendanceEnabled'] });
    } catch (err) {
      console.error(err);
      setBulkEnabled(!checked);
    } finally {
      setIsUpdatingToggle(false);
    }
  };

  const saveGuardShift = () => {
    setIsSavingGuard(true);
    router.put(route('attendance.settings.guard-shift'), {
      is_enabled: guardForm.is_enabled,
      work_on_weekend: guardForm.work_on_weekend,
      grace_minutes: Number(guardForm.grace_minutes),
      day_start: guardForm.day_start,
      day_end: guardForm.day_end,
      night_start: guardForm.night_start,
      night_end: guardForm.night_end,
      designation_ids: guardForm.designation_ids,
    }, {
      preserveScroll: true,
      onSuccess: () => setGuardModalOpen(false),
      onFinish: () => setIsSavingGuard(false),
    });
  };

  const openGuardModal = () => {
    setGuardForm({
      ...guardShift,
      designation_ids: [...(guardShift?.designation_ids ?? [])],
    });
    setDesignationQuery('');
    setGuardModalOpen(true);
  };

  const toggleGuardDesignation = (id: number, checked: boolean) => {
    setGuardForm((current) => ({
      ...current,
      uses_name_match: false,
      designation_ids: checked
        ? Array.from(new Set([...current.designation_ids, id]))
        : current.designation_ids.filter((existing) => existing !== id),
    }));
  };

  const filteredDesignations = designations.filter((designation) =>
    designation.name.toLowerCase().includes(designationQuery.trim().toLowerCase())
  );

  const guardDesignationNames = designations
    .filter((designation) => guardShift.designation_ids.includes(designation.id))
    .map((designation) => designation.name);
  const guardDesignationLabel = guardDesignationNames.length === 0
    ? 'Security Guard title'
    : guardDesignationNames.length <= 2
      ? guardDesignationNames.join(', ')
      : `${guardDesignationNames.slice(0, 2).join(', ')} +${guardDesignationNames.length - 2}`;

  const openDeviceModal = () => {
    setLogKeepDays(attlogKeepDays);
    setActiveDeviceId(devicePushes[0]?.id ?? null);
    setSelectedEmployeeIds([]);
    setEmployeeQuery('');
    setDeviceModalOpen(true);
  };

  const saveLogKeepDays = () => {
    const days = Number(logKeepDays);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      return;
    }

    setSavingLogDays(true);
    router.put(route('attendance.settings.device-log-keep'), {
      attlog_keep_days: days,
    }, {
      preserveScroll: true,
      onFinish: () => setSavingLogDays(false),
    });
  };

  const pushSelectedUsers = (device: DevicePushRow) => {
    if (selectedEmployeeIds.length === 0) {
      return;
    }

    setPushingId(device.id);
    router.post(route('attendance.settings.devices.push-missing', device.id), {
      employee_ids: selectedEmployeeIds,
    }, {
      preserveScroll: true,
      onSuccess: () => setSelectedEmployeeIds([]),
      onFinish: () => setPushingId(null),
    });
  };

  const pendingDeviceCommands = devicePushes.reduce((sum, device) => sum + device.pending_commands, 0);

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete these attendance settings? This action cannot be undone.')) {
      router.delete(route('attendance.settings.destroy', id));
    }
  };

  const getWeekdayName = (day: number): string => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[day];
  };

  // Function to format time in 12-hour format
  const formatTime = (timeString: string): string => {
    try {
      // Parse the time string properly
      const [hoursStr, minutesStr] = timeString.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = minutesStr ? minutesStr.substring(0, 2) : '00'; // Get only the first two digits for minutes

      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert to 12-hour format

      return `${hours12}:${minutes} ${period}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString;
    }
  };

  // Calculate work hours duration
  const calculateWorkHours = (startTime: string, endTime: string): string => {
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      let totalHours = endHours - startHours;
      let totalMinutes = endMinutes - startMinutes;

      if (totalMinutes < 0) {
        totalHours -= 1;
        totalMinutes += 60;
      }

      if (totalHours < 0) {
        totalHours += 24; // Assuming end time is next day if it's earlier than start time
      }

      return `${totalHours}h ${totalMinutes ? totalMinutes + 'm' : ''}`;
    } catch (error) {
      console.error("Error calculating work hours:", error);
      return "";
    }
  };

  return (
    <Layout>
      <Head title="Attendance Settings" />

      <PageSurface>
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Settings</h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure work hours, late thresholds, and weekend settings for each branch
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href={route('attendance.settings.employee-times')}>
                <Button variant="outline" size="sm" className="h-9 border-slate-200 text-slate-700 shadow-sm font-medium">
                  <User className="mr-1 h-4 w-4" />
                  Employee Times
                </Button>
              </Link>
              <Link href={route('attendance.settings.create')}>
                <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Super Admin Bulk Attendance Generator Toggle */}
        {isSuperAdminUser && (
          <Card className="shadow-xs border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/30 rounded-xl overflow-hidden mb-6">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-indigo-600/10 text-indigo-700 rounded-lg border border-indigo-200/60 shrink-0 mt-0.5 sm:mt-0">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Super Admin Bulk Attendance Generator
                    </h3>
                    {bulkEnabled ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold">
                        ON (Active)
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-semibold">
                        OFF (Hidden)
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    When enabled, Super Admin will see the <strong>"Bulk Attendance"</strong> generator button on the Daily Attendance page to quickly create attendance based on 1-month average present times. Turn this off if you want to temporarily hide the feature.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center shrink-0 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-700">
                  {bulkEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={bulkEnabled}
                  onCheckedChange={handleToggleBulk}
                  disabled={isUpdatingToggle}
                  aria-label="Toggle Bulk Attendance Generator"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop 2-Grid: Guard Shift & Multi-Day Movement Configuration Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1: Security Guard Shift */}
          <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">Security Guard Shift</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Day & night rotating shift windows</CardDescription>
                </div>
                <Badge variant="outline" className={guardShift.is_enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]' : 'bg-slate-50 text-slate-600 border-slate-200 text-[10px]'}>
                  {guardShift.is_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider pl-4">Shift</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Day</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Night</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Grace</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider text-right pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <TableCell className="pl-4 py-3">
                        <div className="flex items-center">
                          <Shield className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs text-slate-800">Guard Shift</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[90px]">{guardDesignationLabel}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium text-emerald-700">{formatTime(guardShift.day_start)}</span>
                        <span className="text-slate-400 mx-1">-</span>
                        <span className="font-medium text-red-600">{formatTime(guardShift.day_end)}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium text-indigo-700">{formatTime(guardShift.night_start)}</span>
                        <span className="text-slate-400 mx-1">-</span>
                        <span className="font-medium text-indigo-700">{formatTime(guardShift.night_end)}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                          {guardShift.grace_minutes}m
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={openGuardModal}
                          className="h-7 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 font-medium px-2.5"
                        >
                          <Edit className="mr-1 h-3.5 w-3.5" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Multi-Day Movement Permissions */}
          <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">Multi-Day Movement Permissions</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Allowed branches for multi-day movements</CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  {enabledBranchesCount} / {branchesList.length} Allowed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider pl-4">Feature</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Coverage</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Head Office</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider text-right pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <TableCell className="pl-4 py-3">
                        <div className="flex items-center">
                          <CalendarDays className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
                          <div>
                            <div className="font-semibold text-xs text-slate-800">Multi-Day Movement</div>
                            <div className="text-[10px] text-slate-500">Continuous on-duty</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <strong>{enabledBranchesCount}</strong> of {branchesList.length} branches
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Default: Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBranchFilter('');
                            setMultiDayModalOpen(true);
                          }}
                          className="h-7 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 font-medium px-2.5"
                        >
                          <Edit className="mr-1 h-3.5 w-3.5" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white lg:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">Device users and punch logs</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Missing people and old punch logs</CardDescription>
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                  {pendingDeviceCommands > 0 ? `Waiting ${pendingDeviceCommands}` : `${attlogKeepDays} days`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="h-10 pl-4 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Device</TableHead>
                      <TableHead className="h-10 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Logs</TableHead>
                      <TableHead className="h-10 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Machines</TableHead>
                      <TableHead className="h-10 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-b border-slate-100 hover:bg-slate-50">
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center">
                          <HardDrive className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                          <div className="text-xs font-semibold text-slate-800">Device sync</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">{attlogKeepDays} days</TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {devicePushes.length === 1 ? devicePushes[0].name : `${devicePushes.length} devices`}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={openDeviceModal}
                          className="h-7 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        >
                          <Edit className="mr-1 h-3.5 w-3.5" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row Grid: Multi-Branch Attendance Approval & Office open on a weekend (2 columns on desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
          {/* Card: Multi-Branch Attendance Permissions */}
          <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200/80 shrink-0">
                      <Network className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-800 leading-snug">
                        Multi-Branch Attendance Approval (মাল্টি-ব্রাঞ্চ হাজিরা অনুমোদন)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 line-clamp-1">
                        Allow staff from specific projects or employees to attend across multiple branches
                      </CardDescription>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                      {multiBranchPermissions.projects.length} Projects
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                      {multiBranchPermissions.employees.length} Staff
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMultiBranchModalOpen(true)}
                    className="h-7 text-xs text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 border-indigo-200 font-medium px-2.5"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Manage Permissions
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <Table className="min-w-[460px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10 backdrop-blur">
                      <TableHead className="h-9 pl-3 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Scope</TableHead>
                      <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Name</TableHead>
                      <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Approved Branches</TableHead>
                      <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Staff / Base</TableHead>
                      <TableHead className="h-9 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multiBranchPermissions.projects.length === 0 && multiBranchPermissions.employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-xs text-slate-400">
                          No multi-branch attendance permissions configured yet. Click <strong>"Manage Permissions"</strong> to configure projects (like ECCCP-Drought) or individual employees.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {multiBranchPermissions.projects.map((item) => (
                          <TableRow key={`proj-${item.project_id}`} className="border-b border-slate-100 hover:bg-slate-50">
                            <TableCell className="py-2.5 pl-3">
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium gap-1">
                                <Briefcase className="h-3 w-3" />
                                Project
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-800">
                              {item.project_name}
                              {item.project_code && <span className="text-[10px] text-slate-400 ml-1">({item.project_code})</span>}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex flex-wrap gap-1">
                                {item.branches.map((b) => (
                                  <Badge key={b.id} variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                    {b.name}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 font-medium">
                              {item.staff_count} Staff
                            </TableCell>
                            <TableCell className="pr-3 text-right space-x-1 whitespace-nowrap">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProjectBranches(item)}
                                className="h-7 text-xs text-indigo-700 hover:bg-indigo-50 px-1.5"
                                title="Edit Branches"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProjectBranches(item.project_id, item.project_name)}
                                className="h-7 text-xs text-rose-600 hover:bg-rose-50 px-1.5"
                                title="Remove Project Permissions"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {multiBranchPermissions.employees.map((item) => (
                          <TableRow key={`emp-${item.employee_id}`} className="border-b border-slate-100 hover:bg-slate-50">
                            <TableCell className="py-2.5 pl-3">
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium gap-1">
                                <User className="h-3 w-3" />
                                Staff
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-semibold text-slate-800">{item.name}</div>
                              <div className="text-[10px] text-slate-500">PIN: {item.pin || item.employee_code} {item.designation ? `• ${item.designation}` : ''}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex flex-wrap gap-1">
                                {item.branches.map((b) => (
                                  <Badge key={b.id} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                    {b.name}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {item.primary_branch?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="pr-3 text-right space-x-1 whitespace-nowrap">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEmployeeBranches(item)}
                                className="h-7 text-xs text-indigo-700 hover:bg-indigo-50 px-1.5"
                                title="Edit Branches"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEmployeeBranches(item.employee_id, item.name)}
                                className="h-7 text-xs text-rose-600 hover:bg-rose-50 px-1.5"
                                title="Remove Employee Permissions"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Card: Office open on a weekend */}
          <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/80 shrink-0">
                  <CalendarDays className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800 leading-snug">
                    Office open on a weekend
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 line-clamp-1">
                    Friday & Saturday stay weekends. Add open date only; attendance & movement work that day.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                {saturdayMissing && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Saturday is missing from weekend days. Put Saturday back in branch attendance settings, then add only the open date here. Otherwise every past Saturday shows as absent.
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="office-open-date" className="text-xs text-slate-500">Date</Label>
                    <Input
                      id="office-open-date"
                      type="date"
                      value={openDate}
                      onChange={(event) => setOpenDate(event.target.value)}
                      className="h-8 w-full sm:w-36 text-xs"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="office-open-note" className="text-xs text-slate-500">Note</Label>
                    <Input
                      id="office-open-note"
                      value={openNote}
                      onChange={(event) => setOpenNote(event.target.value)}
                      placeholder="e.g. Office open / Special work"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveOfficeOpenDate}
                    disabled={!openDate || savingOpenDate}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 shrink-0"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {savingOpenDate ? 'Saving...' : 'Add date'}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Configured Open Dates
                  </span>
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[10px]">
                    {officeOpenDates.length} Dates
                  </Badge>
                </div>
                {officeOpenDates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {officeOpenDates.map((row) => (
                      <div key={row.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                        <span className="font-medium text-slate-800">{format(new Date(row.date + 'T00:00:00'), 'dd MMM yyyy')}</span>
                        {row.note ? <span className="text-[11px] text-slate-500">({row.note})</span> : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-red-600 hover:bg-red-50 hover:text-red-700 ml-1"
                          onClick={() => removeOfficeOpenDate(row.id)}
                          title="Remove date"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No extra working dates added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={deviceModalOpen} onOpenChange={setDeviceModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Device users and punch logs</DialogTitle>
              <DialogDescription>
                Only an ID and name are added for people who are not on the machine. Punch logs older than the days below are removed. Names, fingerprints, and faces stay.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
              <div>
                <div className="text-xs font-semibold text-slate-800">Keep punch logs</div>
                <p className="text-[11px] text-slate-500">Older logs drop on the device. Users stay.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="attlogKeepDays"
                  type="number"
                  min={1}
                  max={90}
                  value={logKeepDays}
                  onChange={(event) => setLogKeepDays(Number(event.target.value))}
                  className="h-8 w-20 text-xs"
                  aria-label="Days of punch logs to keep on the device"
                />
                <span className="text-xs text-slate-500">days</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveLogKeepDays}
                  disabled={savingLogDays}
                  className="h-8 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                >
                  Save
                </Button>
              </div>
            </div>

            {(() => {
              const device = devicePushes.find((row) => row.id === activeDeviceId) ?? devicePushes[0];
              if (!device) {
                return <p className="text-xs text-slate-400">No attendance devices yet.</p>;
              }

              const employees = device.employees ?? [];
              const query = employeeQuery.trim().toLowerCase();
              const significant = query.replace(/^0+/, '');
              const visible = employees.filter((employee) => {
                if (!query) return true;
                const haystack = (employee.search || `${employee.name} ${employee.employee_code} ${employee.pin}`).toLowerCase();
                return haystack.includes(query) || (significant !== '' && significant !== query && haystack.includes(significant));
              });
              const selectable = visible.filter((employee) => employee.can_push !== false && !employee.on_device);
              const allSelectableChecked = selectable.length > 0 && selectable.every((employee) => selectedEmployeeIds.includes(employee.id));
              const lastContact = device.last_adms_at ? format(new Date(device.last_adms_at), 'dd MMM yyyy, h:mm a') : null;

              return (
                <div className="space-y-3">
                  {devicePushes.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {devicePushes.map((row) => (
                        <Button
                          key={row.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveDeviceId(row.id);
                            setSelectedEmployeeIds([]);
                          }}
                          className={`h-7 text-[11px] ${row.id === device.id ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : ''}`}
                        >
                          {row.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] leading-5 text-slate-500">
                    {employees.length} active employees of {device.branch_name || device.name}. Search by name or PIN, including leading zeros.
                    {device.known_users > 0 ? ` ${device.known_users} are already on the machine and cannot be selected.` : ''}
                    {device.adms_link !== 'connected' && (
                      <> The machine is offline{lastContact ? ` (last contact ${lastContact})` : ''}, so a push waits until it calls this server.</>
                    )}
                  </p>

                  <Input
                    value={employeeQuery}
                    onChange={(event) => setEmployeeQuery(event.target.value)}
                    placeholder="Search name or PIN"
                    className="h-8 text-xs"
                  />

                  <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80">
                          <TableHead className="h-9 w-10 pl-3">
                            <Checkbox
                              checked={allSelectableChecked}
                              onCheckedChange={(checked) => {
                                const ids = selectable.map((employee) => employee.id);
                                setSelectedEmployeeIds((current) => checked === true
                                  ? Array.from(new Set([...current, ...ids]))
                                  : current.filter((id) => !ids.includes(id)));
                              }}
                              aria-label="Select employees who are not on the device"
                              disabled={selectable.length === 0}
                            />
                          </TableHead>
                          <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Employee</TableHead>
                          <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Device ID</TableHead>
                          <TableHead className="h-9 pr-3 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visible.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-xs text-slate-400">
                              No employee matches that name or PIN.
                            </TableCell>
                          </TableRow>
                        ) : visible.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="py-2 pl-3">
                              <Checkbox
                                checked={employee.on_device || (employee.can_push !== false && selectedEmployeeIds.includes(employee.id))}
                                disabled={employee.on_device || employee.can_push === false}
                                onCheckedChange={(checked) => {
                                  setSelectedEmployeeIds((current) => checked === true
                                    ? Array.from(new Set([...current, employee.id]))
                                    : current.filter((id) => id !== employee.id));
                                }}
                                aria-label={`Select ${employee.name}`}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-slate-800">{employee.name}</span>
                                {employee.is_multi_branch && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-indigo-200 bg-indigo-50 text-indigo-700 font-normal">
                                    {employee.project_name ? `${employee.project_name} (Multi-Branch)` : 'Multi-Branch'}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{employee.employee_code}</div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">{employee.pin}</TableCell>
                            <TableCell className="pr-3 text-[11px]">
                              {employee.on_device ? (
                                <span className="text-emerald-700">On device</span>
                              ) : employee.can_push === false ? (
                                <span className="text-slate-400">No device number</span>
                              ) : employee.queued ? (
                                <span className="text-amber-700">Waiting</span>
                              ) : (
                                <span className="text-slate-500">Not on device</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDeviceModalOpen(false)} className="h-8 text-xs">
                      Done
                    </Button>
                    <Button
                      type="button"
                      onClick={() => pushSelectedUsers(device)}
                      disabled={!device.adms_enabled || selectedEmployeeIds.length === 0 || pushingId === device.id}
                      className="h-8 bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-700"
                    >
                      Push selected{selectedEmployeeIds.length > 0 ? ` (${selectedEmployeeIds.length})` : ''}
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Dialog open={guardModalOpen} onOpenChange={setGuardModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update security guard shift</DialogTitle>
              <DialogDescription>
                Day is morning to evening. Night starts in the evening and ends the next morning. The shift is chosen from the punch time.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="text-xs font-semibold text-slate-700">Guard shift</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{guardForm.is_enabled ? 'On' : 'Off'}</span>
                  <Switch
                    checked={guardForm.is_enabled}
                    onCheckedChange={(checked) => setGuardForm((current) => ({ ...current, is_enabled: checked }))}
                    aria-label="Enable security guard shifts"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Day shift</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="guard-day-start" className="text-xs text-slate-500">Start</Label>
                      <Input id="guard-day-start" type="time" value={guardForm.day_start} onChange={(event) => setGuardForm((current) => ({ ...current, day_start: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="guard-day-end" className="text-xs text-slate-500">End</Label>
                      <Input id="guard-day-end" type="time" value={guardForm.day_end} onChange={(event) => setGuardForm((current) => ({ ...current, day_end: event.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Night shift</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="guard-night-start" className="text-xs text-slate-500">Start</Label>
                      <Input id="guard-night-start" type="time" value={guardForm.night_start} onChange={(event) => setGuardForm((current) => ({ ...current, night_start: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="guard-night-end" className="text-xs text-slate-500">End next morning</Label>
                      <Input id="guard-night-end" type="time" value={guardForm.night_end} onChange={(event) => setGuardForm((current) => ({ ...current, night_end: event.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="guard-grace" className="text-xs text-slate-500">Grace (minutes earlier or later)</Label>
                  <Input
                    id="guard-grace"
                    type="number"
                    min={0}
                    max={180}
                    value={guardForm.grace_minutes}
                    onChange={(event) => setGuardForm((current) => ({ ...current, grace_minutes: Number(event.target.value) }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Count weekend punches</p>
                    <p className="text-[11px] text-slate-500">Friday and Saturday punches stay.</p>
                  </div>
                  <Switch
                    checked={guardForm.work_on_weekend}
                    onCheckedChange={(checked) => setGuardForm((current) => ({ ...current, work_on_weekend: checked }))}
                    aria-label="Count security guard weekend punches"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs text-slate-500">Designations</Label>
                  {guardForm.uses_name_match && (
                    <span className="text-[11px] text-slate-500">Matched from the title Security Guard until you save.</span>
                  )}
                </div>
                <Input
                  value={designationQuery}
                  onChange={(event) => setDesignationQuery(event.target.value)}
                  placeholder="Search designation"
                />
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {filteredDesignations.length > 0 ? filteredDesignations.map((designation) => (
                    <label key={designation.id} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 cursor-pointer">
                      <Checkbox
                        checked={guardForm.designation_ids.includes(designation.id)}
                        onCheckedChange={(checked) => toggleGuardDesignation(designation.id, checked === true)}
                      />
                      <span>{designation.name}</span>
                    </label>
                  )) : (
                    <p className="px-3 py-4 text-xs text-slate-500">No designations found.</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGuardModalOpen(false)} disabled={isSavingGuard}>
                Cancel
              </Button>
              <Button type="button" onClick={saveGuardShift} disabled={isSavingGuard} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSavingGuard ? 'Saving...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Multi-Day Movement Permissions Modal */}
        <Dialog open={multiDayModalOpen} onOpenChange={setMultiDayModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/80">
                  <CalendarDays className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Multi-Day Movement Permissions (মাল্টি-ডে মুভমেন্ট অনুমতি)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Select which branches can create multi-day movements. Head Office is enabled by default.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Modal Controls: Search & Select All / Deselect All */}
            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Search branch name..."
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 text-xs py-1">
                  {enabledBranchesCount} / {branchesList.length} Enabled
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAllMultiDay(true)}
                  disabled={isBulkUpdating}
                  className="h-8 text-xs bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border-emerald-200 font-medium"
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAllMultiDay(false)}
                  disabled={isBulkUpdating}
                  className="h-8 text-xs bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 border-rose-200 font-medium"
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Modal Branch List Grid */}
            <div className="p-5 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {branchesList
                  .filter((b) => b.name.toLowerCase().includes(branchFilter.trim().toLowerCase()))
                  .map((branch) => {
                    const isEnabled = Boolean(branch.allow_multi_day_movement ?? branch.is_head_office);
                    const isHO = Boolean(branch.is_head_office);
                    return (
                      <div
                        key={branch.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-colors ${
                          isEnabled
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-semibold text-slate-800 truncate" title={branch.name}>
                            {branch.name}
                          </span>
                          {isHO ? (
                            <span className="text-[10px] text-emerald-700 font-medium">Head Office (Default)</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Branch</span>
                          )}
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleMultiDay(branch.id, isEnabled)}
                          disabled={updatingBranchId === branch.id || isBulkUpdating}
                          aria-label={`Toggle multi-day movement for ${branch.name}`}
                        />
                      </div>
                    );
                  })}
              </div>
              {branchesList.filter((b) => b.name.toLowerCase().includes(branchFilter.trim().toLowerCase())).length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No branches found matching "{branchFilter}"
                </div>
              )}
            </div>

            <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Button
                type="button"
                onClick={() => setMultiDayModalOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-medium px-4"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Multi-Branch Attendance Approval Modal */}
        <Dialog open={multiBranchModalOpen} onOpenChange={setMultiBranchModalOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200/80">
                  <Network className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Multi-Branch Attendance Permissions (মাল্টি-ব্রাঞ্চ হাজিরা অনুমতি)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Configure which projects (e.g. ECCCP-Drought) or individual staff can record attendance across multiple branches.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeMultiBranchTab} onValueChange={(val) => setActiveMultiBranchTab(val as any)} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 pt-3 border-b border-slate-100 bg-slate-50/50">
                <TabsList className="bg-slate-200/70 p-1">
                  <TabsTrigger value="project" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs">
                    <Briefcase className="w-3.5 h-3.5" />
                    Project Permissions (প্রকল্প ভিত্তিক)
                  </TabsTrigger>
                  <TabsTrigger value="employee" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
                    <User className="w-3.5 h-3.5" />
                    Employee Permissions (কর্মী ভিত্তিক)
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <TabsContent value="project" className="m-0 space-y-4">
                  <form onSubmit={handleSaveProjectBranches} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {selectedProjectId ? 'Edit Project Allowed Branches' : 'Add Multi-Branch Approval for a Project'}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          All active staff under this project will automatically be permitted to give attendance at all selected branches.
                        </p>
                      </div>
                      {selectedProjectId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProjectId('');
                            setSelectedProjectBranchIds([]);
                          }}
                          className="h-7 text-[11px] text-slate-500 hover:text-slate-700"
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="project-select" className="text-xs font-semibold text-slate-700">
                        Select Project (প্রকল্প নির্বাচন করুন) <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        id="project-select"
                        value={selectedProjectId}
                        onChange={(e) => {
                          const pId = Number(e.target.value) || '';
                          setSelectedProjectId(pId);
                          if (pId) {
                            const existing = multiBranchPermissions.projects.find((p) => p.project_id === pId);
                            if (existing) {
                              setSelectedProjectBranchIds(existing.branches.map((b) => b.id));
                            }
                          }
                        }}
                        className="w-full h-9 text-xs rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose a Project (e.g. ECCCP-Drought) --</option>
                        {multiBranchPermissions.allProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.code ? `(${p.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Label className="text-xs font-semibold text-slate-700">
                          Select Allowed Branches (অনুমোদিত শাখাসমূহ নির্বাচন করুন) <span className="text-rose-500">*</span>
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProjectBranchIds(branches.map((b) => b.id))}
                            className="h-6 text-[10px] px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProjectBranchIds([])}
                            className="h-6 text-[10px] px-2 text-slate-600 hover:bg-slate-100"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>

                      <Input
                        placeholder="Filter branches by name..."
                        value={projectBranchFilter}
                        onChange={(e) => setProjectBranchFilter(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                        {branches
                          .filter((b) => b.name.toLowerCase().includes(projectBranchFilter.trim().toLowerCase()))
                          .map((branch) => {
                            const isChecked = selectedProjectBranchIds.includes(branch.id);
                            return (
                              <label
                                key={branch.id}
                                className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-medium' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    setSelectedProjectBranchIds((prev) =>
                                      checked === true ? [...prev, branch.id] : prev.filter((id) => id !== branch.id)
                                    );
                                  }}
                                />
                                <span className="truncate">{branch.name}</span>
                              </label>
                            );
                          })}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Selected: <strong>{selectedProjectBranchIds.length}</strong> of {branches.length} branches
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={!selectedProjectId || selectedProjectBranchIds.length === 0 || isSavingProjectBranches}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4"
                    >
                      {isSavingProjectBranches ? 'Saving...' : 'Save Project Branches (সংরক্ষণ করুন)'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="employee" className="m-0 space-y-4">
                  <form onSubmit={handleSaveEmployeeBranches} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {selectedEmployeeId ? 'Edit Employee Extra Branches' : 'Add Multi-Branch Approval for Specific Staff'}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Allow this individual employee to give attendance at these additional branches.
                        </p>
                      </div>
                      {selectedEmployeeId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeId('');
                            setSelectedEmployeeBranchIds([]);
                          }}
                          className="h-7 text-[11px] text-slate-500 hover:text-slate-700"
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="employee-select" className="text-xs font-semibold text-slate-700">
                        Select Employee (কর্মী নির্বাচন করুন) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="Type to filter employees by name or PIN..."
                        value={employeeSearchFilter}
                        onChange={(e) => setEmployeeSearchFilter(e.target.value)}
                        className="h-8 text-xs bg-white mb-1.5"
                      />
                      <select
                        id="employee-select"
                        value={selectedEmployeeId}
                        onChange={(e) => {
                          const eId = Number(e.target.value) || '';
                          setSelectedEmployeeId(eId);
                          if (eId) {
                            const existing = multiBranchPermissions.employees.find((x) => x.employee_id === eId);
                            if (existing) {
                              setSelectedEmployeeBranchIds(existing.branches.map((b) => b.id));
                            }
                          }
                        }}
                        className="w-full h-9 text-xs rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- Choose Employee --</option>
                        {multiBranchPermissions.allEmployees
                          .filter((e) => {
                            if (!employeeSearchFilter) return true;
                            const term = employeeSearchFilter.toLowerCase();
                            return (
                              e.name.toLowerCase().includes(term) ||
                              e.employee_code.toLowerCase().includes(term) ||
                              (e.pin && e.pin.toLowerCase().includes(term))
                            );
                          })
                          .slice(0, 100)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} (PIN: {e.pin || e.employee_code}) - Base: {e.branch_name || 'N/A'}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Label className="text-xs font-semibold text-slate-700">
                          Select Allowed Extra Branches (অনুমোদিত অতিরিক্ত শাখাসমূহ) <span className="text-rose-500">*</span>
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEmployeeBranchIds(branches.map((b) => b.id))}
                            className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEmployeeBranchIds([])}
                            className="h-6 text-[10px] px-2 text-slate-600 hover:bg-slate-100"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>

                      <Input
                        placeholder="Filter branches by name..."
                        value={employeeBranchFilter}
                        onChange={(e) => setEmployeeBranchFilter(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                        {branches
                          .filter((b) => b.name.toLowerCase().includes(employeeBranchFilter.trim().toLowerCase()))
                          .map((branch) => {
                            const isChecked = selectedEmployeeBranchIds.includes(branch.id);
                            return (
                              <label
                                key={branch.id}
                                className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-medium' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    setSelectedEmployeeBranchIds((prev) =>
                                      checked === true ? [...prev, branch.id] : prev.filter((id) => id !== branch.id)
                                    );
                                  }}
                                />
                                <span className="truncate">{branch.name}</span>
                              </label>
                            );
                          })}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Selected: <strong>{selectedEmployeeBranchIds.length}</strong> branches
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={!selectedEmployeeId || selectedEmployeeBranchIds.length === 0 || isSavingEmployeeBranches}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
                    >
                      {isSavingEmployeeBranches ? 'Saving...' : 'Save Employee Branches (সংরক্ষণ করুন)'}
                    </Button>
                  </form>
                </TabsContent>
              </div>

              <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  onClick={() => setMultiBranchModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white h-8 text-xs font-medium px-4"
                >
                  Done
                </Button>
              </DialogFooter>
            </Tabs>
          </DialogContent>
        </Dialog>


        {/* Settings Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-semibold text-slate-800">Branch Attendance Configurations</CardTitle>
            <CardDescription className="text-xs">
              Manage attendance parameters for each branch of your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Branch</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Work Hours</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Late Threshold</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Half Day Hours</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Weekend Days</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.length > 0 ? (
                    settings.map((setting) => (
                      <TableRow key={setting.id} className="hover:bg-slate-50 transition-colors group border-b border-slate-100">
                        <TableCell className="pl-6">
                          <div className="flex items-center">
                            <Building className="mr-2 h-4 w-4 text-emerald-500" />
                            <span className="font-semibold text-xs text-slate-800">{setting.branch.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-xs">
                              <AlarmClock className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                              <span className="font-medium text-green-700">
                                {formatTime(setting.work_start_time)}
                              </span>
                              <span className="mx-1.5 text-slate-400">to</span>
                              <span className="font-medium text-red-700">
                                {formatTime(setting.work_end_time)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center pl-5">
                              <Timer className="mr-1 h-3 w-3" />
                              <span>Duration: {calculateWorkHours(setting.work_start_time, setting.work_end_time)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center scale-90 origin-left">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {setting.late_threshold_minutes} min
                            </Badge>
                            <span className="ml-2 text-xs text-slate-500">
                              Grace period
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center scale-90 origin-left">
                            <BarChart2 className="mr-1.5 h-3.5 w-3.5 text-yellow-500" />
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              &lt; {setting.half_day_hours} hours
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-purple-500" />
                            <div className="flex flex-wrap gap-1 scale-90 origin-left">
                              {(() => {
                                let weekendDaysArray: number[] = [];
                                try {
                                  if (typeof setting.weekend_days === 'string') {
                                    let jsonString = setting.weekend_days;
                                    if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
                                      jsonString = jsonString.slice(1, -1);
                                    }
                                    jsonString = jsonString.replace(/\\"/g, '"');
                                    weekendDaysArray = JSON.parse(jsonString);
                                  } else {
                                    weekendDaysArray = setting.weekend_days as number[];
                                  }
                                } catch (error) {
                                  return (
                                    <div className="flex items-center text-red-500">
                                      <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                      <span>Error parsing data</span>
                                    </div>
                                  );
                                }

                                return weekendDaysArray.map((day: number) => (
                                  <Badge key={day} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {getWeekdayName(day)}
                                  </Badge>
                                ));
                              })()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => router.get(route('attendance.settings.edit', setting.id))}
                              className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                              title="Edit Settings"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(setting.id)}
                              className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                              title="Delete Settings"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <h3 className="font-medium">No attendance settings found</h3>
                        <p className="text-sm mt-1">
                          Click "Add Settings" to create new settings for a branch.
                        </p>
                        <Link href={route('attendance.settings.create')}>
                          <Button className="mt-4" variant="outline">
                            <Plus className="mr-1 h-4 w-4" />
                            Add Settings
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
      </PageSurface>
    </Layout>
  );
}
