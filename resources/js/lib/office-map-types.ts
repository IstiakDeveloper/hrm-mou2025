export type OfficeMapLocationType = 'head_office' | 'zone' | 'region' | 'branch';

export type OfficeMapLocation = {
    id: string;
    type: OfficeMapLocationType;
    name: string;
    code: string | null;
    latitude: number;
    longitude: number;
    address?: string | null;
    phone?: string | null;
    is_head_office?: boolean;
    is_zone_office?: boolean;
    is_regional_office?: boolean;
    zone_id?: number | null;
    zone_name?: string | null;
    region_id?: number | null;
    region_name?: string | null;
};

export type OfficeMapCounts = {
    head_office: number;
    zone: number;
    region: number;
    branch: number;
};

export type OfficeMapPageProps = {
    locations: OfficeMapLocation[];
    counts: OfficeMapCounts;
    orgLogo: string;
};
