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
  leaveType: LeaveType;
  approver: User | null;
  leaveBalance?: LeaveBalance;
  approvals?: LeaveApproval[];
}

interface PdfProps {
  application: LeaveApplication;
  currentDate: string;
}

export default function Pdf({ application, currentDate }: PdfProps) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get leave balance for current year and leave type
  const currentYear = new Date().getFullYear();
  const leaveBalance = application.leaveBalance;

  return (
    <>
      <Head title="Leave Application Form" />

      <div className="print-container">
        <div className="page-content">
          {/* Header Section - Centered */}
          <div className="header-section">
            <div className="company-logo">
              <img
                src="/mousumi.png"
                alt="Mousumi Logo"
                className="logo-image"
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="logo-fallback">
                <span className="logo-text">MOUSUMI</span>
              </div>
            </div>
            <div className="company-details">
              <h1 className="company-name">MOUSUMI</h1>
              <p className="company-location">Ukilpara, Naogaon</p>
            </div>
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

          {/* Addressee */}
          <div className="addressee-section">
            <p className="addressee-line">To,</p>
            <p className="addressee-title">Deputy Executive Director</p>
            <p className="addressee-company">Mousumi.</p>
          </div>

          {/* Subject */}
          <div className="subject-section">
            <p><strong>Subject:</strong> Application for {application.days} day{application.days > 1 ? 's' : ''} leave.</p>
          </div>

          {/* Main Content */}
          <div className="content-section">
            <p className="greeting">Dear Sir,</p>

            <p className="main-content">
              I am writing to inform you that I, the undersigned, would like to apply for {application.days} day{application.days > 1 ? 's ' : ' '}
              of {application.leaveType?.name || 'leave'} from {formatDateLong(application.start_date)} to {formatDateLong(application.end_date)}.
              During my leave period, I will be staying at my home address. If needed, please feel free to contact me at
              <span> {application.employee?.phone || '[Phone Number]'}</span>.
            </p>

            {application.reason && (
              <div className="reason-section">
                <p><strong>Reason for leave:</strong></p>
                <p className="reason-text">{application.reason}</p>
              </div>
            )}

            <p className="closing-content">
              Therefore, I kindly request you to grant me the above-mentioned {application.days} day{application.days > 1 ? 's ' : ' '}
              of desired leave.
            </p>
          </div>

          {/* Leave Information with Balance Data */}
          <div className="leave-info-section">
            <h3 className="info-title">Leave Information:</h3>
            <p className="leave-balance">
              Total leave taken in current year: {leaveBalance?.used_days || 0} days |
              Applied leave: {application.days} day{application.days > 1 ? 's' : ''} |
              Remaining balance: {leaveBalance?.remaining_days || 0} days
            </p>
          </div>

          {/* Employee Information */}
          <div className="employee-section">
            <div className="employee-info">
              <p className="respectfully">Employee Details:</p>
              <div className="employee-details">
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{application.employee?.first_name || ''} {application.employee?.last_name || ''}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Designation:</span>
                  <span className="detail-value">{application.employee?.designation?.name || ''}</span>
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
            <div className="approval-box">
              <h4 className="approval-title">Supervisor Review</h4>
              <div className="approval-content">
                <div className="digital-approval-info">
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">Pending Review</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Review Level:</span>
                    <span className="detail-value">Department Level</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`approval-box ${
              (application.status === 'approved' && 'approved-shadow') ||
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
                        <span className="detail-label">Reviewed By:</span>
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
              <p>This is a system-generated document. No physical signatures required.</p>
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
          font-size: 14px;
        }

        .page-content {
          max-width: 210mm;
          margin: 0 auto;
          padding: 12mm;
          background: white;
          min-height: calc(297mm - 24mm);
          position: relative;
        }

        .header-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin-bottom: 15px;
          gap: 8px;
        }

        .company-logo {
          position: relative;
          width: 60px;
          height: 60px;
        }

        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .logo-fallback {
          width: 60px;
          height: 60px;
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
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          line-height: 1.2;
        }

        .company-details {
          text-align: center;
        }

        .company-name {
          font-size: 22px;
          font-weight: bold;
          margin: 0 0 3px 0;
          letter-spacing: 2px;
        }

        .company-location {
          font-size: 14px;
          margin: 0;
          font-weight: normal;
        }

        .document-title-box {
          text-align: center;
          margin: 15px 0 12px 0;
          border: 2px solid #000;
          padding: 8px;
          position: relative;
        }

        .document-title {
          font-size: 16px;
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
          font-size: 10px;
          font-weight: bold;
        }

        .application-date {
          text-align: left;
          margin: 12px 0;
        }

        .application-date p {
          margin: 0;
          font-size: 13px;
        }

        .addressee-section {
          margin: 12px 0;
        }

        .addressee-line, .addressee-title, .addressee-company {
          margin: 3px 0;
          font-size: 13px;
        }

        .addressee-title {
          font-weight: bold;
        }

        .subject-section {
          margin: 12px 0;
        }

        .subject-section p {
          margin: 0;
          font-size: 13px;
        }

        .content-section {
          margin: 15px 0;
          text-align: justify;
        }

        .greeting {
          margin-bottom: 10px;
          font-size: 13px;
        }

        .main-content {
          margin-bottom: 10px;
          font-size: 13px;
          text-indent: 15px;
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
          font-size: 12px;
        }

        .closing-content {
          margin-top: 10px;
          font-size: 13px;
          text-indent: 15px;
          line-height: 1.4;
        }

        .leave-info-section {
          margin: 15px 0;
        }

        .info-title {
          font-size: 13px;
          font-weight: bold;
          margin: 0 0 5px 0;
        }

        .leave-balance {
          margin: 0;
          font-size: 12px;
          background: #f0f8ff;
          padding: 6px;
          border-left: 3px solid #2563eb;
          border-radius: 3px;
        }

        .employee-section {
          margin: 20px 0;
          max-width: 100%;
        }

        .respectfully {
          font-size: 13px;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .employee-details, .approval-details, .digital-approval-info {
          font-size: 11px;
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
          font-size: 11px;
        }

        .detail-value {
          flex: 1;
        }

        .detail-value.approved {
          color: #22c55e;
          font-weight: bold;
          font-size: 12px;
        }

        .detail-value.rejected {
          color: #dc2626;
          font-weight: bold;
          font-size: 12px;
        }

        .detail-value.pending {
          color: #2563eb;
          font-weight: bold;
          font-size: 12px;
        }

        .approval-section {
          margin: 25px 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .approval-box {
          border: 1px solid #000;
          padding: 0;
          transition: all 0.3s ease;
        }

        .approved-shadow {
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3);
          border-color: #22c55e;
          background: linear-gradient(145deg, #f0fdf4, #ffffff);
        }

        .rejected-shadow {
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
          border-color: #dc2626;
          background: linear-gradient(145deg, #fef2f2, #ffffff);
        }

        .pending-shadow {
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.3);
          border-color: #2563eb;
          background: linear-gradient(145deg, #eff6ff, #ffffff);
        }

        .approval-title {
          background: #f0f0f0;
          padding: 6px 8px;
          margin: 0;
          font-size: 11px;
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
          padding: 10px 8px;
        }

        .digital-approval-info {
          min-height: 60px;
        }

        .rejection-notice {
          margin-top: 20px;
          padding: 15px;
          border: 2px solid #dc2626;
          background: #fef2f2;
          text-align: center;
        }

        .rejection-notice h4 {
          color: #dc2626;
          margin: 0 0 10px 0;
          font-size: 16px;
        }

        .rejection-notice p {
          margin: 0;
          color: #7f1d1d;
        }

        .digital-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 10px;
          border-top: 1px solid #ccc;
          padding-top: 10px;
          background: #f8fafc;
          padding: 10px;
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
          font-size: 60px;
          font-weight: bold;
          margin-bottom: 5px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }

        .stamp-text {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 6px;
          margin-bottom: 5px;
          text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
        }

        .stamp-date {
          font-size: 14px;
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
            padding: 10mm;
            min-height: auto;
            position: relative;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          .header-section, .employee-section, .approval-section {
            break-inside: avoid;
          }

          /* Print-optimized colors */
          .approved-shadow {
            box-shadow: none !important;
            border: 2px solid #22c55e !important;
            background: #f0fdf4 !important;
          }

          .rejected-shadow {
            box-shadow: none !important;
            border: 2px solid #dc2626 !important;
            background: #fef2f2 !important;
          }

          .pending-shadow {
            box-shadow: none !important;
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
            text-shadow: none !important;
          }
        }

        @media screen {
          .print-container {
            padding: 20px;
            background: #f5f5f5;
          }

          .page-content {
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
        }
      `}</style>
    </>
  );
}
