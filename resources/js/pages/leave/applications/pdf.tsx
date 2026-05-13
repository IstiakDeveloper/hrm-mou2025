import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';

interface Department {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    phone?: string;
    department: Department;
    designation: {
        id: number;
        name: string;
    };
}

interface LeaveType {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface LeaveBalance {
    id: number;
    employee_id: number;
    leave_type_id: number;
    year: number;
    allocated_days: number;
    used_days: number;
    remaining_days: number;
    leaveType?: LeaveType;
    leave_type?: LeaveType;
}

interface LeaveApproval {
    id: number;
    leave_application_id: number;
    approved_by: number;
    level: number;
    status: 'pending' | 'approved' | 'rejected';
    comments: string | null;
    approved_at: string;
    approver: User;
}

interface LeaveApplication {
    id: number;
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    applied_at: string;
    approved_by: number | null;
    rejection_reason: string | null;
    employee: Employee;
    /** Laravel serializes relation as `leave_type` in JSON; support both. */
    leaveType?: LeaveType;
    leave_type?: LeaveType;
    approver: User | null;
    leaveBalance?: LeaveBalance;
    leaveBalances?: LeaveBalance[];
    approvals?: LeaveApproval[];
}

function applicationLeaveTypeName(application: LeaveApplication): string {
    return (application.leaveType?.name ?? application.leave_type?.name ?? '').trim();
}

/**
 * Laravel `currentDate` uses `d/m/Y`; DB dates are often ISO. `new Date('27/04/2026')` is invalid in JS.
 */
function parsePdfDateString(input: string | undefined | null): Date | null {
    if (input == null) {
        return null;
    }
    const trimmed = String(input).trim();
    if (!trimmed) {
        return null;
    }

    const dmY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
    if (dmY) {
        const d = parseInt(dmY[1], 10);
        const m = parseInt(dmY[2], 10) - 1;
        const y = parseInt(dmY[3], 10);
        const dt = new Date(y, m, d);
        if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
            return dt;
        }
        return null;
    }

