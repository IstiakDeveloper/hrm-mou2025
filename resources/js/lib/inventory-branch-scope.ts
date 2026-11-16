export type InventoryBranchScope = {
    locked: boolean;
    branch_id: number | null;
    branch_name: string | null;
};

export function lockedBranchId(scope?: InventoryBranchScope | null): string | null {
    if (!scope?.locked || scope.branch_id == null) {
        return null;
    }

    return String(scope.branch_id);
}
