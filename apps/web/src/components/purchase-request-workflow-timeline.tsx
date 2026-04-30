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
  RefreshCw,
  RotateCcw,
  Send,
  ShoppingCart,
  XCircle,
  Undo2,
} from "lucide-react";

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
  // Hide the trailing "awaiting" pulse — useful in the approval modal where
  // the approver is about to make that decision.
  showCurrentState?: boolean;
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

  for (const entry of pr.resubmissionHistory ?? []) {
    entries.push({
      id: `resubmitted-${entry._id}`,
      date: entry.resubmittedAt,
      title: "Resubmitted",
      note: entry.note,
      levelLabel:
        APPROVAL_LEVEL_LABELS[entry.resumedAtLevel] ||
        `Level ${entry.resumedAtLevel}`,
      icon: <RefreshCw className="h-4 w-4 text-blue-600" />,
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
  showCurrentState = true,
}: PurchaseRequestWorkflowTimelineProps) {
  const entries = buildTimelineEntries(pr, approvalHistory, po);

  if (entries.length === 0) {
    return showCurrentState ? <CurrentState pr={pr} po={po} compact={compact} /> : null;
  }

  // Density variants share the same vertical-timeline layout, only the
  // spacing, icon size, and typography scale down for `compact`.
  const cls = compact
    ? {
        line: 'absolute left-[9px] top-[18px] bottom-6 w-px bg-zinc-200',
        listGap: 'space-y-3',
        rowGap: 'gap-2',
        iconWrap: 'mt-0.5 shrink-0 z-[1] rounded-full bg-white p-[2px]',
        title: 'text-[12px] font-semibold text-zinc-800',
        badge:
          'inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600',
        actor: 'text-[11px] text-zinc-500 mt-0.5',
        note: 'mt-1 text-[11px] leading-snug text-zinc-500 italic rounded-md bg-zinc-50 px-2.5 py-1.5 border border-zinc-100',
        date: 'mt-0.5 text-[10px] tabular-nums text-zinc-400',
        currentDotWrap: 'mt-0.5 shrink-0 z-[1] flex items-center justify-center w-[18px]',
      }
    : {
        line: 'absolute left-[11px] top-[22px] bottom-8 w-px bg-zinc-200',
        listGap: 'space-y-5',
        rowGap: 'gap-3',
        iconWrap: 'mt-0.5 shrink-0 z-[1] rounded-full bg-white p-[3px]',
        title: 'text-[13px] font-semibold text-zinc-800',
        badge:
          'inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600',
        actor: 'text-[12px] text-zinc-500 mt-0.5',
        note: 'mt-1.5 text-[12px] leading-relaxed text-zinc-500 italic rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-100',
        date: 'mt-1 text-[11px] tabular-nums text-zinc-400',
        currentDotWrap: 'mt-1 shrink-0 z-[1] flex items-center justify-center w-[22px]',
      };

  // Re-render entry icons at a smaller size in compact mode.
  const renderIcon = (icon: ReactNode) => {
    if (!compact) return icon;
    if (
      typeof icon === 'object' &&
      icon !== null &&
      'props' in (icon as object)
    ) {
      const el = icon as { type: unknown; props: { className?: string } };
      const next = (el.props.className ?? '').replace(/h-4 w-4/g, 'h-3.5 w-3.5');
      const Comp = el.type as React.ElementType;
      return <Comp {...el.props} className={next} />;
    }
    return icon;
  };

  return (
    <div className="relative">
      {entries.length > 1 && <div className={cls.line} />}
      <div className={cls.listGap}>
        {entries.map((entry) => (
          <div key={entry.id} className={`flex ${cls.rowGap} relative`}>
            <div className={cls.iconWrap}>{renderIcon(entry.icon)}</div>
            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-center gap-2">
                <span className={cls.title}>{entry.title}</span>
                {entry.levelLabel && (
                  <span className={cls.badge}>{entry.levelLabel}</span>
                )}
              </div>
              {entry.actor && <p className={cls.actor}>by {entry.actor}</p>}
              {entry.note && (
                <p className={cls.note}>&ldquo;{entry.note}&rdquo;</p>
              )}
              <p className={cls.date}>{formatDateTime(entry.date)}</p>
            </div>
          </div>
        ))}
        {showCurrentState && hasCurrentState(pr, po) && (
          <div className={`flex ${cls.rowGap} relative`}>
            <div className={cls.currentDotWrap}>
              <span className="block h-2 w-2 rounded-full bg-zinc-300 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <CurrentState pr={pr} po={po} compact={compact} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
