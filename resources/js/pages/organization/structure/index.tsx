import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import {
    Building2,
    ChevronDown,
    ChevronRight,
    Edit,
    GitBranch,
    Map as MapIcon,
    MapPin,
    Plus,
    Search,
    List,
} from 'lucide-react';

interface Manager extends EmployeeNameFields {
    id: number;
    employee_id: string;
}

interface BranchNode {
    id: number;
    name: string;
    branch_code: string;
    is_active: boolean;
    regional_office_id: number | null;
}

interface RegionalOfficeNode {
    id: number;
    zone_id: number;
    name: string;
    code: string;
    is_active: boolean;
    regional_manager?: Manager | null;
    branches: BranchNode[];
}

interface ZoneNode {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    zone_manager?: Manager | null;
    regional_offices: RegionalOfficeNode[];
}

interface ZoneOption {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
}

interface RegionalOfficeOption {
    id: number;
    zone_id: number;
    name: string;
    code: string;
    is_active: boolean;
    zone?: { id: number; name: string; code: string } | null;
}

interface Props {
    headOffice: BranchNode | null;
    zones: ZoneNode[];
    unassignedBranches: BranchNode[];
    zoneOptions: ZoneOption[];
    regionalOfficeOptions: RegionalOfficeOption[];
    filters: { search?: string };
    can: {
        viewBranches: boolean;
        viewZones: boolean;
        viewRegionalOffices: boolean;
        editBranches: boolean;
        editRegionalOffices: boolean;
        editZones: boolean;
        createBranch: boolean;
        createRegionalOffice: boolean;
        createZone: boolean;
    };
}

const selectClass =
    'h-8 w-full min-w-[200px] max-w-xs rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:outline-none';

function StatusBadge({ active }: { active: boolean }) {
    return active ? (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
    ) : (
        <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
    );
}

