import { AppraisalPrintRoot } from '@/components/appraisal/AppraisalPrintRoot';
import { takaInWords } from '@/lib/taka-in-words';
import React from 'react';

type Signature = {
    stage: string;
    action: string;
    comments?: string | null;
    signed_at?: string | null;
    user_name?: string | null;
    signature?: string | null;
};

export type ClearanceRecord = {
    staff_id?: string | null;
    employee_name?: string | null;
    designation_name?: string | null;
    department_name?: string | null;
    fathers_name?: string | null;
    mothers_name?: string | null;
    mobile?: string | null;
    village?: string | null;
    post_office?: string | null;
    upazila?: string | null;
    district?: string | null;
    program_project?: string | null;
    workplace?: string | null;
    id_card_returned?: boolean | null;
    sim_returned?: boolean | null;
    member_loan_outstanding?: string | number | null;
    savings_outstanding?: string | number | null;
    total_member?: number | null;
    total_borrower?: number | null;
    preparer_comments?: string | null;
    joining_date?: string | null;
    confirmation_date?: string | null;
    dropout_date?: string | null;
    leave_balance?: string | number | null;
    hr_issue?: boolean | null;
    hr_issue_note?: string | null;
    service_length_label?: string | null;
    confirmation_days?: number | null;
    unpaid_salary?: string | number | null;
    unpaid_salary_remarks?: string | null;
    pf_amount?: string | number | null;
    pf_remarks?: string | null;
    gratuity_amount?: string | number | null;
    gratuity_remarks?: string | null;
    staff_security?: string | number | null;
    staff_security_remarks?: string | null;
    other_payable?: string | number | null;
    other_payable_remarks?: string | null;
    pf_loan?: string | number | null;
    pf_loan_remarks?: string | null;
    motorcycle_loan?: string | number | null;
    motorcycle_loan_remarks?: string | null;
    laptop_loan?: string | number | null;
    laptop_loan_remarks?: string | null;
    other_loan?: string | number | null;
    other_loan_remarks?: string | null;
    advance_received?: string | number | null;
    advance_remarks?: string | null;
    accounts_comments?: string | null;
    total_payable?: string | number | null;
    total_adjustable?: string | number | null;
    net_payable?: string | number | null;
    initiator_name?: string | null;
    signatures?: Signature[];
};

const td = 'border border-black px-1 py-[2px] align-middle';
const label = 'whitespace-nowrap font-semibold';
const shade = 'bg-[#d9d9d9]';
const beige = 'bg-[#ddd8c4]';

function text(value: unknown) {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
}

