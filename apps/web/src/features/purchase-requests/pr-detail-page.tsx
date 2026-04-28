import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Send,
  Trash2,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Undo2,
  Ban,
  Paperclip,
  Loader2,
  FileText,
  AlertCircle,
  ShoppingCart,
  Camera,
  ImageIcon,
  Clock3,
} from "lucide-react";
import {
  normalizePrStatus,
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  PrStatus,
  SourcingType,
  UserRole,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
  type PreviousSubmissionSnapshot,
  type PrLineItem,
  type ClarificationReply,
  type QuotationReturn,
} from "@prams/shared";
import {
  usePurchaseRequest,
  useSubmitPr,
  useDeletePr,
  useRecallPr,
  useCancelPr,
  useReplyToClarification,
  useUpdateItemSpecs,
} from "@/hooks/use-purchase-requests";
import { purchaseRequestsApi } from "@/lib/api-services";
import apiClient from "@/lib/api-client";
import { useApprovalHistory, useProcessApproval } from "@/hooks/use-approvals";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/components/ui/toast";
import { PurchaseRequestWorkflowTimeline } from "@/components/purchase-request-workflow-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Resubmission Diff ──────────────────────────────────────────────────────

type SnapshotItem = PreviousSubmissionSnapshot["items"][number];

function diffItems(
  oldItems: SnapshotItem[],
  newItems: PrLineItem[],
): Array<{
  type: "unchanged" | "changed" | "removed" | "added";
  old?: SnapshotItem;
  new?: PrLineItem;
}> {
  const oldById = new Map(oldItems.map((i) => [i._id, i]));
  const newById = new Map(newItems.map((i) => [i._id, i]));
  const results: ReturnType<typeof diffItems> = [];

  for (const old of oldItems) {
    const cur = newById.get(old._id);
    if (!cur) {
      results.push({ type: "removed", old });
    } else {
      const changed =
        old.description !== cur.description ||
        old.quantity !== cur.quantity ||
        old.unit !== cur.unit ||
        old.sourcingType !== cur.sourcingType ||
        old.estimatedPrice !== cur.estimatedPrice;
      results.push({ type: changed ? "changed" : "unchanged", old, new: cur });
    }
  }

  for (const cur of newItems) {
    if (!oldById.has(cur._id)) {
      results.push({ type: "added", new: cur });
    }
  }

  return results;
}

interface ResubmissionChangesProps {
  snapshot: PreviousSubmissionSnapshot;
  note: string | null | undefined;
  currentTitle: string;
  currentPriority: string;
  currentJustification: string;
  currentItems: PrLineItem[];
}

