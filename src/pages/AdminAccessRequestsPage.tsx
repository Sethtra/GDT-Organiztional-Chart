import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MailPlus,
  RotateCw,
  UserPlus,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import AdminSidebar from "../components/admin/AdminSidebar";
import MfaResetPanel from "../components/admin/MfaResetPanel";
import { StatusBadge } from "../components/admin/dashboard/DashboardPrimitives";
import type { AccessRequest, AccessRequestStatus } from "../contracts/accessRequest";
import { useAccessRequests } from "../hooks/useAccessRequests";
import { cn } from "../lib/utils";
import {
  approveAccessRequest,
  rejectAccessRequest,
} from "../services/accessRequestService";

const TABS: { status: AccessRequestStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

const EMPTY_MESSAGES: Record<AccessRequestStatus, string> = {
  pending: "No requests are waiting for review.",
  approved: "No requests have been approved yet.",
  rejected: "No requests have been rejected.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BUTTON_BASE =
  "pa-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

interface Notice {
  tone: "success" | "danger";
  text: string;
}

function RequestRow({
  request,
  onApproved,
  onRejected,
  onNotice,
}: {
  request: AccessRequest;
  onApproved: (request: AccessRequest, resent: boolean) => void;
  onRejected: (request: AccessRequest) => void;
  onNotice: (notice: Notice) => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const noteId = `reject-note-${request.id}`;

  const sendInvite = async () => {
    setBusy("approve");
    try {
      await approveAccessRequest(request.id);
      onApproved(request, request.status === "approved");
    } catch (error) {
      onNotice({
        tone: "danger",
        text: error instanceof Error ? error.message : "The invitation could not be sent.",
      });
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async () => {
    setBusy("reject");
    try {
      await rejectAccessRequest(request.id, note);
      onRejected(request);
    } catch (error) {
      onNotice({
        tone: "danger",
        text: error instanceof Error ? error.message : "The request could not be rejected.",
      });
      setBusy(null);
    }
  };

  return (
    <li className="border-b border-[var(--pa-border)] px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-[var(--pa-text)]">
            {request.fullName}
          </div>
          <dl className="mt-1.5 grid gap-x-6 gap-y-1 text-[12px] text-[var(--pa-muted)] sm:grid-cols-[auto_1fr]">
            <dt className="font-bold">Email</dt>
            <dd className="min-w-0 break-all text-[var(--pa-text)]">{request.email}</dd>
            <dt className="font-bold">Employee ID</dt>
            <dd className="pa-tabular text-[var(--pa-text)]">{request.employeeId}</dd>
            <dt className="font-bold">Submitted</dt>
            <dd>{formatDate(request.createdAt)}</dd>
            {request.reviewedAt && (
              <>
                <dt className="font-bold">Reviewed</dt>
                <dd>{formatDate(request.reviewedAt)}</dd>
              </>
            )}
            {request.reviewNote && (
              <>
                <dt className="font-bold">Note</dt>
                <dd className="text-[var(--pa-text)]">{request.reviewNote}</dd>
              </>
            )}
          </dl>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {request.matchedStaff ? (
              <StatusBadge tone="success">
                Matches staff record: {request.matchedStaff.name}
                {request.matchedStaff.status !== "active" ? ` (${request.matchedStaff.status})` : ""}
              </StatusBadge>
            ) : (
              <StatusBadge tone="warning">No staff record with this employee ID</StatusBadge>
            )}
            {request.accountStatus === "active" && (
              <StatusBadge tone="info">Account already active</StatusBadge>
            )}
            {request.accountStatus === "invited" && (
              <StatusBadge tone="neutral">Invitation not yet accepted</StatusBadge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {request.status === "pending" && !rejecting && (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={busy !== null}
                className={cn(BUTTON_BASE, "border border-[var(--pa-border)] bg-white text-[var(--pa-muted)] hover:text-[var(--pa-text)]")}
              >
                <X size={14} aria-hidden="true" /> Reject
              </button>
              <button
                type="button"
                onClick={sendInvite}
                disabled={busy !== null || request.accountStatus === "active"}
                className={cn(BUTTON_BASE, "bg-[var(--pa-primary)] text-white hover:bg-[var(--pa-primary-hover)]")}
              >
                {busy === "approve" ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <MailPlus size={14} aria-hidden="true" />
                )}
                Approve &amp; send invite
              </button>
            </>
          )}
          {request.status === "approved" && request.accountStatus === "invited" && (
            <button
              type="button"
              onClick={sendInvite}
              disabled={busy !== null}
              className={cn(BUTTON_BASE, "border border-[var(--pa-border)] bg-white text-[var(--pa-primary)] hover:border-[var(--pa-primary)]")}
            >
              {busy === "approve" ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <RotateCw size={14} aria-hidden="true" />
              )}
              Resend invitation
            </button>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-3">
          <label htmlFor={noteId} className="text-[12px] font-bold text-[var(--pa-text)]">
            Reason (optional, kept on the request for HR records)
          </label>
          <textarea
            id={noteId}
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-[var(--pa-border)] bg-white px-3 py-2 text-[12px] text-[var(--pa-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pa-primary)]/30"
          />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              disabled={busy !== null}
              className={cn(BUTTON_BASE, "border border-[var(--pa-border)] bg-white text-[var(--pa-muted)]")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmReject}
              disabled={busy !== null}
              className={cn(BUTTON_BASE, "bg-[var(--pa-danger)] text-white")}
            >
              {busy === "reject" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Confirm rejection
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function AdminAccessRequestsPage() {
  const [status, setStatus] = useState<AccessRequestStatus>("pending");
  const [notice, setNotice] = useState<Notice | null>(null);
  const { requests, loading, hasError, reload, removeRequest } = useAccessRequests(status);

  const handleApproved = (request: AccessRequest, resent: boolean) => {
    if (!resent) removeRequest(request.id);
    setNotice({
      tone: "success",
      text: resent
        ? `Invitation re-sent to ${request.email}.`
        : `Approved. An invitation was sent to ${request.email}.`,
    });
  };

  const handleRejected = (request: AccessRequest) => {
    removeRequest(request.id);
    setNotice({ tone: "success", text: `Request from ${request.fullName} was rejected.` });
  };

  return (
    <div className="admin-dashboard-test flex h-dvh overflow-hidden bg-[var(--pa-canvas)]">
      <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex">
        <AdminSidebar currentTab="access" />
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--pa-border)] bg-white px-5 py-4 sm:px-7">
          <Link
            to="/admin"
            className="pa-focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--pa-border)] text-[var(--pa-muted)] no-underline transition-colors hover:bg-[var(--pa-canvas)]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </Link>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
            <UserPlus size={14} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold tracking-[-0.02em] text-[var(--pa-text)]">
              Access requests
            </h1>
            <p className="text-[11px] text-[var(--pa-muted)]">
              Approve staff to send them an account invitation
            </p>
          </div>
        </header>

        <main className="pa-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-7 lg:px-10">
            <MfaResetPanel />

            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter requests by status">
              {TABS.map((tab) => (
                <button
                  key={tab.status}
                  type="button"
                  onClick={() => {
                    setStatus(tab.status);
                    setNotice(null);
                  }}
                  aria-pressed={status === tab.status}
                  className={cn(
                    "pa-focus-ring inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-bold transition-colors",
                    status === tab.status
                      ? "border-[var(--pa-primary)] bg-[var(--pa-primary)] text-white"
                      : "border-[var(--pa-border)] bg-white text-[var(--pa-muted)] hover:border-[var(--pa-primary)] hover:text-[var(--pa-primary)]",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div aria-live="polite">
              {notice && (
                <div
                  className={cn(
                    "mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-[12px] font-bold",
                    notice.tone === "success"
                      ? "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
                      : "border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]",
                  )}
                >
                  {notice.tone === "success" ? (
                    <CheckCircle2 size={15} className="mt-px shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertCircle size={15} className="mt-px shrink-0" aria-hidden="true" />
                  )}
                  <span>{notice.text}</span>
                </div>
              )}
            </div>

            <section
              aria-label={`${status} access requests`}
              aria-busy={loading}
              className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-12 text-[12px] font-semibold text-[var(--pa-muted)]">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Loading requests…
                </div>
              ) : hasError ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <AlertCircle size={22} className="text-[var(--pa-danger)]" aria-hidden="true" />
                  <p className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
                    Access requests could not be loaded
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    className={cn(BUTTON_BASE, "mt-3 border border-[var(--pa-border)] bg-white text-[var(--pa-text)]")}
                  >
                    <RotateCw size={14} aria-hidden="true" /> Try again
                  </button>
                </div>
              ) : requests.length === 0 ? (
                <p className="px-6 py-12 text-center text-[13px] font-semibold text-[var(--pa-muted)]">
                  {EMPTY_MESSAGES[status]}
                </p>
              ) : (
                <ul>
                  {requests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      onApproved={handleApproved}
                      onRejected={handleRejected}
                      onNotice={setNotice}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
