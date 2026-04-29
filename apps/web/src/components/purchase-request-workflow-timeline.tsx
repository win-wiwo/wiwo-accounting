import type { ReactNode } from "react";
import {
  APPROVAL_LEVEL_LABELS,
  normalizePrStatus,
  PrStatus,
  type ApprovalHistoryEntry,
  type PurchaseRequest,
  type QuotationReturn,
  type RecallHistoryEntry,
} from "@prams/shared";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  ShoppingCart,
  XCircle,
  Undo2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type TimelineEntry = {
  id: string;
  date: string;
  title: string;
  actor?: string;
  note?: string | null;
  levelLabel?: string;
  icon: ReactNode;
};

type LinkedPoStatus = "pending" | "ordered" | "received" | "cancelled";

type LinkedPo = {
  status: LinkedPoStatus;
  receivedAt?: string | null;
  receivedBy?: string | { firstName: string; lastName: string } | null;
} | null;

interface PurchaseRequestWorkflowTimelineProps {
  pr: PurchaseRequest;
  approvalHistory: ApprovalHistoryEntry[];
  po?: LinkedPo;
  compact?: boolean;
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function approverName(approver: ApprovalHistoryEntry["approverId"]) {
  return typeof approver === "string"
    ? "Unknown approver"
    : `${approver.firstName} ${approver.lastName}`;
}

function returnedByName(returnedBy: QuotationReturn["returnedBy"]) {
  return typeof returnedBy === "string"
    ? "Procurement"
    : `${returnedBy.firstName} ${returnedBy.lastName}`;
}

function recalledByName(recalledBy: RecallHistoryEntry["recalledBy"]) {
  return typeof recalledBy === "string"
    ? "Requester"
    : `${recalledBy.firstName} ${recalledBy.lastName}`;
}

function poActorName(actor: string | { firstName: string; lastName: string } | null | undefined) {
  if (!actor || typeof actor === "string") return "Procurement";
  return `${actor.firstName} ${actor.lastName}`;
}

function buildTimelineEntries(
  pr: PurchaseRequest,
  approvalHistory: ApprovalHistoryEntry[],
  po: LinkedPo,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (pr.submittedAt) {
    entries.push({
      id: `submitted-${pr._id}`,
      date: pr.submittedAt,
      title: "Submitted",
      icon: <Send className="h-4 w-4 text-blue-600" />,
    });
  }

  for (const entry of approvalHistory) {
    const title =
      entry.action === "approved"
        ? "Approved"
        : entry.action === "rejected"
          ? "Rejected"
          : "Returned";

    entries.push({
      id: entry._id,
      date: entry.actionDate,
      title,
      actor: approverName(entry.approverId),
      note: entry.comments,
      levelLabel:
        APPROVAL_LEVEL_LABELS[entry.approvalLevel] ||
        `Level ${entry.approvalLevel}`,
      icon:
        entry.action === "approved" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : entry.action === "rejected" ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <RotateCcw className="h-4 w-4 text-amber-600" />
        ),
    });
  }


  for (const entry of pr.recallHistory ?? []) {
    entries.push({
      id: `recalled-${entry._id}`,
      date: entry.recalledAt,
      title: "Recalled to Draft",
      actor: recalledByName(entry.recalledBy),
      icon: <Undo2 className="h-4 w-4 text-slate-600" />,
    });
  }

  if (pr.status === PrStatus.CANCELLED && pr.cancellationReason) {
    entries.push({
      id: `cancelled-${pr._id}`,
      date: pr.updatedAt,
      title: "Cancelled",
      note: pr.cancellationReason,
      icon: <XCircle className="h-4 w-4 text-muted-foreground" />,
    });
  }

  if (po?.status === "received") {
    entries.push({
      id: `po-received-${pr._id}`,
      date: po.receivedAt || pr.updatedAt,
      title: "Completed",
      actor: poActorName(po.receivedBy),
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    });
  }

  if (po?.status === "cancelled") {
    entries.push({
      id: `po-cancelled-${pr._id}`,
      date: pr.updatedAt,
      title: "Purchase Order Cancelled",
      icon: <XCircle className="h-4 w-4 text-muted-foreground" />,
    });
  }

