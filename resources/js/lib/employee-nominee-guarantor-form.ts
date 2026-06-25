export type NomineeFormRow = {
    name: string;
    relation: string;
    mobile: string;
    date_of_birth: string;
    share_percentage: string | number;
};

export type GuarantorFormRow = {
    name: string;
    father_name: string;
    mobile: string;
    address: string;
    profession: string;
    organization: string;
    designation: string;
    nid: string;
};

export function emptyNomineeFormRow(): NomineeFormRow {
    return {
        name: '',
        relation: '',
        mobile: '',
        date_of_birth: '',
        share_percentage: '',
    };
}

export function emptyGuarantorFormRow(): GuarantorFormRow {
    return {
        name: '',
        father_name: '',
        mobile: '',
        address: '',
        profession: '',
        organization: '',
        designation: '',
        nid: '',
    };
}

export function hydrateNomineeFormRow(row: Record<string, unknown> | null | undefined): NomineeFormRow {
    const base = row ?? {};

    return {
        name: String(base.name ?? ''),
        relation: String(base.relation ?? ''),
        mobile: String(base.mobile ?? base.contact ?? ''),
        date_of_birth: String(base.date_of_birth ?? ''),
        share_percentage: base.share_percentage ?? base.share ?? '',
    };
}

export function hydrateGuarantorFormRow(row: Record<string, unknown> | null | undefined): GuarantorFormRow {
    const base = row ?? {};

    return {
        name: String(base.name ?? ''),
        father_name: String(base.father_name ?? ''),
        mobile: String(base.mobile ?? base.phone ?? ''),
        address: String(base.address ?? ''),
        profession: String(base.profession ?? base.occupation ?? ''),
        organization: String(base.organization ?? ''),
        designation: String(base.designation ?? ''),
        nid: String(base.nid ?? ''),
    };
}

export function hydrateNomineeFormRows(rows: unknown): NomineeFormRow[] {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.map((row) => hydrateNomineeFormRow(row as Record<string, unknown>));
}

export function hydrateGuarantorFormRows(rows: unknown): GuarantorFormRow[] {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.map((row) => hydrateGuarantorFormRow(row as Record<string, unknown>));
}
