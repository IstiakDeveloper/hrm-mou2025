import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, Building2, Map, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PageSurface } from '@/components/page-surface';

interface Designation {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  employee_id?: string | null;
  pin?: string | null;
  name_en?: string | null;
  full_name_en?: string | null;
  designation: Designation | null;
  photo: string | null;
}

function employeeDisplayName(employee: Employee): string {
  const fn = (employee.full_name_en || '').trim();
  if (fn) return fn;
  const ne = (employee.name_en || '').trim();
  if (ne) return ne;
  const fl = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  return fl || '—';
}

function employeeDisplayPin(employee: Employee): string {
  const raw = employee.pin ?? employee.employee_id;
  const s = raw != null ? String(raw).trim() : '';
  return s || '—';
}

function employeeMatchesSearch(employee: Employee, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  const name = employeeDisplayName(employee).toLowerCase();
  const pin = employeeDisplayPin(employee).toLowerCase();
  const id = (employee.employee_id || '').toLowerCase();
  const ne = (employee.name_en || '').toLowerCase();
  return (
    name.includes(t) ||
    pin.includes(t) ||
    id.includes(t) ||
    ne.includes(t) ||
    `${employee.first_name || ''} ${employee.last_name || ''}`.toLowerCase().includes(t)
  );
}

function roleBadgeShort(roleTitle: string): string {
  if (roleTitle.includes('Head Office')) return 'HO';
  if (roleTitle.includes('Branch')) return 'Br';
  if (roleTitle.includes('Regional')) return 'RO';
  if (roleTitle.includes('Zone')) return 'Z';
  return roleTitle.length > 6 ? `${roleTitle.slice(0, 5)}…` : roleTitle;
}

interface Branch {
  id: number;
  name: string;
  branch_code?: string | null;
  is_head_office: boolean;
  head_employee: Employee | null;
  employees: Employee[];
  employees_count?: number;
}

interface RegionalOffice {
  id: number;
  name: string;
  regional_manager: Employee | null;
  branches: Branch[];
  employee_count?: number;
}

interface Zone {
  id: number;
  name: string;
  zone_manager: Employee | null;
  regional_offices: RegionalOffice[];
  employee_count?: number;
}

interface OrganizationChartProps {
  headOffice: Branch | null;
  zones: Zone[];
}

type EmployeeCardOptions = {
  /** Head office only: larger card, designation + ID, multi-column grid for staff. */
  comfortable?: boolean;
};

function fmtCount(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString();
}

