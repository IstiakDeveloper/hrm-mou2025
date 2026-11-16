import { router } from '@inertiajs/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users } from 'lucide-react';

type ScopeView = 'mine' | 'team';

type Props = {
    view: ScopeView;
    showTabs: boolean;
    indexRoute: string;
    filterParams: Record<string, string>;
    mineLabel?: string;
    teamLabel?: string;
};

export function LogBookScopeTabs({
    view,
    showTabs,
    indexRoute,
    filterParams,
    mineLabel = 'My Log Book',
    teamLabel = 'Team',
}: Props) {
    if (!showTabs) {
        return null;
    }

    const switchView = (next: string) => {
        if (next !== 'mine' && next !== 'team') {
            return;
        }

        const params = { ...filterParams };
        delete params.page;
        if (next === 'mine') {
            delete params.employee_id;
            delete params.zone_id;
            delete params.regional_office_id;
            delete params.branch_id;
            delete params.department_id;
        }

        router.get(indexRoute, { ...params, view: next }, { preserveState: false });
    };

    return (
        <Tabs value={view} onValueChange={switchView} className="w-full">
            <TabsList className="h-9 w-fit min-w-0 gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <TabsTrigger
                    value="mine"
                    className="h-8 min-w-[6.5rem] flex-none gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                    <User className="h-3.5 w-3.5" />
                    {mineLabel}
                </TabsTrigger>
                <TabsTrigger
                    value="team"
                    className="h-8 min-w-[5.5rem] flex-none gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                    <Users className="h-3.5 w-3.5" />
                    {teamLabel}
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
