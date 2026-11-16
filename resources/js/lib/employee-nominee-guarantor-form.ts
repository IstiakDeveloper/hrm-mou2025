export type NomineeFormRow = {
    name: string;
    relation: string;
    mobile: string;
    date_of_birth: string;
    share_percentage: string | number;
};

export type GuarantorFormRow = {
    name: string;
    mobile: string;
    relation: string;
    address: string;
};

export type ChequeFormRow = {
    bank_name: string;
    cheque_no: string;
    qty: string | number;
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
        mobile: '',
        relation: '',
        address: '',
    };
}

export function emptyChequeFormRow(): ChequeFormRow {
    return {
        bank_name: '',
        cheque_no: '',
        qty: '',
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
        mobile: String(base.mobile ?? base.phone ?? ''),
        relation: String(base.relation ?? ''),
        address: String(base.address ?? ''),
    };
}

export function hydrateChequeFormRow(row: Record<string, unknown> | null | undefined): ChequeFormRow {
    const base = row ?? {};

    return {
        bank_name: String(base.bank_name ?? ''),
        cheque_no: String(base.cheque_no ?? ''),
        qty: base.qty ?? '',
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

export function hydrateChequeFormRows(rows: unknown): ChequeFormRow[] {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.map((row) => hydrateChequeFormRow(row as Record<string, unknown>));
}