export default function OrganizationChart({ headOffice, zones }: OrganizationChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZoneId, setFilterZoneId] = useState('');
  const [filterRegionalId, setFilterRegionalId] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');

  const zoneCount = zones?.length ?? 0;
  const totalUnderZones = useMemo(
    () => zones.reduce((sum, z) => sum + (z.employee_count ?? 0), 0),
    [zones],
  );

  const regionOptions = useMemo(() => {
    const rows: { id: number; name: string; zoneId: number }[] = [];
    for (const z of zones || []) {
      if (filterZoneId && String(z.id) !== filterZoneId) continue;
      for (const ro of z.regional_offices || []) {
        rows.push({ id: ro.id, name: ro.name, zoneId: z.id });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [zones, filterZoneId]);

  const branchOptions = useMemo(() => {
    const rows: { id: number; name: string; regionalId: number; zoneId: number }[] = [];
    for (const z of zones || []) {
      if (filterZoneId && String(z.id) !== filterZoneId) continue;
      for (const ro of z.regional_offices || []) {
        if (filterRegionalId && String(ro.id) !== filterRegionalId) continue;
        for (const b of ro.branches || []) {
          if (b.is_head_office) continue;
          rows.push({ id: b.id, name: b.name, regionalId: ro.id, zoneId: z.id });
        }
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [zones, filterZoneId, filterRegionalId]);

  const filteredZones = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const hasSearch = q.length > 0;

    const branchStructOk = (b: Branch, regionId: number, zoneId: number) => {
      if (filterBranchId && String(b.id) !== filterBranchId) return false;
      if (filterRegionalId && String(regionId) !== filterRegionalId) return false;
      if (filterZoneId && String(zoneId) !== filterZoneId) return false;
      return true;
    };

    const branchSearchOk = (b: Branch) => {
      if (!hasSearch) return true;
      const all = [b.head_employee, ...(b.employees || [])].filter(Boolean) as Employee[];
      return all.some((e) => employeeMatchesSearch(e, q));
    };

    const regionStructOk = (ro: RegionalOffice, zoneId: number) => {
      if (filterRegionalId && String(ro.id) !== filterRegionalId) return false;
      if (filterZoneId && String(zoneId) !== filterZoneId) return false;
      return true;
    };

    const regionSearchOk = (ro: RegionalOffice) => {
      if (!hasSearch) return true;
      if (ro.regional_manager && employeeMatchesSearch(ro.regional_manager, q)) return true;
      return (ro.branches || []).some((b) => branchSearchOk(b));
    };

    const zoneStructOk = (z: Zone) => {
      if (filterZoneId && String(z.id) !== filterZoneId) return false;
      return true;
    };

    const zoneSearchOk = (z: Zone) => {
      if (!hasSearch) return true;
      if (z.zone_manager && employeeMatchesSearch(z.zone_manager, q)) return true;
      return (z.regional_offices || []).some((ro) => regionSearchOk(ro));
    };

    const out: Zone[] = [];

    for (const zone of zones || []) {
      if (!zoneStructOk(zone)) continue;
      if (!zoneSearchOk(zone)) continue;

      const nextRegions: RegionalOffice[] = [];
      for (const ro of zone.regional_offices || []) {
        if (!regionStructOk(ro, zone.id)) continue;
        if (!regionSearchOk(ro)) continue;

        const nextBranches = (ro.branches || [])
          .filter((b) => branchStructOk(b, ro.id, zone.id))
          .filter((b) => !hasSearch || branchSearchOk(b));

        const rm = ro.regional_manager;
        const rmLine =
          !!rm && (!hasSearch || employeeMatchesSearch(rm, q));
        if (nextBranches.length === 0 && !rmLine) continue;

        nextRegions.push({ ...ro, branches: nextBranches });
      }

      const zm = zone.zone_manager;
      const zmLine = !!zm && (!hasSearch || employeeMatchesSearch(zm, q));
      if (nextRegions.length === 0 && !zmLine) continue;

      out.push({ ...zone, regional_offices: nextRegions });
    }

    return out;
  }, [zones, searchTerm, filterZoneId, filterRegionalId, filterBranchId]);

  const showHeadOffice = useMemo(() => {
    if (!headOffice) return false;
    if (filterZoneId || filterRegionalId) return false;
    if (filterBranchId && String(headOffice.id) !== filterBranchId) return false;

    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const all = [headOffice.head_employee, ...(headOffice.employees || [])].filter(Boolean) as Employee[];
    return all.some((e) => employeeMatchesSearch(e, q));
  }, [headOffice, searchTerm, filterZoneId, filterRegionalId, filterBranchId]);

  const hasActiveFilters =
    filterZoneId !== '' || filterRegionalId !== '' || filterBranchId !== '' || searchTerm.trim() !== '';

  const selectClass =
    'h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const initialsForEmployee = (employee: Employee) => {
    const fromNames = getInitials(employee.first_name || undefined, employee.last_name || undefined);
    if (fromNames !== 'U') return fromNames;
    const label = employeeDisplayName(employee);
    if (label && label !== '—') {
      const parts = label.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return label.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const renderEmployee = (
    employee: Employee,
    roleTitle: string,
    isHead = false,
    options?: EmployeeCardOptions,
  ) => {
    if (!employee) return null;
    const term = searchTerm.trim().toLowerCase();
    if (!employeeMatchesSearch(employee, term)) return null;

    const label = employeeDisplayName(employee);
    const pinLabel = employeeDisplayPin(employee);
    const comfortable = options?.comfortable === true;

    if (comfortable) {
      return (
        <Link
          href={route('employees.show', employee.id)}
          title={`${label} · ${pinLabel}`}
          className={`flex min-w-0 items-start gap-2 rounded-lg border p-2 transition-colors ${
            isHead
              ? 'border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50'
              : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/80'
          }`}
        >
          <Avatar className={`h-8 w-8 shrink-0 border ${isHead ? 'border-emerald-200' : 'border-slate-200'}`}>
            {employee.photo ? (
              <AvatarImage src={`/storage/${employee.photo}`} alt={label} />
            ) : (
              <AvatarFallback
                className={
                  isHead ? 'bg-emerald-100 text-[10px] text-emerald-800' : 'bg-slate-100 text-[10px] text-slate-600'
                }
              >
                {initialsForEmployee(employee)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs font-semibold text-slate-800">{label}</span>
              {isHead && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {roleTitle}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-500">
              <span className="min-w-0 truncate">{employee.designation?.name || '—'}</span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500">
                ID: {pinLabel}
              </span>
            </div>
          </div>
        </Link>
      );
    }

    return (
      <Link
        href={route('employees.show', employee.id)}
        title={`${label} · ${pinLabel}`}
        className={`flex w-full min-w-0 items-start gap-1.5 rounded-md border px-1 py-0.5 transition-colors ${
          isHead
            ? 'border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-50'
            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/90'
        }`}
      >
        <Avatar className={`mt-px h-6 w-6 shrink-0 border ${isHead ? 'border-emerald-200' : 'border-slate-200'}`}>
          {employee.photo ? (
            <AvatarImage src={`/storage/${employee.photo}`} alt={label} />
          ) : (
            <AvatarFallback
              className={
                isHead ? 'bg-emerald-100 text-[9px] text-emerald-800' : 'bg-slate-100 text-[9px] text-slate-600'
              }
            >
              {initialsForEmployee(employee)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-1">
            <p className="min-w-0 flex-1 break-words text-left text-[11px] font-semibold leading-snug text-slate-800">
              {label}
            </p>
            {isHead && (
              <span
                title={roleTitle}
                className="shrink-0 rounded bg-emerald-200/80 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-emerald-900"
              >
                {roleBadgeShort(roleTitle)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[9px] tabular-nums text-slate-600">{pinLabel}</p>
        </div>
      </Link>
    );
  };

  const branchHeadcount = (branch: Branch) =>
    branch.employees_count ?? (branch.employees?.length ?? 0);

  const renderBranch = (branch: Branch) => {
    const allEmployees = branch.employees || [];
    const headEmpId = branch.head_employee?.id;
    const staffRaw = allEmployees.filter((e) => e.id !== headEmpId);
    const qTrim = searchTerm.trim().toLowerCase();
    const staff =
      qTrim.length > 0
        ? staffRaw.filter((e) => employeeMatchesSearch(e, qTrim))
        : staffRaw;
    const count = branchHeadcount(branch);

    const displayName = (branch.name || '').trim() || '—';
    const code = (branch.branch_code || '').trim();
    const headShown =
      !!branch.head_employee &&
      (!qTrim.length || employeeMatchesSearch(branch.head_employee, qTrim));

    return (
      <div
        className={`flex min-w-0 flex-col overflow-hidden rounded-lg border ${
          branch.is_head_office ? 'border-indigo-200 bg-white' : 'border-slate-200 bg-white'
        }`}
      >
        <div
          className={`flex min-w-0 items-start gap-2 border-b px-2 py-1.5 ${
            branch.is_head_office ? 'border-indigo-100 bg-indigo-50/60' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
              branch.is_head_office ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Building2 className={`${branch.is_head_office ? 'h-3.5 w-3.5' : 'h-3 w-3'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={`whitespace-normal break-words text-left text-xs font-semibold leading-snug ${
                branch.is_head_office ? 'text-indigo-950' : 'text-slate-800'
              }`}
            >
              {displayName}
              {branch.is_head_office && (
                <span className="ml-1 block font-normal text-[10px] text-indigo-600/90 sm:inline">
                  (Head Office)
                </span>
              )}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] leading-none text-slate-500">
              <span className="font-mono tabular-nums">{fmtCount(count)}</span>
              <span className="text-slate-300">·</span>
              <span>staff</span>
              {code ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-slate-400">{code}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`min-w-0 space-y-1 border-t border-slate-100/80 bg-slate-50/40 ${
            branch.is_head_office ? 'p-2' : 'p-1.5'
          }`}
        >
          {headShown &&
            renderEmployee(
              branch.head_employee,
              branch.is_head_office ? 'Head Office Manager' : 'Branch Manager',
              true,
              branch.is_head_office ? { comfortable: true } : undefined,
            )}

          {staff.length > 0 &&
            (branch.is_head_office ? (
              <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {staff.map((emp) => (
                  <div key={emp.id} className="min-w-0">
                    {renderEmployee(emp, 'Staff', false, { comfortable: true })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex w-full min-w-0 flex-col gap-1">
                {staff.map((emp) => (
                  <div key={emp.id} className="w-full min-w-0">
                    {renderEmployee(emp, 'Staff')}
                  </div>
                ))}
              </div>
            ))}

          {staff.length === 0 && !headShown && (
            <div className="flex flex-col items-center justify-center py-4 text-[10px] text-slate-400">
              <Users className="mb-1 h-5 w-5 opacity-25" />
              {qTrim.length > 0 ? 'No matching employees' : 'No employees'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRegion = (region: RegionalOffice) => {
    const branchCount = region.branches?.length ?? 0;

    return (
      <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-sky-200/90 bg-white shadow-sm">
        <div className="flex min-w-0 items-start gap-2 border-b border-sky-100 bg-sky-50/70 px-2 py-1.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="whitespace-normal break-words text-xs font-semibold leading-snug text-sky-950">
              {region.name}
            </h3>
            <p className="mt-0.5 text-[10px] leading-tight text-sky-800/80">
              <span className="font-mono tabular-nums text-slate-600">{fmtCount(region.employee_count)}</span>
              {' · '}
              {branchCount} branch{branchCount === 1 ? '' : 'es'}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5 bg-slate-50/30 p-1.5">
          {region.regional_manager && (
            <div className="mb-1">{renderEmployee(region.regional_manager, 'Regional Manager', true)}</div>
          )}

          {region.branches && region.branches.length > 0 ? (
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              {region.branches.map((branch) => (
                <div key={branch.id} className="min-w-0">
                  {renderBranch(branch)}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-[10px] text-slate-400">No branches</div>
          )}
        </div>
      </div>
    );
  };

  const renderZone = (zone: Zone) => {
    const roCount = zone.regional_offices?.length ?? 0;

    return (
      <div className="flex min-w-0 w-full flex-col overflow-hidden rounded-xl border border-emerald-200/90 bg-white shadow-sm">
        <div className="flex min-w-0 flex-wrap items-start gap-2 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Map className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="whitespace-normal break-words text-sm font-bold leading-snug text-emerald-950">
              {zone.name}{' '}
              <span className="font-mono text-xs font-semibold text-emerald-700/90">
                ({fmtCount(zone.employee_count)})
              </span>
            </h2>
            <p className="text-[10px] font-medium text-emerald-800/70">
              {roCount} regional office{roCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5 bg-slate-50/40 p-2">
          {zone.zone_manager && (
            <div className="max-w-full min-w-0 sm:max-w-lg">{renderEmployee(zone.zone_manager, 'Zone Manager', true)}</div>
          )}

          {zone.regional_offices && zone.regional_offices.length > 0 ? (
            <div className="grid min-w-0 grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
              {zone.regional_offices.map((region) => (
                <div key={region.id} className="min-w-0">
                  {renderRegion(region)}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
              No regional offices in this zone
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <Head title="Organization Chart" />

      <PageSurface>
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Organization chart</h1>
              <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                Zones, regional offices, branches — headcounts in parentheses.{' '}
                {zoneCount > 0 && (
                  <span className="text-slate-600">
                    {zoneCount} zone{zoneCount === 1 ? '' : 's'}, {fmtCount(totalUnderZones)} staff under zones.
                  </span>
                )}
              </p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or PIN…"
                className="h-9 border-slate-200 pl-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 md:flex-row md:flex-wrap md:items-end">
            <div className="grid w-full gap-3 sm:grid-cols-3 md:flex-1 md:grid-cols-3">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="org-filter-zone" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Zone
                </Label>
                <select
                  id="org-filter-zone"
                  className={selectClass}
                  value={filterZoneId}
                  onChange={(e) => {
                    setFilterZoneId(e.target.value);
                    setFilterRegionalId('');
                    setFilterBranchId('');
                  }}
                >
                  <option value="">All zones</option>
                  {(zones || []).map((z) => (
                    <option key={z.id} value={String(z.id)}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="org-filter-ro" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Regional office
                </Label>
                <select
                  id="org-filter-ro"
                  className={selectClass}
                  value={filterRegionalId}
                  disabled={regionOptions.length === 0}
                  onChange={(e) => {
                    setFilterRegionalId(e.target.value);
                    setFilterBranchId('');
                  }}
                >
                  <option value="">All regional offices</option>
                  {regionOptions.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="org-filter-branch" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Branch
                </Label>
                <select
                  id="org-filter-branch"
                  className={selectClass}
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                >
                  <option value="">All branches</option>
                  {branchOptions.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 border-slate-300"
                onClick={() => {
                  setSearchTerm('');
                  setFilterZoneId('');
                  setFilterRegionalId('');
                  setFilterBranchId('');
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {headOffice && showHeadOffice && (
            <section>
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Corporate</h2>
              {renderBranch(headOffice)}
            </section>
          )}

          <section>
            <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Zones & regions</h2>
            {filteredZones && filteredZones.length > 0 ? (
              <div className="flex w-full min-w-0 flex-col gap-3">
                {filteredZones.map((zone) => (
                  <div key={zone.id} className="w-full min-w-0">
                    {renderZone(zone)}
                  </div>
                ))}
              </div>
            ) : zones && zones.length > 0 ? (
              <Card className="border border-amber-200/80 bg-amber-50/40">
                <CardContent className="p-6 text-center text-sm text-amber-950">
                  No structure matches the current search and filters. Try clearing filters or a different
                  keyword (name or PIN).
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-slate-300 bg-slate-50/80">
                <CardContent className="p-8 text-center">
                  <Map className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">No zones</p>
                  <p className="mt-1 text-xs text-slate-500">Define zones and regional structure first.</p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </PageSurface>
    </Layout>
  );
}