function money(value: unknown) {
    if (value === null || value === undefined || value === '') return '';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    return amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tickBox(checked: boolean) {
    return (
        <span className="mx-[1px] inline-block h-[11px] w-[11px] border border-black text-center align-[-1px] text-[9px] font-bold leading-[9px]">
            {checked ? '✓' : '\u00a0'}
        </span>
    );
}

function yesNo(value: boolean | null | undefined) {
    return (
        <span className="whitespace-nowrap">
            {tickBox(value === true)}
            <span className={value === true ? 'font-bold' : ''}>Yes</span>
            <span className="inline-block w-1.5" />
            {tickBox(value === false)}
            <span className={value === false ? 'font-bold' : ''}>No</span>
        </span>
    );
}

function dateText(value?: string | null) {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
}

function latestSignature(signatures: Signature[] | undefined, stage: string, actions: string[]) {
    return [...(signatures ?? [])].reverse().find((sig) => sig.stage === stage && actions.includes(sig.action));
}

function SignTitle({ title, sig }: { title: string; sig?: Signature }) {
    return (
        <div className="flex min-h-[52px] flex-col items-center justify-end text-center">
            {sig?.signature ? (
                <img src={`/storage/${sig.signature}`} alt="" className="mb-0.5 h-8 max-w-[110px] object-contain" />
            ) : (
                <div className="h-8" />
            )}
            <div className="text-[10px] font-semibold">{title}</div>
            {sig?.user_name ? <div className="text-[8px]">{sig.user_name}</div> : null}
            {sig?.signed_at ? <div className="text-[8px]">{dateText(sig.signed_at)}</div> : null}
        </div>
    );
}

function CommentWithSignature({ title, comment, sig }: { title: string; comment?: string | null; sig?: Signature }) {
    return (
        <>
            <div className={label}>{title}</div>
            <div className="min-h-[16px] whitespace-pre-wrap">{text(comment)}</div>
            {sig ? (
                <div className="mt-1 flex flex-col items-end leading-none">
                    {sig.signature ? (
                        <img src={`/storage/${sig.signature}`} alt="" className="h-8 max-w-[110px] object-contain" />
                    ) : null}
                    {sig.user_name ? <div className="text-[8px] font-semibold">{sig.user_name}</div> : null}
                    {sig.signed_at ? <div className="text-[8px]">{dateText(sig.signed_at)}</div> : null}
                </div>
            ) : null}
        </>
    );
}

export default function ClearanceFormDocument({ clearance }: { clearance: ClearanceRecord }) {
    const net = Number(clearance.net_payable ?? 0);
    const words = Number.isFinite(net) ? takaInWords(net) : '';
    const preparerSig = latestSignature(clearance.signatures, 'field', ['submitted']);
    const accountsSig = latestSignature(clearance.signatures, 'accounts', ['forwarded']);
    const hrSig = latestSignature(clearance.signatures, 'hr', ['forwarded']);
    const directorSig = latestSignature(clearance.signatures, 'director_fa', ['approved']);
    const edSig = latestSignature(clearance.signatures, 'ed', ['approved']);
    const days = clearance.confirmation_days != null && clearance.confirmation_days !== undefined
        ? `${clearance.confirmation_days} Days`
        : '............. Days';

    const payable: [string, unknown, string | null | undefined][] = [
        ['Unpaid Salary and other admissible benefits amount (TK)', clearance.unpaid_salary, clearance.unpaid_salary_remarks],
        ['Provident Fund Amount (TK)', clearance.pf_amount, clearance.pf_remarks],
        ['Gratuity Fund Amount (TK)', clearance.gratuity_amount, clearance.gratuity_remarks],
        ['Staff Security Amount (TK)', clearance.staff_security, clearance.staff_security_remarks],
        ['Others Amount or If Any (TK)', clearance.other_payable, clearance.other_payable_remarks],
    ];

    const adjustable: [string, unknown, string | null | undefined][] = [
        ['PF Loan (TK)', clearance.pf_loan, clearance.pf_loan_remarks],
        ['Motorcycle Loan (TK)', clearance.motorcycle_loan, clearance.motorcycle_loan_remarks],
        ['Laptop Loan (TK)', clearance.laptop_loan, clearance.laptop_loan_remarks],
        ['Others Loan or If Any (TK)', clearance.other_loan, clearance.other_loan_remarks],
        ['Advance Received Amount (TK)', clearance.advance_received, clearance.advance_remarks],
    ];

    return (
        <AppraisalPrintRoot className="mx-auto max-w-[210mm] bg-white p-3 font-sans text-[9px] leading-tight text-black print:m-0 print:max-w-none print:p-0">
            <div className="appraisal-print-page">
                <div>
                    <div className="relative mb-1 min-h-[52px] pt-0.5">
                        <img src="/logo.png" alt="MOUSUMI" className="absolute top-0 left-0 h-12 w-auto object-contain object-left" />
                        <div className="text-center">
                            <h1 className="text-[18px] font-bold tracking-wide">MOUSUMI</h1>
                            <p className="text-[10px]">Ukilpara, Naogaon</p>
                            <h2 className="text-[13px] font-bold">Final Payment and Clearance</h2>
                        </div>
                    </div>

                    <table className="mb-1 w-full border-collapse">
                        <colgroup>
                            <col className="w-[13%]" />
                            <col className="w-[11%]" />
                            <col className="w-[14%]" />
                            <col className="w-[11%]" />
                            <col className="w-[13%]" />
                            <col className="w-[15%]" />
                            <col className="w-[12%]" />
                            <col className="w-[11%]" />
                        </colgroup>
                        <tbody>
                            <tr>
                                <td className={td} colSpan={6}><span className={label}>General Information's:</span></td>
                                <td className={td}><span className={label}>Staff ID</span></td>
                                <td className={`${td} ${shade}`}>{text(clearance.staff_id)}</td>
                            </tr>
                            <tr>
                                <td className={td}><span className={label}>Name</span> :</td>
                                <td className={td} colSpan={2}>{text(clearance.employee_name)}</td>
                                <td className={td}><span className={label}>Designation</span> :</td>
                                <td className={td} colSpan={2}>{text(clearance.designation_name)}</td>
                                <td className={td}><span className={label}>Department</span> :</td>
                                <td className={td}>{text(clearance.department_name)}</td>
                            </tr>
                            <tr>
                                <td className={td}><span className={label}>Father's Name</span> :</td>
                                <td className={td} colSpan={2}>{text(clearance.fathers_name)}</td>
                                <td className={td}><span className={label}>Mother's Name</span> :</td>
                                <td className={td} colSpan={2}>{text(clearance.mothers_name)}</td>
                                <td className={td}><span className={label}>Mobile Number</span> :</td>
                                <td className={td}>{text(clearance.mobile)}</td>
                            </tr>
                            <tr>
                                <td className={`${td} align-top`} colSpan={2}>
                                    <div className={label}>Village :</div>
                                    <div className="break-words">{text(clearance.village)}</div>
                                </td>
                                <td className={`${td} align-top`} colSpan={2}>
                                    <div className={label}>Post Office :</div>
                                    <div className="break-words">{text(clearance.post_office)}</div>
                                </td>
                                <td className={`${td} align-top`} colSpan={2}>
                                    <div className={label}>Thana/Upazila :</div>
                                    <div className="break-words">{text(clearance.upazila)}</div>
                                </td>
                                <td className={`${td} align-top`} colSpan={2}>
                                    <div className={label}>District :</div>
                                    <div className="break-words">{text(clearance.district)}</div>
                                </td>
                            </tr>
                            <tr>
                                <td className={td}><span className={label}>Program/Project</span> :</td>
                                <td className={`${td} ${shade}`}>{text(clearance.program_project)}</td>
                                <td className={td}><span className={label}>ID Card Return?</span> :</td>
                                <td className={`${td} text-center ${shade}`}>{yesNo(clearance.id_card_returned)}</td>
                                <td className={td}><span className={label}>SIM Return?</span> :</td>
                                <td className={`${td} text-center ${shade}`}>{yesNo(clearance.sim_returned)}</td>
                                <td className={td}><span className={label}>Work Place</span> :</td>
                                <td className={`${td} ${shade}`}>{text(clearance.workplace)}</td>
                            </tr>
                            <tr>
                                <td className={td}><span className={label}>Loan Outstanding</span> :</td>
                                <td className={td}>{money(clearance.member_loan_outstanding)}</td>
                                <td className={td}><span className={label}>Savings Outstanding</span> :</td>
                                <td className={td}>{money(clearance.savings_outstanding)}</td>
                                <td className={td}><span className={label}>Total Member</span> :</td>
                                <td className={td}>{text(clearance.total_member)}</td>
                                <td className={td}><span className={label}>Total Borrower</span> :</td>
                                <td className={td}>{text(clearance.total_borrower)}</td>
                            </tr>
                            <tr>
                                <td className={`${td} align-top`} colSpan={8}>
                                    <CommentWithSignature title="Preparer's Comments:" comment={clearance.preparer_comments} sig={preparerSig} />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="mb-1 w-full border-collapse">
                        <colgroup>
                            <col className="w-[22%]" />
                            <col className="w-[22%]" />
                            <col className="w-[20%]" />
                            <col className="w-[18%]" />
                            <col className="w-[18%]" />
                        </colgroup>
                        <tbody>
                            <tr>
                                <td className={td} colSpan={5}><span className={label}>HR Department:</span></td>
                            </tr>
                            <tr>
                                <td className={td}><span className={label}>Joining Date</span> : {dateText(clearance.joining_date)}</td>
                                <td className={td}><span className={label}>Confirmation Date</span> : {dateText(clearance.confirmation_date)}</td>
                                <td className={td} rowSpan={2}>
                                    <span className={label}>Service Length</span> : {text(clearance.service_length_label)}
                                </td>
                                <td className={td}><span className={label}>From Joining</span> :</td>
                                <td className={td}><span className={label}>Leave Balance</span> {text(clearance.leave_balance)}</td>
                            </tr>
                            <tr>
                                <td className={td}>
                                    <span className={label}>Any HR Issue</span> : <span className={shade}>{yesNo(clearance.hr_issue)}</span>
                                </td>
                                <td className={td}><span className={label}>Dropout Date</span> : {dateText(clearance.dropout_date)}</td>
                                <td className={td}><span className={label}>From Confirmation</span> :</td>
                                <td className={td}>{days}</td>
                            </tr>
                            <tr>
                                <td className={`${td} h-7 align-top`} colSpan={5}>{text(clearance.hr_issue_note)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="w-full border-collapse">
                        <colgroup>
                            <col className="w-[49%]" />
                            <col className="w-[12%]" />
                            <col className="w-[15%]" />
                            <col className="w-[12%]" />
                            <col className="w-[12%]" />
                        </colgroup>
                        <tbody>
                            <tr>
                                <td className={td} colSpan={5}><span className={label}>Accounts Department:</span></td>
                            </tr>
                            <tr>
                                <td className={`${td} text-center font-semibold`} colSpan={2}>Particulars</td>
                                <td className={td} />
                                <td className={`${td} text-center font-semibold`}>Amount (TK)</td>
                                <td className={`${td} text-center font-semibold`}>Remarks</td>
                            </tr>
                            <tr>
                                <td className={`${td} font-semibold`} colSpan={2}>1. Particulars or Details Payable</td>
                                <td className={`${td} ${beige} text-center font-semibold`}>Amount</td>
                                <td className={td} />
                                <td className={td} />
                            </tr>
                            {payable.map(([rowLabel, amount, remarks]) => (
                                <tr key={rowLabel}>
                                    <td className={td} colSpan={2}>{rowLabel} :</td>
                                    <td className={td} />
                                    <td className={`${td} ${shade} text-right font-mono`}>{money(amount)}</td>
                                    <td className={td}>{text(remarks)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className={`${td} ${beige} text-right font-bold`} colSpan={3}>Total Payable Amount :</td>
                                <td className={`${td} text-right font-mono font-bold`}>{money(clearance.total_payable)}</td>
                                <td className={td} />
                            </tr>
                            <tr>
                                <td className={`${td} font-semibold`}>2. Particulars or Details Receivable / Adjustable</td>
                                <td className={`${td} ${beige} text-center font-semibold`}>Amount</td>
                                <td className={`${td} ${beige} text-center font-semibold`}>Outstanding</td>
                                <td className={td} />
                                <td className={td} />
                            </tr>
                            {adjustable.map(([rowLabel, amount, remarks]) => (
                                <tr key={rowLabel}>
                                    <td className={td}>{rowLabel} :</td>
                                    <td className={td} />
                                    <td className={`${td} text-right font-mono`}>{money(amount)}</td>
                                    <td className={`${td} text-right font-mono`}>{money(amount)}</td>
                                    <td className={td}>{text(remarks)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className={`${td} ${beige} text-right font-bold`} colSpan={3}>Total Adjustable Amount :</td>
                                <td className={`${td} text-right font-mono font-bold`}>{money(clearance.total_adjustable)}</td>
                                <td className={td} />
                            </tr>
                            <tr>
                                <td className={`${td} text-right font-bold`} colSpan={3}>Final Payment (1-2) :</td>
                                <td className={`${td} text-right font-mono font-bold`}>{money(clearance.net_payable)}</td>
                                <td className={td} />
                            </tr>
                            <tr>
                                <td className={`${td} text-center`} colSpan={5}>
                                    <span className={label}>In words:</span> {words}
                                </td>
                            </tr>
                            <tr>
                                <td className={`${td} align-top`} colSpan={5}>
                                    <CommentWithSignature title="Accounts Department Comments:" comment={clearance.accounts_comments} sig={accountsSig} />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <SignTitle title="Manager (HR)" sig={hrSig} />
                        <SignTitle title="Director (Finance & Accounts)" sig={directorSig} />
                        <SignTitle title="Executive Director" sig={edSig} />
                    </div>
                    <div className="mt-3 min-h-[28px] text-[10px] font-semibold">
                        Final Payment/ Final Clearance Receiver's Signature:
                    </div>
                </div>
            </div>
        </AppraisalPrintRoot>
    );
}