    const dt = new Date(trimmed);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatPdfDateDMY(input: string | undefined | null): string {
    const date = parsePdfDateString(input);
    if (!date) {
        return input?.trim() ?? '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

function formatPdfDateLongFromInput(input: string | undefined | null): string {
    const date = parsePdfDateString(input);
    if (!date) {
        return input?.trim() ?? '';
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/** Mirrors `resolveTierApprovers` addressee + legacy PDF fallbacks (LeaveApplicationController::generatePdf). */
type LeavePdfAddresseeType =
    | 'department_head'
    | 'executive_director'
    | 'branch_manager'
    | 'branch_head'
    | 'designation';

type LeavePdfRoutingScope = 'none' | 'department' | 'branch' | 'regional_office' | 'zone';

interface LeavePdfRoutingContext {
    branch_name?: string | null;
    regional_office_name?: string | null;
    zone_name?: string | null;
    department_name?: string | null;
}

interface LeavePdfAddressee {
    type?: LeavePdfAddresseeType | null;
    title?: string | null;
    name?: string | null;
    /** Set by server (LeaveApplicationController); drives which location suffix is shown. */
    routing_scope?: LeavePdfRoutingScope | string | null;
    routing_context?: LeavePdfRoutingContext | null;
}

interface PdfProps {
    application: LeaveApplication;
    currentDate: string;
    addressee?: LeavePdfAddressee;
}

function inferRoutingScope(addressee?: LeavePdfAddressee): LeavePdfRoutingScope {
    const raw = addressee?.routing_scope;
    if (raw === 'none' || raw === 'department' || raw === 'branch' || raw === 'regional_office' || raw === 'zone') {
        return raw;
    }
    const t = addressee?.type;
    if (t === 'department_head') {
        return 'department';
    }
    if (t === 'branch_manager' || t === 'branch_head') {
        return 'branch';
    }
    if (t === 'designation') {
        return 'branch';
    }
    return 'none';
}

/**
 * Role line with location only where routing applies (ED = title only; DH = department;
 * branch manager/head = branch; designation tier by regional / zone / branch from server scope).
 */
function addresseeRoleDetailLine(addressee: LeavePdfAddressee | undefined, application: LeaveApplication): string {
    const title = (addressee?.title ?? '').trim() || 'Executive Director';
    const scope = inferRoutingScope(addressee);
    const rc = addressee?.routing_context;

    if (scope === 'none') {
        return title;
    }
    if (scope === 'department') {
        const d = (rc?.department_name ?? application.employee?.department?.name ?? '').trim();
        return d ? `${title} (${d})` : title;
    }
    if (scope === 'branch') {
        const b = (rc?.branch_name ?? '').trim();
        return b ? `${title} (${b})` : title;
    }
    if (scope === 'regional_office') {
        const r = (rc?.regional_office_name ?? '').trim();
        return r ? `${title} (${r})` : title;
    }
    if (scope === 'zone') {
        const z = (rc?.zone_name ?? '').trim();
        return z ? `${title} (${z})` : title;
    }
    return title;
}

/** Opening line for the letter — follows active leave approval tier (or ED when tier exceeds / no tier). */
function addresseeSalutation(addressee?: LeavePdfAddressee, application?: LeaveApplication): string {
    const title = (addressee?.title ?? '').trim();
    const t = addressee?.type;

    switch (t) {
        case 'department_head': {
            const dept = (
                addressee?.routing_context?.department_name ??
                application?.employee?.department?.name ??
                ''
            ).trim();
            const role = title || 'Department Head';
            return dept ? `To, ${role} (${dept})` : `To, ${role}`;
        }
        case 'branch_manager':
            return 'To, Branch Manager';
        case 'branch_head':
            return title ? `To, ${title}` : 'To, Branch Head';
        case 'executive_director':
            return title ? `To, ${title}` : 'To, Executive Director';
        case 'designation':
            return title ? `To, ${title}` : 'To, Approving Authority';
        default:
            return title ? `To, ${title}` : 'To, Executive Director';
    }
}

function addresseeSalutationBody(
    addressee?: LeavePdfAddressee,
    application?: LeaveApplication
): string {
    return addresseeSalutation(addressee, application)
        .trim()
        .replace(/^To,\s*/i, '')
        .trim();
}

/** Text after "To," — prefers role+location line when it adds detail beyond the salutation body; optional addressee name. */
function addresseeSecondLine(
    addressee: LeavePdfAddressee | undefined,
    application: LeaveApplication
): string {
    const body = addresseeSalutationBody(addressee, application);
    const role = addresseeRoleDetailLine(addressee, application).trim();
    let line: string;
    if (role && body && role.toLowerCase() !== body.toLowerCase()) {
        line = role;
    } else {
        line = body || role;
    }
    if (!line) {
        line = 'Executive Director';
    }
    const name = (addressee?.name ?? '').trim();
    if (name && addressee?.type !== 'department_head') {
        return `${name}, ${line}`;
    }
    return line;
}

export default function Pdf({ application, currentDate, addressee }: PdfProps) {
    useEffect(() => {
        // Auto-trigger print dialog when component loads
        setTimeout(() => {
            window.print();
        }, 1000);
    }, []);

    // Safety check
    if (!application || !application.employee) {
        return (
            <div className="min-h-screen bg-white p-8 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading...</h2>
                    <p className="text-gray-600">Please wait while we load the leave application details.</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateString: string) => formatPdfDateDMY(dateString);
    const formatDateLong = (dateString: string) => formatPdfDateLongFromInput(dateString);

    const balances = application.leaveBalances || (application.leaveBalance ? [application.leaveBalance] : []);

    return (
        <>
            <Head title="Leave Application Form" />

            <div className="print-container">
                <div className="page-content">
                    {/* Header: logo left; company name + address centered on page */}
                    <div className="header-section">
                        <div className="header-logo-column">
                            <div className="company-logo">
                                <img
                                    src="/logo.png"
                                    alt="Company logo"
                                    className="logo-image"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                                        if (fb) {
                                            fb.style.display = 'flex';
                                        }
                                    }}
                                />
                                <div className="logo-fallback">
                                    <span className="logo-text">MOUSUMI</span>
                                </div>
                            </div>
                        </div>
                        <div className="company-details">
                            <h1 className="company-name">MOUSUMI</h1>
                            <p className="company-location">Ukilpara, Naogaon</p>
                        </div>
                        <div className="header-spacer" aria-hidden="true" />
                    </div>

                    {/* Document Title */}
                    <div className="document-title-box">
                        <h2 className="document-title">LEAVE APPLICATION</h2>
                        <div className="digital-copy-badge">
                            <span>DIGITAL COPY</span>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="application-date">
                        <p>Date: {formatDate(application.applied_at)}</p>
                    </div>

                    {/* Addressee — two lines: "To," then role/title (tier from Leave settings / legacy rules) */}
                    <div className="addressee-section">
                        <p className="addressee-line">To,</p>
                        <p className="addressee-title">{addresseeSecondLine(addressee, application)}</p>
                    </div>

                    {/* Subject */}
                    <div className="subject-section">
                        <p>
                            <strong>Subject:</strong>{' '}
                            Application for {application.days} day{application.days !== 1 ? 's' : ''}{' '}
                            {(() => {
                                const raw = applicationLeaveTypeName(application);
                                if (!raw) {
                                    return 'leave.';
                                }
                                if (/\bleave\s*$/i.test(raw)) {
                                    return `${raw}.`;
                                }
                                return `${raw} leave.`;
                            })()}
                        </p>
                    </div>

                    {/* Main Content */}
                    <div className="content-section">
                        <p className="greeting">Dear Sir,</p>

                        <p className="main-content">
                            I am writing to request a {application.days}-day leave of absence from {formatDateLong(application.start_date)} to {formatDateLong(application.end_date)}.
                            During this period, I will be staying at my residence.
                            I will ensure all my pending tasks are up to date before my leave starts. In case of any emergencies, please feel free to reach me at
                            <span> {application.employee?.phone || '[Phone Number]'}</span>.
                        </p>

                        {application.reason && (
                            <div className="reason-section">
                                <p><strong>Reason for leave:</strong></p>
                                <p className="reason-text">{application.reason}</p>
                            </div>
                        )}

                        <p className="closing-content">
                            I would appreciate it if you could kindly approve my request.
                        </p>
                    </div>

                    {/* Leave Information */}
                    <div className="leave-info-section">
                        <h3 className="info-title">Leave Information:</h3>
                        <p className="leave-balance">
                            Total leave taken in current year: {application.leaveBalance?.used_days || 0} days | Applied leave: {application.days}{' '}
                            day{application.days > 1 ? 's' : ''} | Remaining balance: {application.leaveBalance?.remaining_days || 0} days
                        </p>
                    </div>

                    {/* Leave Balance (All Types) */}
                    <div className="leave-info-section">
                        <h3 className="info-title">Leave Balance:</h3>
                        <div className="leave-balance-lines leave-balance-columns">
                            {balances.length > 0 ? (
                                balances.map((b) => {
                                    const typeName = b.leaveType?.name || b.leave_type?.name || 'Leave';
                                    return (
                                        <div key={b.id} className="lb-line">
                                            <span className="lb-type">{typeName}</span>
                                            <span className="lb-split">{b.allocated_days}/{b.used_days}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="lb-line">
                                    <span className="lb-type">No leave balance found for current year.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Employee Information */}
                    <div className="employee-section">
                        <div className="employee-info">
                            <p className="respectfully">Employee Details:</p>
                            <div className="employee-details">
                                <div className="detail-item">
                                    <span className="detail-label">Name:</span>
                                    <span className="detail-value">
                                        {application.employee?.first_name || ''} {application.employee?.last_name || ''}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Designation:</span>
                                    <span className="detail-value">
                                        {application.employee?.designation?.name || ''}
                                        {application.employee?.department?.name
                                            ? ` (${application.employee.department.name})`
                                            : ''}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Employee ID:</span>
                                    <span className="detail-value">{application.employee?.employee_id || ''}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Department:</span>
                                    <span className="detail-value">{application.employee?.department?.name || ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Digital Approval Section */}
                    <div className="approval-section">
                        <div className={`approval-box ${(application.status === 'approved' && 'approved-shadow') ||
                            (application.status === 'rejected' && 'rejected-shadow') ||
                            (application.status === 'pending' && 'pending-shadow') ||
                            ''
                            }`}>
                            <h4 className="approval-title">Final Approval Status</h4>
                            <div className="approval-content">
                                <div className="digital-approval-info">
                                    {application.status === 'approved' ? (
                                        <>
                                            <div className="detail-item">
                                                <span className="detail-label">Status:</span>
                                                <span className="detail-value approved">APPROVED</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Approved By:</span>
                                                <span className="detail-value">{application.approver?.name || 'System Administrator'}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Approval Date:</span>
                                                <span className="detail-value">{formatDate(currentDate)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Digital Signature:</span>
                                                <span className="detail-value approved">ELECTRONICALLY SIGNED</span>
                                            </div>
                                        </>
                                    ) : application.status === 'rejected' ? (
                                        <>
                                            <div className="detail-item">
                                                <span className="detail-label">Status:</span>
                                                <span className="detail-value rejected">REJECTED</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Rejected By:</span>
                                                <span className="detail-value">{application.approver?.name || 'Reviewing Officer'}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Review Date:</span>
                                                <span className="detail-value">{formatDate(currentDate)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Digital Signature:</span>
                                                <span className="detail-value rejected">ELECTRONICALLY REVIEWED</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="detail-item">
                                                <span className="detail-label">Status:</span>
                                                <span className="detail-value pending">UNDER REVIEW</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Submitted:</span>
                                                <span className="detail-value">{formatDate(application.applied_at)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Review Level:</span>
                                                <span className="detail-value">Management Approval</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Expected Response:</span>
                                                <span className="detail-value">Within 3-5 Business Days</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status if rejected */}
                    {application.status === 'rejected' && application.rejection_reason && (
                        <div className="rejection-notice">
                            <h4>Application Status: REJECTED</h4>
                            <p><strong>Reason:</strong> {application.rejection_reason}</p>
                        </div>
                    )}

                    {/* Digital Footer */}
                    <div className="digital-footer">
                        <div className="footer-info">
                            <p><strong>Digital Document Information:</strong></p>
                            <p>Generated: {formatDateLong(new Date().toISOString())} | Reference: LA-{application.id}-{new Date().getFullYear()}</p>
                            <p>This is a system-generated document; no signature is required.</p>
                        </div>
                    </div>

                    {/* Dynamic Status Watermark */}
                    {(application.status === 'approved' || application.status === 'rejected' || application.status === 'pending') && (
                        <div className={`status-watermark ${application.status}-watermark`}>
                            <div className="watermark-content">
                                <div className="watermark-stamp">
                                    <div className={`stamp-circle ${application.status}-stamp`}>
                                        <div className="stamp-inner">
                                            <div className="stamp-icon">
                                                {application.status === 'approved' && '✓'}
                                                {application.status === 'rejected' && '✗'}
                                                {application.status === 'pending' && '⏳'}
                                            </div>
                                            <div className="stamp-text">
                                                {application.status === 'approved' && 'APPROVED'}
                                                {application.status === 'rejected' && 'REJECTED'}
                                                {application.status === 'pending' && 'PENDING'}
                                            </div>
                                            <div className="stamp-date">
                                                {application.status === 'approved' && formatDate(currentDate)}
                                                {application.status === 'rejected' && formatDate(currentDate)}
                                                {application.status === 'pending' && formatDate(application.applied_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        .print-container {
          width: 100%;
          min-height: 100vh;
          background: white;
          font-family: 'Times New Roman', serif;
          color: #000;
          line-height: 1.6;
          font-size: 14.5px;
        }

        .page-content {
          max-width: 210mm;
          margin: 0 auto;
          padding: 7mm;
          background: white;
          min-height: calc(297mm - 14mm);
          position: relative;
        }

        .header-section {
          display: grid;
          grid-template-columns: 88px 1fr 88px;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 12px;

        }

        .header-logo-column {
          justify-self: start;
        }

        .header-spacer {
          width: 100%;
          height: 1px;
          visibility: hidden;
          pointer-events: none;
        }

        .company-logo {
          position: relative;
          width: 72px;
          height: 72px;
        }

        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: left center;
          display: block;
        }

        .logo-fallback {
          width: 72px;
          height: 72px;
          border: 2px solid #000;
          border-radius: 50%;
          display: none;
          align-items: center;
          justify-content: center;
          background: white;
          position: absolute;
          top: 0;
          left: 0;
        }

        .logo-text {
          font-size: 11.5px;
          font-weight: bold;
          text-align: center;
          line-height: 1.2;
        }

        .company-details {
          text-align: center;
          justify-self: stretch;
          min-width: 0;
        }

        .company-name {
          font-size: 22.5px;
          font-weight: bold;
          margin: 0 0 4px 0;
          letter-spacing: 0.12em;
          line-height: 1.15;
        }

        .company-location {
          font-size: 13.5px;
          margin: 0;
          font-weight: normal;
          color: #334155;
          text-align: center;
        }

        .document-title-box {
          text-align: center;
          margin: 12px 0 10px 0;
          border: 2px solid #000;
          padding: 6px;
          position: relative;
        }

        .document-title {
          font-size: 16.5px;
          font-weight: bold;
          margin: 0;
          letter-spacing: 1px;
        }

        .digital-copy-badge {
          position: absolute;
          top: -10px;
          right: 10px;
          background: #2563eb;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: bold;
        }

        .application-date {
          text-align: left;
          margin: 10px 0;
        }

        .application-date p {
          margin: 0;
          font-size: 13.5px;
        }

        .addressee-section {
          margin: 10px 0;
        }

        .addressee-line, .addressee-name, .addressee-title, .addressee-company {
          margin: 3px 0;
          font-size: 13.5px;
        }

        .addressee-name {
          font-weight: normal;
        }

        .addressee-title {
          font-weight: bold;
        }

        .subject-section {
          margin: 10px 0;
        }

        .subject-section p {
          margin: 0;
          font-size: 13.5px;
        }

        .content-section {
          margin: 12px 0;
          text-align: justify;
        }

        .greeting {
          margin-bottom: 10px;
          font-size: 13.5px;
        }

        .main-content {
          margin-bottom: 10px;
          font-size: 13.5px;
          line-height: 1.4;
        }

        .reason-section {
          margin: 10px 0;
          padding: 8px;
          border: 1px solid #ccc;
          background: #f9f9f9;
        }

        .reason-text {
          margin: 3px 0 0 0;
          font-style: italic;
          font-size: 12.5px;
        }

        .closing-content {
          margin-top: 10px;
          font-size: 13.5px;
          line-height: 1.4;
        }

        .leave-info-section {
          margin: 12px 0;
        }

        .info-title {
          font-size: 13.5px;
          font-weight: bold;
          margin: 0 0 5px 0;
        }

        .leave-balance {
          margin: 0;
          font-size: 12.5px;
          background: #f0f8ff;
          padding: 6px;
          border-left: 3px solid #2563eb;
          border-radius: 3px;
        }

        .leave-balance-lines {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          overflow: hidden;
          font-size: 11.5px;
        }

        .leave-balance-columns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          padding: 3px 5px;
        }

        .lb-line {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 5px 6px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #ffffff;
          text-align: center;
        }

        .lb-type {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
        }

        .lb-split {
          text-align: center;
          white-space: nowrap;
          font-weight: bold;
          font-size: 12.5px;
        }

        .employee-section {
          margin: 14px 0;
          max-width: 100%;
        }

        .respectfully {
          font-size: 13.5px;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .employee-details, .approval-details, .digital-approval-info {
          font-size: 11.5px;
        }

        .detail-item {
          display: flex;
          margin: 2px 0;
          align-items: baseline;
        }

        .detail-label {
          font-weight: bold;
          min-width: 110px;
          margin-right: 8px;
          font-size: 11.5px;
        }

        .detail-value {
          flex: 1;
        }

        .detail-value.approved {
          color: #22c55e;
          font-weight: bold;
          font-size: 12.5px;
        }

        .detail-value.rejected {
          color: #dc2626;
          font-weight: bold;
          font-size: 12.5px;
        }

        .detail-value.pending {
          color: #2563eb;
          font-weight: bold;
          font-size: 12.5px;
        }

        .approval-section {
          margin: 12px 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        .approval-box {
          border: 1px solid #000;
          padding: 0;
          transition: all 0.3s ease;
        }

        .approved-shadow {
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.12),
            0 3px 10px rgba(0, 0, 0, 0.16),
            0 10px 28px rgba(34, 197, 94, 0.42);
          border-color: #22c55e;
          background: linear-gradient(145deg, #f0fdf4, #ffffff);
        }

        .rejected-shadow {
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.12),
            0 3px 10px rgba(0, 0, 0, 0.16),
            0 10px 28px rgba(220, 38, 38, 0.42);
          border-color: #dc2626;
          background: linear-gradient(145deg, #fef2f2, #ffffff);
        }

        .pending-shadow {
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.12),
            0 3px 10px rgba(0, 0, 0, 0.16),
            0 10px 28px rgba(37, 99, 235, 0.42);
          border-color: #2563eb;
          background: linear-gradient(145deg, #eff6ff, #ffffff);
        }

        .approval-title {
          background: #f0f0f0;
          padding: 4px 8px;
          margin: 0;
          font-size: 11.5px;
          font-weight: bold;
          text-align: center;
          border-bottom: 1px solid #000;
        }

        .approved-shadow .approval-title {
          background: linear-gradient(145deg, #22c55e, #16a34a);
          color: white;
        }

        .rejected-shadow .approval-title {
          background: linear-gradient(145deg, #dc2626, #b91c1c);
          color: white;
        }

        .pending-shadow .approval-title {
          background: linear-gradient(145deg, #2563eb, #1d4ed8);
          color: white;
        }

        .approval-content {
          padding: 6px 8px;
        }

        .digital-approval-info {
          min-height: 0;
        }

        .rejection-notice {
          margin-top: 12px;
          padding: 10px;
          border: 2px solid #dc2626;
          background: #fef2f2;
          text-align: center;
        }

        .rejection-notice h4 {
          color: #dc2626;
          margin: 0 0 10px 0;
          font-size: 16.5px;
        }

        .rejection-notice p {
          margin: 0;
          color: #7f1d1d;
        }

        .digital-footer {
          margin-top: 10px;
          text-align: center;
          font-size: 10.5px;
          border-top: 1px solid #ccc;
          padding-top: 6px;
          background: #f8fafc;
          padding: 6px;
          border-radius: 4px;
        }

        .digital-footer p {
          margin: 2px 0;
          color: #6b7280;
        }

        /* Dynamic Status Watermarks */
        .status-watermark {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
        }

        .watermark-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
        }

        /* Approved Status - Green */
        .approved-watermark .watermark-content {
          opacity: 0.12;
        }

        .approved-stamp {
          width: 250px;
          height: 250px;
          border: 6px solid #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%);
          position: relative;
        }

        .approved-stamp::before {
          content: '';
          position: absolute;
          width: 230px;
          height: 230px;
          border: 2px solid #22c55e;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .approved-stamp .stamp-inner {
          color: #22c55e;
        }

        /* Rejected Status - Red */
        .rejected-watermark .watermark-content {
          opacity: 0.12;
        }

        .rejected-stamp {
          width: 250px;
          height: 250px;
          border: 6px solid #dc2626;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(220, 38, 38, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%);
          position: relative;
        }

        .rejected-stamp::before {
          content: '';
          position: absolute;
          width: 230px;
          height: 230px;
          border: 2px solid #dc2626;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .rejected-stamp .stamp-inner {
          color: #dc2626;
        }

        /* Pending Status - Blue */
        .pending-watermark .watermark-content {
          opacity: 0.12;
        }

        .pending-stamp {
          width: 250px;
          height: 250px;
          border: 6px solid #2563eb;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%);
          position: relative;
        }

        .pending-stamp::before {
          content: '';
          position: absolute;
          width: 230px;
          height: 230px;
          border: 2px solid #2563eb;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .pending-stamp .stamp-inner {
          color: #2563eb;
        }

        .stamp-inner {
          text-align: center;
          font-family: 'Arial Black', Arial, sans-serif;
        }

        .stamp-icon {
          font-size: 60.5px;
          font-weight: bold;
          margin-bottom: 5px;
          text-shadow:
            0.5px 0.5px 0 rgba(0, 0, 0, 0.22),
            1px 2px 4px rgba(0, 0, 0, 0.18);
        }

        .stamp-text {
          font-size: 32.5px;
          font-weight: 900;
          letter-spacing: 6px;
          margin-bottom: 5px;
          text-shadow:
            0.5px 0.5px 0 rgba(0, 0, 0, 0.22),
            1px 2px 3px rgba(0, 0, 0, 0.18);
        }

        .stamp-date {
          font-size: 14.5px;
          font-weight: bold;
          letter-spacing: 1px;
        }

        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-container {
            margin: 0;
            padding: 0;
          }

          .page-content {
            max-width: none;
            margin: 0;
            padding: 6mm;
            min-height: auto;
            position: relative;
            box-shadow:
              0 0 0 1px rgba(0, 0, 0, 0.35),
              0 3px 10px rgba(0, 0, 0, 0.25) !important;
          }

          @page {
            size: A4;
            margin: 6mm;
          }

          .header-section, .employee-section, .approval-section {
            break-inside: avoid;
          }

          /* Strong neutral shadow so grayscale / laser print still shows depth */
          .approved-shadow {
            box-shadow:
              0 0 0 1px rgba(0, 0, 0, 0.45),
              0 2px 6px rgba(0, 0, 0, 0.32),
              0 6px 16px rgba(0, 0, 0, 0.28) !important;
            border: 2px solid #22c55e !important;
            background: #f0fdf4 !important;
          }

          .rejected-shadow {
            box-shadow:
              0 0 0 1px rgba(0, 0, 0, 0.45),
              0 2px 6px rgba(0, 0, 0, 0.32),
              0 6px 16px rgba(0, 0, 0, 0.28) !important;
            border: 2px solid #dc2626 !important;
            background: #fef2f2 !important;
          }

          .pending-shadow {
            box-shadow:
              0 0 0 1px rgba(0, 0, 0, 0.45),
              0 2px 6px rgba(0, 0, 0, 0.32),
              0 6px 16px rgba(0, 0, 0, 0.28) !important;
            border: 2px solid #2563eb !important;
            background: #eff6ff !important;
          }

          .approved-shadow .approval-title {
            background: #22c55e !important;
            color: white !important;
          }

          .rejected-shadow .approval-title {
            background: #dc2626 !important;
            color: white !important;
          }

          .pending-shadow .approval-title {
            background: #2563eb !important;
            color: white !important;
          }

          /* Watermark print optimization */
          .status-watermark {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1;
          }

          .approved-watermark .watermark-content,
          .rejected-watermark .watermark-content,
          .pending-watermark .watermark-content {
            opacity: 0.06;
          }

          .stamp-icon, .stamp-text, .stamp-date {
            text-shadow:
              1px 1px 0 rgba(0, 0, 0, 0.42),
              2px 3px 5px rgba(0, 0, 0, 0.32) !important;
          }
        }

        @media screen {
          .print-container {
            padding: 20px;
            background: #f5f5f5;
          }

          .page-content {
            box-shadow:
              0 0 0 1px rgba(0, 0, 0, 0.08),
              0 4px 22px rgba(0, 0, 0, 0.14),
              0 14px 40px rgba(0, 0, 0, 0.12);
          }
        }
      `}</style>
        </>
    );
}