function ResubmissionChanges({
  snapshot,
  note,
  currentTitle,
  currentPriority,
  currentJustification,
  currentItems,
}: ResubmissionChangesProps) {
  const itemDiffs = diffItems(snapshot.items, currentItems);
  const titleChanged = snapshot.title !== currentTitle;
  const priorityChanged = snapshot.priority !== currentPriority;
  const justificationChanged = snapshot.justification !== currentJustification;
  const hasFieldChanges =
    titleChanged || priorityChanged || justificationChanged;
  const hasItemChanges = itemDiffs.some((d) => d.type !== "unchanged");

  return (
    <Card className="border-blue-300 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Changes from Previous Submission
        </CardTitle>
        {note && (
          <div className="mt-2 rounded-md border border-blue-200 bg-white px-3 py-2">
            <p className="text-xs font-medium text-blue-700 mb-0.5">
              Requester's note
            </p>
            <p className="text-sm text-foreground">{note}</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {hasFieldChanges && (
          <div className="space-y-2">
            {titleChanged && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Title
                </p>
                <p className="text-xs line-through text-red-600 bg-red-50 rounded px-2 py-1">
                  {snapshot.title}
                </p>
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                  {currentTitle}
                </p>
              </div>
            )}
            {priorityChanged && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Priority
                </p>
                <p className="text-xs line-through text-red-600 bg-red-50 rounded px-2 py-1 capitalize">
                  {snapshot.priority}
                </p>
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 capitalize">
                  {currentPriority}
                </p>
              </div>
            )}
            {justificationChanged && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Purpose
                </p>
                <p className="text-xs line-through text-red-600 bg-red-50 rounded px-2 py-1">
                  {snapshot.justification}
                </p>
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                  {currentJustification}
                </p>
              </div>
            )}
          </div>
        )}

        {hasItemChanges && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Line Items
            </p>
            {itemDiffs
              .filter((d) => d.type !== "unchanged")
              .map((diff, i) => (
                <div
                  key={i}
                  className="rounded-md border text-xs overflow-hidden"
                >
                  {diff.type === "removed" && diff.old && (
                    <div className="bg-red-50 border-red-200 px-3 py-2 line-through text-red-700">
                      <span className="font-medium">
                        {diff.old.description}
                      </span>
                      {" — "}
                      {diff.old.quantity} {diff.old.unit}
                      {diff.old.estimatedPrice > 0 &&
                        ` · ₱${diff.old.estimatedPrice.toLocaleString()}/unit`}
                      <span className="ml-1 text-[10px] no-underline not-italic font-medium bg-red-200 text-red-800 rounded px-1">
                        removed
                      </span>
                    </div>
                  )}
                  {diff.type === "added" && diff.new && (
                    <div className="bg-green-50 border-green-200 px-3 py-2 text-green-700">
                      <span className="font-medium">
                        {diff.new.description}
                      </span>
                      {" — "}
                      {diff.new.quantity} {diff.new.unit}
                      {(diff.new.estimatedPrice ?? 0) > 0 &&
                        ` · ₱${(diff.new.estimatedPrice ?? 0).toLocaleString()}/unit`}
                      <span className="ml-1 text-[10px] font-medium bg-green-200 text-green-800 rounded px-1">
                        added
                      </span>
                    </div>
                  )}
                  {diff.type === "changed" && diff.old && diff.new && (
                    <div>
                      <div className="bg-red-50 px-3 py-1.5 line-through text-red-700">
                        <span className="font-medium">
                          {diff.old.description}
                        </span>
                        {" — "}
                        {diff.old.quantity} {diff.old.unit}
                        {diff.old.estimatedPrice > 0 &&
                          ` · ₱${diff.old.estimatedPrice.toLocaleString()}/unit`}
                      </div>
                      <div className="bg-green-50 px-3 py-1.5 text-green-700">
                        <span className="font-medium">
                          {diff.new.description}
                        </span>
                        {" — "}
                        {diff.new.quantity} {diff.new.unit}
                        {(diff.new.estimatedPrice ?? 0) > 0 &&
                          ` · ₱${(diff.new.estimatedPrice ?? 0).toLocaleString()}/unit`}
                        <span className="ml-1 text-[10px] font-medium bg-amber-200 text-amber-800 rounded px-1">
                          modified
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {!hasFieldChanges && !hasItemChanges && (
          <p className="text-xs text-muted-foreground">
            No tracked field changes detected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ── Semantic badge styles (matches list page system) ── */
const statusStyle: Record<string, string> = {
  draft:              'bg-zinc-100 text-zinc-600',
  submitted:          'bg-blue-50 text-blue-700',
  level1_review:      'bg-blue-50 text-blue-700',
  level2_review:      'bg-blue-50 text-blue-700',
  level3_review:      'bg-indigo-50 text-indigo-700',
  pending_quotation:  'bg-violet-50 text-violet-700',
  quoted:             'bg-violet-50 text-violet-700',
  approved:           'bg-emerald-50 text-emerald-700',
  rejected:           'bg-red-50 text-red-600',
  returned:           'bg-amber-50 text-amber-700',
  returned_for_info:  'bg-amber-50 text-amber-700',
  cancelled:          'bg-zinc-100 text-zinc-500',
};

const priorityStyle: Record<string, string> = {
  low:    'bg-zinc-100 text-zinc-500',
  medium: 'bg-blue-50 text-blue-600',
  high:   'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-600',
};

export function PrDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = usePurchaseRequest(id!);
  const submitMutation = useSubmitPr();
  const deleteMutation = useDeletePr();
  const recallMutation = useRecallPr();
  const cancelMutation = useCancelPr();
  const processApproval = useProcessApproval();

  const pr = data?.data;
  const { data: approvalHistoryData } = useApprovalHistory(id!);
  const approvalHistory = approvalHistoryData?.data ?? [];

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "submit" | "delete" | "recall";
  }>({ open: false, type: "submit" });

  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [replyNote, setReplyNote] = useState("");
  const replyMutation = useReplyToClarification();

  const [editSpecsOpen, setEditSpecsOpen] = useState(false);
  const [editSpecsDraft, setEditSpecsDraft] = useState<Array<{ itemId: string; description: string; specifications: string }>>([]);
  const updateItemSpecsMutation = useUpdateItemSpecs();

  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action: "approved" | "rejected" | "returned";
  }>({ open: false, action: "approved" });
  const [approvalComments, setApprovalComments] = useState("");

  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    url: string | null;
    mimeType: string;
    name: string;
    loading: boolean;
  }>({ open: false, url: null, mimeType: "", name: "", loading: false });

  const [itemPhotoDialog, setItemPhotoDialog] = useState<{
    open: boolean;
    url: string | null;
    loading: boolean;
  }>({ open: false, url: null, loading: false });

  const handleConfirm = async () => {
    if (!pr) return;
    try {
      if (confirmDialog.type === "submit") {
        await submitMutation.mutateAsync(pr._id);
        toast({ title: "PR submitted for approval", variant: "success" });
      } else if (confirmDialog.type === "recall") {
        await recallMutation.mutateAsync(pr._id);
        toast({ title: "PR recalled to draft", variant: "success" });
      } else {
        await deleteMutation.mutateAsync(pr._id);
        toast({ title: "PR deleted", variant: "success" });
        navigate("/purchase-requests");
        return;
      }
    } catch {
      toast({ title: "Action failed", variant: "error" });
    }
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const handleCancel = async () => {
    if (!pr || !cancelReason.trim()) {
      toast({ title: "Please provide a reason", variant: "error" });
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        id: pr._id,
        reason: cancelReason.trim(),
      });
      toast({ title: "PR cancelled", variant: "success" });
    } catch {
      toast({ title: "Failed to cancel", variant: "error" });
    }
    setCancelDialog(false);
    setCancelReason("");
  };


  const closePreview = () => {
    if (previewDialog.url) URL.revokeObjectURL(previewDialog.url);
    setPreviewDialog({
      open: false,
      url: null,
      mimeType: "",
      name: "",
      loading: false,
    });
  };

  const handleViewItemPhoto = async (itemId: string) => {
    if (!pr) return;
    setItemPhotoDialog({ open: true, url: null, loading: true });
    try {
      const blob = await purchaseRequestsApi.fetchItemPhoto(pr._id, itemId);
      const url = URL.createObjectURL(blob);
      setItemPhotoDialog({ open: true, url, loading: false });
    } catch {
      setItemPhotoDialog({ open: false, url: null, loading: false });
      toast({ title: "Failed to load photo", variant: "error" });
    }
  };

  const closeItemPhotoDialog = () => {
    if (itemPhotoDialog.url) URL.revokeObjectURL(itemPhotoDialog.url);
    setItemPhotoDialog({ open: false, url: null, loading: false });
  };

  const handleApprovalAction = async () => {
    if (!pr) return;
    if (
      (approvalDialog.action === "rejected" ||
        approvalDialog.action === "returned") &&
      !approvalComments.trim()
    ) {
      toast({ title: "Comments are required", variant: "error" });
      return;
    }

    try {
      await processApproval.mutateAsync({
        purchaseRequestId: pr._id,
        action: approvalDialog.action,
        comments: approvalComments.trim(),
      });

      const toastConfig = {
        approved: {
          title: 'Purchase Request Approved',
          description: 'Moved to the next approval stage',
          variant: 'success' as const,
        },
        rejected: {
          title: 'Purchase Request Rejected',
          description: 'The requester has been notified',
          variant: 'error' as const,
        },
        returned: {
          title: 'Returned for Revision',
          description: 'The requester will update and resubmit',
          variant: 'warning' as const,
        },
      };
      toast(toastConfig[approvalDialog.action]);
    } catch {
      toast({ title: "Action failed", variant: "error" });
    }

    setApprovalDialog({ ...approvalDialog, open: false });
    setApprovalComments("");
  };

  const handleGenerateReport = async () => {
    if (!pr) return;
    try {
      const response = await apiClient.get(`/reports/pr-detail/${id}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `PR-${pr.prNumber || "Draft"}-Report.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "Report downloaded", variant: "success" });
    } catch {
      toast({ title: "Failed to generate report", variant: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-6 w-80 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!pr) {
    return <EmptyState title="Purchase request not found" />;
  }

  const requester = pr.requesterId as unknown as {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
  } | null;
  const department = pr.departmentId as unknown as {
    _id: string;
    name: string;
    code: string;
  } | null;
  const runtimeStatus = normalizePrStatus(pr.status) as PrStatusType;
  const isDraft = runtimeStatus === PrStatus.DRAFT;
  const isReturned = runtimeStatus === PrStatus.RETURNED;
  const isReturnedForInfo = runtimeStatus === PrStatus.RETURNED_FOR_INFO;
  const isCancelled = runtimeStatus === PrStatus.CANCELLED;
  const isOwner = requester?._id === user?._id;
  const canEdit = isOwner && (isDraft || isReturned || isReturnedForInfo);
  const canEditSpecs = isOwner && runtimeStatus === PrStatus.PENDING_QUOTATION;
  const canRecall =
    isOwner &&
    (runtimeStatus === PrStatus.LEVEL1_REVIEW ||
      runtimeStatus === PrStatus.LEVEL2_REVIEW ||
      isReturnedForInfo);
  const canCancel =
    isOwner &&
    (isDraft ||
      runtimeStatus === PrStatus.LEVEL1_REVIEW ||
      runtimeStatus === PrStatus.LEVEL2_REVIEW ||
      isReturnedForInfo);

  // Determine if the current user can act on this PR as an approver
  const pendingStatuses: string[] = [
    PrStatus.QUOTED,
    PrStatus.LEVEL1_REVIEW,
    PrStatus.LEVEL2_REVIEW,
    PrStatus.LEVEL3_REVIEW,
  ];
  const isPendingApproval = pendingStatuses.includes(runtimeStatus);
  const canApprove =
    isPendingApproval &&
    !isOwner &&
    ((runtimeStatus === PrStatus.LEVEL1_REVIEW &&
      user?.role === UserRole.DEPT_HEAD) ||
      ((runtimeStatus === PrStatus.LEVEL2_REVIEW ||
        runtimeStatus === PrStatus.QUOTED) &&
        user?.role === UserRole.COO) ||
      (runtimeStatus === PrStatus.LEVEL3_REVIEW &&
        user?.role === UserRole.CEO));

  const isPriceReview = runtimeStatus === PrStatus.QUOTED;
  const hasProcurementItems = pr.items.some((i) => i.sourcingType === SourcingType.PROCUREMENT);
  const hasUnquotedItems = hasProcurementItems && pr.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT).some((i) => !i.quotedUnitPrice);

  // Approval level → who currently owns this
  const approvalOwnerLabel = (() => {
    if (runtimeStatus === PrStatus.LEVEL1_REVIEW) return "Department Head";
    if (runtimeStatus === PrStatus.LEVEL2_REVIEW) return "COO";
    if (runtimeStatus === PrStatus.LEVEL3_REVIEW) return "CEO";
    return null;
  })();

  const stagePresentation = (() => {
    if (runtimeStatus === PrStatus.DRAFT) {
      return {
        title: "Draft — Not Yet Submitted",
        nextStep: canEdit ? "Fill in all required fields, then submit for approval." : "Awaiting submission by requester.",
        icon: <Pencil className="h-4 w-4" />,
        tone: "border-slate-200 bg-slate-50/80 text-slate-800",
      };
    }
    if (runtimeStatus === PrStatus.PENDING_QUOTATION) {
      return {
        title: "Approved — Awaiting Procurement Pricing",
        nextStep: "Procurement is sourcing suppliers. The COO will review final pricing before completion.",
        icon: <ShoppingCart className="h-4 w-4" />,
        tone: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
      };
    }
    if (runtimeStatus === PrStatus.QUOTED) {
      return {
        title: canApprove ? "Price Review — Action Required" : "Awaiting COO Price Review",
        nextStep: canApprove
          ? "Procurement has submitted supplier quotes. Review the canvass comparison and approve or return."
          : "Procurement quotes submitted. COO is validating supplier selection and final pricing.",
        icon: <Clock3 className="h-4 w-4" />,
        tone: "border-blue-200 bg-blue-50/60 text-blue-900",
      };
    }
    if (runtimeStatus === PrStatus.LEVEL1_REVIEW || runtimeStatus === PrStatus.LEVEL2_REVIEW || runtimeStatus === PrStatus.LEVEL3_REVIEW) {
      const ownerLabel = approvalOwnerLabel;
      return {
        title: canApprove ? `Your Decision Is Needed` : `Awaiting ${ownerLabel ?? "Approver"}`,
        nextStep: canApprove
          ? "Review the business need, line items, and priority before taking action."
          : `Waiting for ${ownerLabel ?? "the next approver"} to review this request.`,
        icon: <Clock3 className="h-4 w-4" />,
        tone: "border-blue-200 bg-blue-50/60 text-blue-900",
      };
    }
    if (runtimeStatus === PrStatus.RETURNED_FOR_INFO) {
      return {
        title: "Procurement Has a Question",
        nextStep: "Procurement needs clarification on this request. See the Clarification History below for details. No resubmission needed.",
        icon: <RotateCcw className="h-4 w-4" />,
        tone: "border-amber-200 bg-amber-50/60 text-amber-900",
      };
    }
    if (runtimeStatus === PrStatus.RETURNED) {
      return {
        title: "Returned for Revision",
        nextStep: "An approver returned this request. Review the timeline for comments, update, and resubmit.",
        icon: <RotateCcw className="h-4 w-4" />,
        tone: "border-amber-200 bg-amber-50/60 text-amber-900",
      };
    }
    if (runtimeStatus === PrStatus.APPROVED) {
      return {
        title: "Fully Approved",
        nextStep: "This request is approved and ready for purchasing. The complete workflow history is below.",
        icon: <CheckCircle2 className="h-4 w-4" />,
        tone: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
      };
    }
    if (runtimeStatus === PrStatus.REJECTED) {
      return {
        title: "Request Rejected",
        nextStep: "The workflow has ended. See the approval timeline for the reason.",
        icon: <XCircle className="h-4 w-4" />,
        tone: "border-destructive/20 bg-destructive/5 text-destructive",
      };
    }
    if (runtimeStatus === PrStatus.CANCELLED) {
      return {
        title: "Request Cancelled",
        nextStep: "This request was cancelled. The reason is shown below.",
        icon: <Ban className="h-4 w-4" />,
        tone: "border-slate-200 bg-slate-50/80 text-slate-700",
      };
    }
    return {
      title: "Workflow Active",
      nextStep: "Review the request details and timeline below.",
      icon: <FileText className="h-4 w-4" />,
      tone: "border-border bg-muted/40 text-foreground",
    };
  })();

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* ── Sticky header ──────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 bg-white/95 backdrop-blur-sm px-4 py-3 border-b border-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            {/* Breadcrumb */}
            <button
              className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors duration-150 mb-1.5"
              onClick={() => navigate("/purchase-requests")}
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Purchase Requests</span>
              {pr.prNumber && (
                <><span className="text-zinc-300">/</span><span className="font-mono text-zinc-500">{pr.prNumber}</span></>
              )}
            </button>
            {/* Title + badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[18px] font-bold tracking-[-0.01em] leading-tight text-zinc-900 truncate max-w-[480px]">{pr.title}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${statusStyle[pr.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                {PR_STATUS_LABELS[pr.status as PrStatusType]}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${priorityStyle[pr.priority] ?? 'bg-zinc-100 text-zinc-500'}`}>
                {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
              </span>
            </div>
            {/* Amount + needed by */}
            <div className="flex items-center gap-2.5 mt-1.5 text-[13px]">
              {hasProcurementItems && hasUnquotedItems ? (
                <span className="text-amber-600 font-semibold">Pending Quote</span>
              ) : (
                <span className="font-semibold tabular-nums text-zinc-800">
                  {formatCurrency(pr.items.reduce((s, i) => s + (i.totalPrice ?? 0), 0))}
                </span>
              )}
              {pr.neededByDate && (
                <span className="text-zinc-400 text-[12px]">· Needed {formatDate(pr.neededByDate)}</span>
              )}
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isDraft && (
              <Button size="sm" variant="outline" className="rounded-lg text-[13px] h-8" onClick={handleGenerateReport}>
                <FileText className="h-3.5 w-3.5" /> Report
              </Button>
            )}
            {canEditSpecs && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-[13px] h-8"
                onClick={() => {
                  setEditSpecsDraft(pr.items.map((item) => ({
                    itemId: item._id,
                    description: item.description,
                    specifications: item.specifications ?? '',
                  })));
                  setEditSpecsOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Update Item Details
              </Button>
            )}
            {canEdit && (
              <>
                <Button size="sm" variant="outline" className="rounded-lg text-[13px] h-8" onClick={() => navigate(`/purchase-requests/${id}/edit`)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg h-8 px-3.5 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
                  style={{ background: 'linear-gradient(155deg, #262626 0%, #0d0d0d 100%)', boxShadow: '0 1px 2px rgba(0,0,0,0.14), 0 3px 8px rgba(0,0,0,0.1)' }}
                  onClick={() => setConfirmDialog({ open: true, type: "submit" })}
                >
                  <Send className="h-3.5 w-3.5" /> Submit
                </button>
              </>
            )}
            {canRecall && (
              <Button size="sm" variant="outline" className="rounded-lg text-[13px] h-8" onClick={() => setConfirmDialog({ open: true, type: "recall" })}>
                <Undo2 className="h-3.5 w-3.5" /> Recall
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-[13px] h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => { setCancelReason(""); setCancelDialog(true); }}
              >
                <Ban className="h-3.5 w-3.5" /> Cancel
              </Button>
            )}
            {isOwner && isDraft && (
              <Button size="sm" variant="destructive" className="rounded-lg text-[13px] h-8" onClick={() => setConfirmDialog({ open: true, type: "delete" })}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            {canApprove && (
              <>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg h-8 px-4 text-[13px] font-semibold text-white bg-emerald-600 transition-all duration-200 hover:bg-emerald-700 hover:-translate-y-px hover:shadow-md"
                  onClick={() => { setApprovalComments(""); setApprovalDialog({ open: true, action: "approved" }); }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isPriceReview ? "Approve Pricing" : "Approve"}
                </button>
                <Button size="sm" variant="outline" className="rounded-lg text-[13px] h-8" onClick={() => { setApprovalComments(""); setApprovalDialog({ open: true, action: "returned" }); }}>
                  <RotateCcw className="h-3.5 w-3.5" /> Return
                </Button>
                <Button size="sm" variant="destructive" className="rounded-lg text-[13px] h-8" onClick={() => { setApprovalComments(""); setApprovalDialog({ open: true, action: "rejected" }); }}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Status banner ──────────────────────────────────── */}
      <div className={`pr-detail-section flex items-start gap-3.5 rounded-xl border px-5 py-4 ${stagePresentation.tone}`} style={{ animationDelay: '0s' }}>
        <div className="rounded-lg bg-white/70 p-2 mt-0.5 shrink-0 shadow-sm">
          {stagePresentation.icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-tight">{stagePresentation.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed opacity-70">{stagePresentation.nextStep}</p>
        </div>
      </div>

      {/* ── Details ───────────────────────────────────────── */}
      <div className="pr-detail-section grid gap-6 xl:grid-cols-[1fr_360px]" style={{ animationDelay: '0.06s' }}>
        <div className="space-y-6">
          {/* Line Items */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">Line Items</h2>
              <p className="mt-1 text-[12px] text-zinc-400 leading-relaxed">
                Procurement-sourced items remain unpriced until canvass is complete.
              </p>
            </div>
            <div className="space-y-3 px-5 pb-5">
              {pr.items.map((item, i) => {
                const isProcurement =
                  item.sourcingType === SourcingType.PROCUREMENT;
                const displayPrice = isProcurement
                  ? (item.quotedUnitPrice ?? 0)
                  : (item.estimatedPrice ?? 0);
                const unitPriceLabel =
                  isProcurement && !item.quotedUnitPrice
                    ? "Pending quotation"
                    : formatCurrency(displayPrice);
                const totalLabel =
                  item.totalPrice > 0 ? formatCurrency(item.totalPrice) : "TBQ";

                return (
                  <div
                    key={item._id}
                    className="rounded-xl border border-zinc-100 bg-white p-5 transition-all duration-150 hover:border-zinc-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                            Item {i + 1}
                          </span>
                          {isProcurement ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              <ShoppingCart className="h-2.5 w-2.5" />
                              Procurement
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                              Online
                            </span>
                          )}
                        </div>
                        <p className="text-[14px] font-semibold leading-snug text-zinc-900">
                          {item.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-1 min-w-[120px]">
                        <p className="text-[12px] text-zinc-400 tabular-nums">
                          {item.quantity} {item.unit}
                          {unitPriceLabel !== "Pending quotation" && (
                            <span className="ml-1">× {unitPriceLabel}</span>
                          )}
                        </p>
                        <p className={`text-[15px] font-bold tabular-nums ${totalLabel === "TBQ" ? "text-amber-600" : "text-zinc-900"}`}>
                          {totalLabel === "TBQ" ? "Pending Quote" : totalLabel}
                        </p>
                        {unitPriceLabel === "Pending quotation" && (
                          <p className="text-[11px] text-amber-500">Awaiting canvass</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.referencePhotoPath && (
                        <button
                          type="button"
                          onClick={() => handleViewItemPhoto(item._id)}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <Camera className="h-3 w-3" />
                          Reference photo
                        </button>
                      )}
                      {isProcurement &&
                        item.quotedUnitPrice &&
                        item.quotedAt && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Quoted {formatDate(item.quotedAt)}
                          </span>
                        )}
                      {typeof item.selectedSupplierId === "object" &&
                        item.selectedSupplierId?.companyName && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            Supplier: {item.selectedSupplierId.companyName}
                          </span>
                        )}
                    </div>

                    {(item.specifications || item.notes) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {item.specifications && (
                          <div className="rounded-lg bg-muted/30 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Specifications
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.specifications}
                            </p>
                          </div>
                        )}
                        {item.notes && (
                          <div className="rounded-lg bg-muted/30 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Notes
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {!isProcurement &&
                      item.sellerReferences &&
                      item.sellerReferences.length > 0 && (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-blue-700">
                            Seller References
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {item.sellerReferences.map((ref, ri) => (
                              <div
                                key={ri}
                                className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                              >
                                <span className="truncate">
                                  {ref.url ? (
                                    <a
                                      href={ref.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-700 hover:underline"
                                    >
                                      {ref.sellerName}
                                    </a>
                                  ) : (
                                    ref.sellerName
                                  )}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {formatCurrency(ref.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {item.sellerReferencesJustification && (
                            <p className="mt-2 flex items-start gap-1 text-xs text-amber-700">
                              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{item.sellerReferencesJustification}</span>
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}

              {/* ── Financial Summary ────────────────────────── */}
              <div className="border-t border-zinc-100 mx-5 pt-5 pb-2">
                {(() => {
                  const onlineItems = pr.items.filter((i) => i.sourcingType !== SourcingType.PROCUREMENT);
                  const procurementItems = pr.items.filter((i) => i.sourcingType === SourcingType.PROCUREMENT);
                  const quotedProcItems = procurementItems.filter((i) => i.quotedUnitPrice);
                  const unquoted = procurementItems.filter((i) => !i.quotedUnitPrice);
                  const onlineTotal = onlineItems.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
                  const quotedTotal = quotedProcItems.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
                  const knownTotal = onlineTotal + quotedTotal;
                  const allUnquoted = procurementItems.length > 0 && unquoted.length === procurementItems.length;

                  return (
                    <div className="space-y-2.5">
                      {/* Line breakdown */}
                      <div className="space-y-1.5">
                        {onlineItems.length > 0 && (
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-zinc-500">{onlineItems.length} online item{onlineItems.length > 1 ? 's' : ''}</span>
                            <span className="font-medium tabular-nums text-zinc-700">{formatCurrency(onlineTotal)}</span>
                          </div>
                        )}
                        {quotedProcItems.length > 0 && (
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-zinc-500">{quotedProcItems.length} quoted procurement item{quotedProcItems.length > 1 ? 's' : ''}</span>
                            <span className="font-medium tabular-nums text-zinc-700">{formatCurrency(quotedTotal)}</span>
                          </div>
                        )}
                        {unquoted.length > 0 && (
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-amber-600">{unquoted.length} item{unquoted.length > 1 ? 's' : ''} pending quote</span>
                            <span className="font-medium text-amber-600">TBD</span>
                          </div>
                        )}
                      </div>
                      {/* Grand total */}
                      <div className="flex items-end justify-between pt-2.5 border-t border-zinc-100">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">Grand Total</p>
                        {allUnquoted ? (
                          <p className="text-[22px] font-bold text-amber-600 leading-none">Pending Quote</p>
                        ) : (
                          <div className="text-right">
                            <p className="text-[22px] font-bold tabular-nums text-zinc-900 leading-none">{allUnquoted ? 'Pending Quote' : formatCurrency(knownTotal)}</p>
                            {unquoted.length > 0 && (
                              <p className="text-[11px] text-amber-600 mt-1">+ pending procurement pricing</p>
                            )}
                            {procurementItems.length > 0 && unquoted.length === 0 && (
                              <p className="text-[11px] text-emerald-600 mt-1">Final amount after canvass</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {pr.canvassEntries && pr.canvassEntries.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHeader>
                <CardTitle className="text-base">
                  Procurement Canvass Comparison
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  This section shows the supplier canvass prepared by
                  Procurement and the selected pricing basis.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  {pr.canvassEntries.map((entry) => (
                    <div
                      key={
                        entry._id ??
                        `${entry.supplierName}-${entry.totalQuotedAmount}`
                      }
                      className={`rounded-lg border p-4 space-y-3 shadow-sm ${entry.isSelected ? "border-emerald-400 bg-white ring-1 ring-emerald-200" : "bg-white/80"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {entry.supplierName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total quoted:{" "}
                            {formatCurrency(entry.totalQuotedAmount)}
                          </p>
                        </div>
                        {entry.isSelected && (
                          <Badge variant="success">Selected</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {entry.quotedItems.map((quotedItem) => (
                          <div
                            key={quotedItem.itemId}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="truncate">
                              {quotedItem.description}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(quotedItem.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {entry.remarks && (
                        <p className="text-xs text-muted-foreground italic">
                          {entry.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {pr.canvassEntries.length < 3 && pr.canvassJustification && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800">
                      Fewer than 3 suppliers justification
                    </p>
                    <p className="mt-1 text-sm text-amber-900">
                      {pr.canvassJustification}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}


          {/* Clarification thread — only shown when procurement has asked at least one question */}
          {pr.quotationReturnHistory && pr.quotationReturnHistory.some((e) => !e.source || e.source === 'procurement') && (() => {
            // Only include procurement-sourced notes (not COO price-review returns)
            const thread: Array<{ id: string; note: string; author: string; isoAt: string; displayAt: string; side: 'procurement' | 'requester' }> = [];
            for (const entry of pr.quotationReturnHistory as QuotationReturn[]) {
              if (entry.source === 'coo') continue;
              const by = typeof entry.returnedBy === 'object' && entry.returnedBy
                ? `${entry.returnedBy.firstName} ${entry.returnedBy.lastName}` : 'Procurement';
              thread.push({ id: entry._id, note: entry.note, author: by, isoAt: entry.returnedAt, displayAt: formatDate(entry.returnedAt), side: 'procurement' });
            }
            for (const reply of (pr.clarificationReplies ?? []) as ClarificationReply[]) {
              const by = typeof reply.repliedBy === 'object' && reply.repliedBy
                ? `${reply.repliedBy.firstName} ${reply.repliedBy.lastName}` : 'Requester';
              thread.push({ id: reply._id, note: reply.note, author: by, isoAt: reply.repliedAt, displayAt: formatDate(reply.repliedAt), side: 'requester' });
            }
            thread.sort((a, b) => new Date(a.isoAt).getTime() - new Date(b.isoAt).getTime());

            const handleReply = async () => {
              if (!replyNote.trim()) return;
              try {
                await replyMutation.mutateAsync({ id: id!, note: replyNote.trim() });
                setReplyNote('');
                toast({ title: 'Reply sent', description: 'Procurement has been notified.', variant: 'success' });
              } catch (err) {
                toast({ title: 'Failed to send reply', variant: 'error' });
              }
            };

            return (
              <div className="rounded-xl border border-amber-200/70 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="px-6 pt-5 pb-3 flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-zinc-900">Procurement Clarification</h3>
                  <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {thread.length}
                  </span>
                </div>
                <div className="px-6 pb-4 space-y-3">
                  {thread.map((msg) => (
                    <div key={msg.id} className={`flex gap-2.5 ${msg.side === 'requester' ? 'flex-row-reverse' : ''}`}>
                      <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${msg.side === 'procurement' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-200 text-zinc-600'}`}>
                        {msg.author.charAt(0).toUpperCase()}
                      </div>
                      <div className={`max-w-[80%] space-y-1 ${msg.side === 'requester' ? 'items-end' : 'items-start'} flex flex-col`}>
                        <p className="text-[10.5px] text-zinc-400">{msg.author} · {msg.displayAt}</p>
                        <div className={`rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${msg.side === 'procurement' ? 'bg-amber-50 border border-amber-200/60 text-amber-900' : 'bg-zinc-900 text-white'}`}>
                          {msg.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Reply input — only for the requester/owner */}
                {isOwner && (
                  <div className="px-6 pb-5 border-t border-zinc-100 pt-4">
                    <div className="flex gap-2.5 items-end">
                      <textarea
                        rows={2}
                        placeholder="Reply to procurement…"
                        className="flex-1 rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3.5 py-2.5 text-[13px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 focus:bg-white resize-none transition-all duration-150"
                        value={replyNote}
                        onChange={(e) => setReplyNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply(); }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 shrink-0"
                        disabled={!replyNote.trim() || replyMutation.isPending}
                        onClick={handleReply}
                      >
                        {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Send
                      </Button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-zinc-400">Cmd/Ctrl + Enter to send</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Resubmission diff — visible to approvers after requester resubmits */}
          {pr.previousSubmissionSnapshot && (
            <ResubmissionChanges
              snapshot={pr.previousSubmissionSnapshot}
              note={pr.resubmissionNote}
              currentTitle={pr.title}
              currentPriority={pr.priority}
              currentJustification={pr.justification}
              currentItems={pr.items}
            />
          )}

          {/* Cancellation Reason */}
          {isCancelled && pr.cancellationReason && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-red-100 p-1.5 mt-0.5 shrink-0">
                  <Ban className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-red-800">Cancellation Reason</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-red-900/80">{pr.cancellationReason}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Request Details */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="p-6 space-y-6">

              {/* Ownership */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-3">Ownership</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-500 font-semibold text-[13px]">
                    {requester ? requester.firstName[0] : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">
                      {requester ? `${requester.firstName} ${requester.lastName}` : "—"}
                    </p>
                    <p className="text-[12px] text-zinc-400 truncate mt-0.5">{department?.name || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              {/* Request Meta */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-3">Request Details</p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-zinc-500">Priority</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityStyle[pr.priority] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-zinc-500">Type</span>
                    <span className="text-[12px] font-medium text-zinc-800">{pr.requestType === 'job_request' ? 'Job Request' : 'Purchase Request'}</span>
                  </div>
                  {pr.neededByDate && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-zinc-500">Needed By</span>
                      <span className="text-[12px] font-medium text-zinc-800 tabular-nums">{formatDate(pr.neededByDate)}</span>
                    </div>
                  )}
                  {pr.projectId && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] text-zinc-500 shrink-0">Project</span>
                      <span className="text-[12px] font-medium text-zinc-800 text-right">
                        {(pr.projectId as unknown as { name: string; code: string | null }).name}
                        {(pr.projectId as unknown as { code: string | null }).code && (
                          <span className="ml-1.5 font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] text-zinc-600">
                            {(pr.projectId as unknown as { code: string | null }).code}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              {/* Business Need */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-2.5">Purpose</p>
                <p className="text-[13px] leading-[1.7] text-zinc-700">{pr.justification}</p>
                {pr.description && (
                  <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">{pr.description}</p>
                )}
              </div>

              <div className="h-px bg-zinc-100" />

              {/* Audit Dates */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 mb-3">Audit Dates</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-zinc-500">Created</span>
                    <span className="text-[12px] font-medium text-zinc-800 tabular-nums">{formatDate(pr.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-zinc-500">Submitted</span>
                    <span className="text-[12px] font-medium text-zinc-800 tabular-nums">{formatDate(pr.submittedAt) || "—"}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Approval Timeline */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-[13px] font-semibold text-zinc-900">Approval Timeline</h3>
            </div>
            <div className="px-6 pb-5">
              <PurchaseRequestWorkflowTimeline
                pr={pr}
                approvalHistory={approvalHistory}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog (Submit/Delete/Recall) */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === "submit" && "Submit for Approval"}
              {confirmDialog.type === "recall" && "Recall Purchase Request"}
              {confirmDialog.type === "delete" && "Delete Purchase Request"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "submit" &&
                "This will generate a PR number and route it for approval."}
              {confirmDialog.type === "recall" &&
                "This will move the PR back to Draft status. You can edit and resubmit it later."}
              {confirmDialog.type === "delete" &&
                "This draft will be permanently deleted. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ ...confirmDialog, open: false })
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmDialog.type === "delete" ? "destructive" : "default"
              }
              onClick={handleConfirm}
            >
              {confirmDialog.type === "submit" && "Submit"}
              {confirmDialog.type === "recall" && "Recall"}
              {confirmDialog.type === "delete" && "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel PR Dialog */}
      <Dialog
        open={cancelDialog}
        onOpenChange={(open) => {
          setCancelDialog(open);
          if (!open) setCancelReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Request</DialogTitle>
            <DialogDescription>
              This PR will be permanently cancelled. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="cancel-reason"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Why is this PR being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialog(false);
                setCancelReason("");
              }}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
            >
              <Ban className="h-4 w-4" /> Cancel PR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent
          className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex flex-row items-center gap-2 px-4 py-3 border-b shrink-0">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <DialogTitle className="truncate text-sm font-medium">
              {previewDialog.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30">
            {previewDialog.loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {!previewDialog.loading &&
              previewDialog.url &&
              (previewDialog.mimeType.startsWith("image/") ? (
                <div className="flex items-center justify-center h-full p-4 overflow-auto">
                  <img
                    src={previewDialog.url}
                    alt={previewDialog.name}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              ) : (
                <iframe
                  src={previewDialog.url}
                  title={previewDialog.name}
                  className="w-full h-full border-0"
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Action Dialog */}
      <Dialog
        open={approvalDialog.open}
        onOpenChange={(open) => {
          setApprovalDialog({ ...approvalDialog, open });
          if (!open) setApprovalComments("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === "approved" &&
                "Approve Purchase Request"}
              {approvalDialog.action === "rejected" &&
                "Reject Purchase Request"}
              {approvalDialog.action === "returned" && "Return for Revision"}
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.action === "approved" &&
                "Approve this PR and advance it to the next approval level."}
              {approvalDialog.action === "rejected" &&
                "Reject this PR permanently. The requester will be notified."}
              {approvalDialog.action === "returned" &&
                "Return this PR to the requester for revision. They can update and resubmit."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="approval-comments">
              Comments{" "}
              {approvalDialog.action !== "approved" && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <textarea
              id="approval-comments"
              rows={3}
              className="flex w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
              placeholder={
                approvalDialog.action === "approved"
                  ? "Optional comments..."
                  : "Provide a reason (required)..."
              }
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => {
                setApprovalDialog({ ...approvalDialog, open: false });
                setApprovalComments("");
              }}
            >
              Cancel
            </Button>
            {approvalDialog.action === "approved" && (
              <button
                className="inline-flex items-center gap-1.5 rounded-lg h-9 px-4 text-[13px] font-semibold text-white bg-emerald-600 transition-all duration-200 hover:bg-emerald-700 hover:-translate-y-px hover:shadow-md disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleApprovalAction}
                disabled={processApproval.isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
            )}
            {approvalDialog.action === "rejected" && (
              <Button
                variant="destructive"
                className="rounded-lg"
                onClick={handleApprovalAction}
                disabled={processApproval.isPending}
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            )}
            {approvalDialog.action === "returned" && (
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={handleApprovalAction}
                disabled={processApproval.isPending}
              >
                <RotateCcw className="h-4 w-4" /> Return
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Reference Photo Dialog */}
      <Dialog
        open={itemPhotoDialog.open}
        onOpenChange={(o) => {
          if (!o) closeItemPhotoDialog();
        }}
      >
        <DialogContent
          className="max-w-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-48">
            {itemPhotoDialog.loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : itemPhotoDialog.url ? (
              <img
                src={itemPhotoDialog.url}
                alt="Reference photo"
                className="max-w-full max-h-[60vh] rounded-md object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Update Item Details Dialog ─────────────────────── */}
      <Dialog open={editSpecsOpen} onOpenChange={setEditSpecsOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Update Item Details</DialogTitle>
            <DialogDescription className="text-[13px]">
              Update item descriptions and specifications to reflect the clarification. Quantities and sourcing type cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {editSpecsDraft.map((draft, i) => (
              <div key={draft.itemId} className="space-y-3">
                {i > 0 && <div className="h-px bg-zinc-100" />}
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-400">Item {i + 1}</p>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-zinc-700">Description</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-[13px] text-zinc-800 focus:outline-none focus:border-zinc-400 focus:bg-white transition-all duration-150"
                    value={draft.description}
                    onChange={(e) => setEditSpecsDraft((prev) =>
                      prev.map((d, idx) => idx === i ? { ...d, description: e.target.value } : d)
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-zinc-700">Specifications <span className="text-zinc-400 font-normal">(optional)</span></label>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white resize-none transition-all duration-150"
                    placeholder="Brand, model, technical requirements…"
                    value={draft.specifications}
                    onChange={(e) => setEditSpecsDraft((prev) =>
                      prev.map((d, idx) => idx === i ? { ...d, specifications: e.target.value } : d)
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="text-[12px]" onClick={() => setEditSpecsOpen(false)}>
              Cancel
            </Button>
            <Button
              className="text-[12px] bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={updateItemSpecsMutation.isPending || editSpecsDraft.some((d) => !d.description.trim())}
              onClick={async () => {
                try {
                  await updateItemSpecsMutation.mutateAsync({
                    id: id!,
                    items: editSpecsDraft.map((d) => ({
                      itemId: d.itemId,
                      description: d.description.trim(),
                      specifications: d.specifications.trim() || undefined,
                    })),
                  });
                  setEditSpecsOpen(false);
                  toast({ title: 'Item details updated', description: 'Procurement will see the updated specifications.', variant: 'success' });
                } catch {
                  toast({ title: 'Failed to update', description: 'Please try again.', variant: 'error' });
                }
              }}
            >
              {updateItemSpecsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
