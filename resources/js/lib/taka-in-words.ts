const ONES = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convert(n: number): string {
    if (n < 20) return ONES[n] ?? '';
    if (n < 100) {
        const tens = TENS[Math.floor(n / 10)];
        const ones = n % 10;
        return ones ? `${tens} ${ONES[ones]}` : tens;
    }
    if (n < 1000) {
        const hundreds = `${ONES[Math.floor(n / 100)]} Hundred`;
        const remainder = n % 100;
        return remainder ? `${hundreds} ${convert(remainder)}` : hundreds;
    }
    if (n < 100000) {
        const thousands = `${convert(Math.floor(n / 1000))} Thousand`;
        const remainder = n % 1000;
        return remainder ? `${thousands} ${convert(remainder)}` : thousands;
    }
    if (n < 10000000) {
        const lakhs = `${convert(Math.floor(n / 100000))} Lakh`;
        const remainder = n % 100000;
        return remainder ? `${lakhs} ${convert(remainder)}` : lakhs;
    }
    const crores = `${convert(Math.floor(n / 10000000))} Crore`;
    const remainder = n % 10000000;
    return remainder ? `${crores} ${convert(remainder)}` : crores;
}

export function takaInWords(amount: unknown): string {
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n === 0) return 'Zero Taka Only';
    const prefix = n < 0 ? 'Minus ' : '';
    return `${prefix}${convert(Math.abs(n)).trim()} Taka Only`;
}
