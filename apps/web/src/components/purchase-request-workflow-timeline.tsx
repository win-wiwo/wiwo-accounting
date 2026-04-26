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
import { Badge } from "@/components/ui/badge";
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

interface PurchaseRequestWorkflowTimelineProps {
  pr: PurchaseRequest;
  approvalHistory: ApprovalHistoryEntry[];
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

function buildTimelineEntries(
  pr: PurchaseRequest,
  approvalHistory: ApprovalHistoryEntry[],
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

  for (const entry of pr.quotationReturnHistory ?? []) {
    entries.push({
      id: `return-for-info-${entry._id}`,
      date: entry.returnedAt,
      title: "Returned for Info",
      actor: returnedByName(entry.returnedBy),
      note: entry.note,
      icon: <RotateCcw className="h-4 w-4 text-amber-600" />,
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

  return entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function CurrentState({ pr, compact = false }: { pr: PurchaseRequest; compact?: boolean }) {
  const currentStatus = normalizePrStatus(pr.status);
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

  return null;
}

export function PurchaseRequestWorkflowTimeline({
  pr,
  approvalHistory,
  compact = false,
}: PurchaseRequestWorkflowTimelineProps) {
  const entries = buildTimelineEntries(pr, approvalHistory);

  if (entries.length === 0) {
    return <CurrentState pr={pr} compact={compact} />;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {entries.map((entry, index) => (
        <div key={entry.id} className={compact ? "text-xs" : "flex gap-3"}>
          <div className={compact ? "flex items-center gap-1.5" : "mt-0.5"}>
            {entry.icon}
            {compact && <span className="font-medium">{entry.title}</span>}
          </div>
          <div className="flex-1 min-w-0">
            {!compact && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{entry.title}</span>
                {entry.levelLabel && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {entry.levelLabel}
                  </Badge>
                )}
              </div>
            )}
            {compact && entry.levelLabel && (
              <p className="text-muted-foreground mt-0.5">{entry.levelLabel}</p>
            )}
            {entry.actor && (
              <p className={compact ? "text-muted-foreground mt-0.5" : "text-xs text-muted-foreground"}>
                {compact ? entry.actor : `by ${entry.actor}`}
              </p>
            )}
            {entry.note && (
              <p
                className={
                  compact
                    ? "mt-1 italic text-muted-foreground"
                    : "mt-1 text-sm text-muted-foreground italic"
                }
              >
                {compact ? `"${entry.note}"` : `“${entry.note}”`}
              </p>
            )}
            <p
              className={
                compact
                  ? "mt-0.5 text-muted-foreground/60"
                  : "mt-0.5 text-[11px] text-muted-foreground/70"
              }
            >
              {formatDateTime(entry.date)}
            </p>
            {compact && index < entries.length - 1 && <Separator className="mt-2" />}
          </div>
        </div>
      ))}
      <CurrentState pr={pr} compact={compact} />
    </div>
  );
}