export default function OrganizationStructureIndex({
    headOffice,
    zones,
    unassignedBranches,
    zoneOptions,
    regionalOfficeOptions,
    filters,
    can,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [expandedZones, setExpandedZones] = useState<Record<number, boolean>>(() =>
        Object.fromEntries(zones.map((z) => [z.id, true])),
    );
    const [expandedRegions, setExpandedRegions] = useState<Record<number, boolean>>({});

    const regionalOfficesByZone = useMemo(() => {
        const map = new Map<number, RegionalOfficeOption[]>();
        for (const ro of regionalOfficeOptions) {
            const list = map.get(ro.zone_id) ?? [];
            list.push(ro);
            map.set(ro.zone_id, list);
        }
        return map;
    }, [regionalOfficeOptions]);

    const applySearch = () => {
        router.get(
            route('organization-structure.index'),
            { search: search.trim() || undefined },
            { preserveState: true, replace: true },
        );
    };

    const onBranchRegionalChange = (branchId: number, value: string) => {
        router.patch(
            route('organization-structure.branches.regional-office', branchId),
            { regional_office_id: value === 'none' ? null : Number(value) },
            { preserveScroll: true },
        );
    };

    const onRegionalZoneChange = (regionalOfficeId: number, zoneId: string) => {
        router.patch(
            route('organization-structure.regional-offices.zone', regionalOfficeId),
            { zone_id: Number(zoneId) },
            { preserveScroll: true },
        );
    };

    const toggleZone = (id: number) => {
        setExpandedZones((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleRegion = (id: number) => {
        setExpandedRegions((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const regionalSelectItems = () => (
        <>
            <SelectItem value="none">— Unassigned —</SelectItem>
            {zoneOptions.map((zone) => {
                const offices = regionalOfficesByZone.get(zone.id) ?? [];
                if (offices.length === 0) return null;
                return (
                    <SelectGroup key={zone.id}>
                        <SelectLabel>
                            {zone.name} ({zone.code})
                        </SelectLabel>
                        {offices.map((ro) => (
                            <SelectItem key={ro.id} value={String(ro.id)}>
                                {ro.name} ({ro.code})
                            </SelectItem>
                        ))}
                    </SelectGroup>
                );
            })}
        </>
    );

    return (
        <Layout>
            <Head title="Organization Structure" />

            <PageSurface>
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                            Organization structure
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage zones, regional offices, and branches in one place. Reassign branches to
                            regions or regions to zones without leaving this page.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {can.createZone && (
                            <Button asChild size="sm" variant="outline" className="h-9">
                                <Link href={route('zones.create')}>
                                    <Plus className="mr-1.5 h-4 w-4" /> Zone
                                </Link>
                            </Button>
                        )}
                        {can.createRegionalOffice && (
                            <Button asChild size="sm" variant="outline" className="h-9">
                                <Link href={route('regional-offices.create')}>
                                    <Plus className="mr-1.5 h-4 w-4" /> Regional office
                                </Link>
                            </Button>
                        )}
                        {can.createBranch && (
                            <Button asChild size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700">
                                <Link href={route('branches.create')}>
                                    <Plus className="mr-1.5 h-4 w-4" /> Branch
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {(can.viewZones || can.viewRegionalOffices || can.viewBranches) && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {can.viewZones && (
                            <Button asChild size="sm" variant="secondary" className="h-8">
                                <Link href={route('zones.index')}>
                                    <List className="mr-1.5 h-3.5 w-3.5" />
                                    All zones
                                </Link>
                            </Button>
                        )}
                        {can.viewRegionalOffices && (
                            <Button asChild size="sm" variant="secondary" className="h-8">
                                <Link href={route('regional-offices.index')}>
                                    <List className="mr-1.5 h-3.5 w-3.5" />
                                    All regional offices
                                </Link>
                            </Button>
                        )}
                        {can.viewBranches && (
                            <Button asChild size="sm" variant="secondary" className="h-8">
                                <Link href={route('branches.index')}>
                                    <List className="mr-1.5 h-3.5 w-3.5" />
                                    All branches
                                </Link>
                            </Button>
                        )}
                    </div>
                )}

                <div className="mb-4 flex gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder="Search zone, region, or branch…"
                            className="h-9 pl-9"
                        />
                    </div>
                    <Button type="button" variant="outline" className="h-9" onClick={applySearch}>
                        Search
                    </Button>
                </div>

                {headOffice && (
                    <Card className="mb-4 border-indigo-200 bg-indigo-50/30">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                                    <Building2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-indigo-950">
                                        {headOffice.name}{' '}
                                        <span className="font-mono text-xs text-indigo-600">
                                            ({headOffice.branch_code})
                                        </span>
                                    </p>
                                    <p className="text-xs text-indigo-700/80">Head Office — not under a zone</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge active={headOffice.is_active} />
                                {can.editBranches && (
                                    <Button asChild size="sm" variant="outline" className="h-8">
                                        <Link href={route('branches.edit', headOffice.id)}>
                                            <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-3">
                    {zones.map((zone) => {
                        const open = expandedZones[zone.id] !== false;
                        const roCount = zone.regional_offices?.length ?? 0;
                        const branchCount = zone.regional_offices?.reduce(
                            (n, ro) => n + (ro.branches?.length ?? 0),
                            0,
                        ) ?? 0;

                        return (
                            <Card key={zone.id} className="overflow-hidden border-emerald-200/80">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/60 px-4 py-3">
                                    <button
                                        type="button"
                                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                        onClick={() => toggleZone(zone.id)}
                                    >
                                        {open ? (
                                            <ChevronDown className="h-4 w-4 shrink-0 text-emerald-700" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700" />
                                        )}
                                        <MapIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-emerald-950">
                                                {zone.name}{' '}
                                                <span className="font-mono text-xs font-semibold text-emerald-700">
                                                    ({zone.code})
                                                </span>
                                            </p>
                                            <p className="text-xs text-emerald-800/70">
                                                {roCount} regional · {branchCount} branch
                                                {zone.zone_manager && (
                                                    <> · ZM: {employeeDisplayName(zone.zone_manager)}</>
                                                )}
                                            </p>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge active={zone.is_active} />
                                        {can.editZones && (
                                            <Button asChild size="sm" variant="outline" className="h-8">
                                                <Link href={route('zones.edit', zone.id)}>
                                                    <Edit className="mr-1 h-3.5 w-3.5" /> Edit zone
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {open && (
                                    <CardContent className="space-y-2 p-3">
                                        {zone.regional_offices.length === 0 ? (
                                            <p className="py-4 text-center text-sm text-slate-400">
                                                No regional offices in this zone.
                                            </p>
                                        ) : (
                                            zone.regional_offices.map((ro) => {
                                                const roOpen = expandedRegions[ro.id] !== false;
                                                return (
                                                    <div
                                                        key={ro.id}
                                                        className="rounded-lg border border-sky-200/80 bg-white"
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/50 px-3 py-2">
                                                            <button
                                                                type="button"
                                                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                                onClick={() => toggleRegion(ro.id)}
                                                            >
                                                                {roOpen ? (
                                                                    <ChevronDown className="h-3.5 w-3.5 text-sky-700" />
                                                                ) : (
                                                                    <ChevronRight className="h-3.5 w-3.5 text-sky-700" />
                                                                )}
                                                                <MapPin className="h-3.5 w-3.5 text-sky-700" />
                                                                <div>
                                                                    <p className="text-sm font-semibold text-sky-950">
                                                                        {ro.name}{' '}
                                                                        <span className="font-mono text-xs text-sky-700">
                                                                            ({ro.code})
                                                                        </span>
                                                                    </p>
                                                                    <p className="text-[11px] text-sky-800/70">
                                                                        {ro.branches.length} branch
                                                                        {ro.regional_manager && (
                                                                            <>
                                                                                {' '}
                                                                                · RM:{' '}
                                                                                {employeeDisplayName(
                                                                                    ro.regional_manager,
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                            <div className="flex flex-wrap items-end gap-2">
                                                                {can.editRegionalOffices && (
                                                                    <div className="space-y-0.5">
                                                                        <Label className="text-[10px] uppercase tracking-wide text-slate-500">
                                                                            Zone
                                                                        </Label>
                                                                        <Select
                                                                            value={String(ro.zone_id)}
                                                                            onValueChange={(v) =>
                                                                                onRegionalZoneChange(ro.id, v)
                                                                            }
                                                                        >
                                                                            <SelectTrigger className={selectClass}>
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {zoneOptions.map((z) => (
                                                                                    <SelectItem
                                                                                        key={z.id}
                                                                                        value={String(z.id)}
                                                                                    >
                                                                                        {z.name} ({z.code})
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                                <StatusBadge active={ro.is_active} />
                                                                {can.editRegionalOffices && (
                                                                    <Button
                                                                        asChild
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8"
                                                                    >
                                                                        <Link
                                                                            href={route(
                                                                                'regional-offices.edit',
                                                                                ro.id,
                                                                            )}
                                                                        >
                                                                            <Edit className="h-3.5 w-3.5" />
                                                                        </Link>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {roOpen && (
                                                            <div className="divide-y divide-slate-100">
                                                                {ro.branches.length === 0 ? (
                                                                    <p className="px-3 py-3 text-xs text-slate-400">
                                                                        No branches under this regional office.
                                                                    </p>
                                                                ) : (
                                                                    ro.branches.map((branch) => (
                                                                        <div
                                                                            key={branch.id}
                                                                            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-slate-800">
                                                                                        {branch.name}{' '}
                                                                                        <span className="font-mono text-xs text-slate-500">
                                                                                            ({branch.branch_code})
                                                                                        </span>
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-wrap items-end gap-2">
                                                                                {can.editBranches && (
                                                                                    <div className="space-y-0.5">
                                                                                        <Label className="text-[10px] uppercase tracking-wide text-slate-500">
                                                                                            Regional office
                                                                                        </Label>
                                                                                        <Select
                                                                                            value={
                                                                                                branch.regional_office_id
                                                                                                    ? String(
                                                                                                          branch.regional_office_id,
                                                                                                      )
                                                                                                    : 'none'
                                                                                            }
                                                                                            onValueChange={(v) =>
                                                                                                onBranchRegionalChange(
                                                                                                    branch.id,
                                                                                                    v,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <SelectTrigger
                                                                                                className={selectClass}
                                                                                            >
                                                                                                <SelectValue />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                {regionalSelectItems()}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </div>
                                                                                )}
                                                                                <StatusBadge
                                                                                    active={branch.is_active}
                                                                                />
                                                                                {can.editBranches && (
                                                                                    <Button
                                                                                        asChild
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        className="h-8"
                                                                                    >
                                                                                        <Link
                                                                                            href={route(
                                                                                                'branches.edit',
                                                                                                branch.id,
                                                                                            )}
                                                                                        >
                                                                                            <Edit className="h-3.5 w-3.5" />
                                                                                        </Link>
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>

                {unassignedBranches.length > 0 && (
                    <Card className="mt-4 border-amber-200 bg-amber-50/20">
                        <CardContent className="p-4">
                            <h2 className="mb-3 text-sm font-bold text-amber-950">
                                Branches without regional office ({unassignedBranches.length})
                            </h2>
                            <div className="divide-y divide-amber-100 rounded-lg border border-amber-200/80 bg-white">
                                {unassignedBranches.map((branch) => (
                                    <div
                                        key={branch.id}
                                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                                            <p className="text-sm font-medium text-slate-800">
                                                {branch.name}{' '}
                                                <span className="font-mono text-xs text-slate-500">
                                                    ({branch.branch_code})
                                                </span>
                                            </p>
                                        </div>
                                        {can.editBranches && (
                                            <Select
                                                value="none"
                                                onValueChange={(v) =>
                                                    onBranchRegionalChange(branch.id, v)
                                                }
                                            >
                                                <SelectTrigger className={selectClass}>
                                                    <SelectValue placeholder="Assign regional office" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {regionalSelectItems()}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {zones.length === 0 && !headOffice && unassignedBranches.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="py-12 text-center text-sm text-slate-500">
                            No organization structure found. Create a zone to get started.
                        </CardContent>
                    </Card>
                )}
            </PageSurface>
        </Layout>
    );
}