  return entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function hasCurrentState(pr: PurchaseRequest, po: LinkedPo): boolean {
  const currentStatus = normalizePrStatus(pr.status);
  const poStatus = po?.status ?? null;
  if (currentStatus === PrStatus.DRAFT) return true;
  if (currentStatus === PrStatus.PENDING_QUOTATION) return true;
  if (currentStatus === PrStatus.QUOTED) return true;
  if (
    currentStatus === PrStatus.LEVEL1_REVIEW ||
    currentStatus === PrStatus.LEVEL2_REVIEW ||
    currentStatus === PrStatus.LEVEL3_REVIEW
  ) {
    return true;
  }
  if (currentStatus === PrStatus.COMPLETED || currentStatus === PrStatus.APPROVED) {
    return poStatus !== "received" && poStatus !== "cancelled";
  }
  return false;
}

function CurrentState({
  pr,
  po = null,
  compact = false,
}: {
  pr: PurchaseRequest;
  po?: LinkedPo;
  compact?: boolean;
}) {
  const currentStatus = normalizePrStatus(pr.status);
  const poStatus = po?.status ?? null;
  const className = compact
    ? "flex items-center gap-2 text-xs text-muted-foreground"
    : "flex items-center gap-2 text-sm text-muted-foreground";

  if (currentStatus === PrStatus.DRAFT) {
    return (
      <p className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
        Submit this PR to start the workflow.
      </p>
    );
  }

  if (currentStatus === PrStatus.PENDING_QUOTATION) {
    return (
      <div className={className}>
        <ShoppingCart className={compact ? "h-3.5 w-3.5 text-emerald-600" : "h-4 w-4 text-emerald-600"} />
        <span>Approved. Procurement is sourcing suppliers.</span>
      </div>
    );
  }

  if (currentStatus === PrStatus.QUOTED) {
    return (
      <div className={className}>
        <Clock className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span>Awaiting COO price review.</span>
      </div>
    );
  }

  if (
    currentStatus === PrStatus.LEVEL1_REVIEW ||
    currentStatus === PrStatus.LEVEL2_REVIEW ||
    currentStatus === PrStatus.LEVEL3_REVIEW
  ) {
    return (
      <div className={className}>
        <Clock className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span>Awaiting the next approval decision.</span>
      </div>
    );
  }

  if (currentStatus === PrStatus.COMPLETED || currentStatus === PrStatus.APPROVED) {
    // Received and cancelled PO states are rendered as real timeline entries above.
    if (poStatus === "received" || poStatus === "cancelled") return null;
    return (
      <div className={className}>
        <ShoppingCart className={compact ? "h-3.5 w-3.5 text-emerald-600" : "h-4 w-4 text-emerald-600"} />
        <span>Purchase order in progress.</span>
      </div>
    );
  }

  return null;
}

export function PurchaseRequestWorkflowTimeline({
  pr,
  approvalHistory,
  po = null,
  compact = false,
}: PurchaseRequestWorkflowTimelineProps) {
  const entries = buildTimelineEntries(pr, approvalHistory, po);

  if (entries.length === 0) {
    return <CurrentState pr={pr} po={po} compact={compact} />;
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id} className="text-xs">
            <div className="flex items-center gap-1.5">
              {entry.icon}
              <span className="font-medium">{entry.title}</span>
            </div>
            <div className="flex-1 min-w-0">
              {entry.levelLabel && (
                <p className="text-muted-foreground mt-0.5">{entry.levelLabel}</p>
              )}
              {entry.actor && (
                <p className="text-muted-foreground mt-0.5">{entry.actor}</p>
              )}
              {entry.note && (
                <p className="mt-1 italic text-muted-foreground">&ldquo;{entry.note}&rdquo;</p>
              )}
              <p className="mt-0.5 text-muted-foreground/60">{formatDateTime(entry.date)}</p>
              {index < entries.length - 1 && <Separator className="mt-2" />}
            </div>
          </div>
        ))}
        <CurrentState pr={pr} po={po} compact />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      {entries.length > 1 && (
        <div className="absolute left-[11px] top-[22px] bottom-8 w-px bg-zinc-200" />
      )}
      <div className="space-y-5">
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-3 relative">
            <div className="mt-0.5 shrink-0 z-[1] rounded-full bg-white p-[3px]">
              {entry.icon}
            </div>
            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-zinc-800">{entry.title}</span>
                {entry.levelLabel && (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                    {entry.levelLabel}
                  </span>
                )}
              </div>
              {entry.actor && (
                <p className="text-[12px] text-zinc-500 mt-0.5">by {entry.actor}</p>
              )}
              {entry.note && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500 italic rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-100">
                  &ldquo;{entry.note}&rdquo;
                </p>
              )}
              <p className="mt-1 text-[11px] tabular-nums text-zinc-400">
                {formatDateTime(entry.date)}
              </p>
            </div>
          </div>
        ))}
        {/* Current state */}
        {hasCurrentState(pr, po) && (
          <div className="flex gap-3 relative">
            <div className="mt-1 shrink-0 z-[1] flex items-center justify-center w-[22px]">
              <span className="block h-2 w-2 rounded-full bg-zinc-300 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <CurrentState pr={pr} po={po} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
