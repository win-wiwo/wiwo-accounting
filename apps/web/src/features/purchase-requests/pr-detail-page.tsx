import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Send,
  Trash2,
  Calendar,
  User,
  Building2,
  Hash,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Undo2,
  Ban,
  Paperclip,
  Upload,
  Download,
  Eye,
  Loader2,
  FileText,
  AlertCircle,
  ShoppingCart,
  Camera,
  ImageIcon,
  Clock3,
} from "lucide-react";
import {
  ATTACHMENT_CATEGORY_LABELS,
  AttachmentCategory,
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
} from "@prams/shared";
import {
  usePurchaseRequest,
  useSubmitPr,
  useDeletePr,
  useRecallPr,
  useCancelPr,
  useUploadAttachment,
  useRemoveAttachment,
} from "@/hooks/use-purchase-requests";
import { purchaseRequestsApi } from "@/lib/api-services";
import apiClient from "@/lib/api-client";
import { useApprovalHistory, useProcessApproval } from "@/hooks/use-approvals";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseRequestWorkflowTimeline } from "@/components/purchase-request-workflow-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

type SnapshotItem = PreviousSubmissionSnapshot['items'][number];

function diffItems(
  oldItems: SnapshotItem[],
  newItems: PrLineItem[],
): Array<{ type: 'unchanged' | 'changed' | 'removed' | 'added'; old?: SnapshotItem; new?: PrLineItem }> {
  const oldById = new Map(oldItems.map((i) => [i._id, i]));
  const newById = new Map(newItems.map((i) => [i._id, i]));
  const results: ReturnType<typeof diffItems> = [];

  for (const old of oldItems) {
    const cur = newById.get(old._id);
    if (!cur) {
      results.push({ type: 'removed', old });
    } else {
      const changed =
        old.description !== cur.description ||
        old.quantity !== cur.quantity ||
        old.unit !== cur.unit ||
        old.sourcingType !== cur.sourcingType ||
        old.estimatedPrice !== cur.estimatedPrice;
      results.push({ type: changed ? 'changed' : 'unchanged', old, new: cur });
    }
  }

  for (const cur of newItems) {
    if (!oldById.has(cur._id)) {
      results.push({ type: 'added', new: cur });
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

function ResubmissionChanges({ snapshot, note, currentTitle, currentPriority, currentJustification, currentItems }: ResubmissionChangesProps) {
  const itemDiffs = diffItems(snapshot.items, currentItems);
  const titleChanged = snapshot.title !== currentTitle;
  const priorityChanged = snapshot.priority !== currentPriority;
  const justificationChanged = snapshot.justification !== currentJustification;
  const hasFieldChanges = titleChanged || priorityChanged || justificationChanged;
  const hasItemChanges = itemDiffs.some((d) => d.type !== 'unchanged');

  return (
    <Card className="border-blue-300 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Changes from Previous Submission
        </CardTitle>
        {note && (
          <div className="mt-2 rounded-md border border-blue-200 bg-white px-3 py-2">
            <p className="text-xs font-medium text-blue-700 mb-0.5">Requester's note</p>
            <p className="text-sm text-foreground">{note}</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {hasFieldChanges && (
          <div className="space-y-2">
            {titleChanged && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</p>
                <p className="text-xs line-through text-red-600 bg-red-50 rounded px-2 py-1">{snapshot.title}</p>
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">{currentTitle}</p>
              </div>
            )}
            {priorityChanged && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
                <p className="text-xs line-through text-red-600 bg-red-50 rounded px-2 py-1 capitalize">{snapshot.priority}</p>
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 capitalize">{currentPriority}</p>
              </div>
            )}
            {justificationChanged && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Purpose / Justification</p>
                <p className="text-xs line-through text-red-600 bg-red-50 rounded px-2 py-1">{snapshot.justification}</p>
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">{currentJustification}</p>
              </div>
            )}
          </div>
        )}

        {hasItemChanges && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items</p>
            {itemDiffs.filter((d) => d.type !== 'unchanged').map((diff, i) => (
              <div key={i} className="rounded-md border text-xs overflow-hidden">
                {diff.type === 'removed' && diff.old && (
                  <div className="bg-red-50 border-red-200 px-3 py-2 line-through text-red-700">
                    <span className="font-medium">{diff.old.description}</span>
                    {' — '}{diff.old.quantity} {diff.old.unit}
                    {diff.old.estimatedPrice > 0 && ` · ₱${diff.old.estimatedPrice.toLocaleString()}/unit`}
                    <span className="ml-1 text-[10px] no-underline not-italic font-medium bg-red-200 text-red-800 rounded px-1">removed</span>
                  </div>
                )}
                {diff.type === 'added' && diff.new && (
                  <div className="bg-green-50 border-green-200 px-3 py-2 text-green-700">
                    <span className="font-medium">{diff.new.description}</span>
                    {' — '}{diff.new.quantity} {diff.new.unit}
                    {(diff.new.estimatedPrice ?? 0) > 0 && ` · ₱${(diff.new.estimatedPrice ?? 0).toLocaleString()}/unit`}
                    <span className="ml-1 text-[10px] font-medium bg-green-200 text-green-800 rounded px-1">added</span>
                  </div>
                )}
                {diff.type === 'changed' && diff.old && diff.new && (
                  <div>
                    <div className="bg-red-50 px-3 py-1.5 line-through text-red-700">
                      <span className="font-medium">{diff.old.description}</span>
                      {' — '}{diff.old.quantity} {diff.old.unit}
                      {diff.old.estimatedPrice > 0 && ` · ₱${diff.old.estimatedPrice.toLocaleString()}/unit`}
                    </div>
                    <div className="bg-green-50 px-3 py-1.5 text-green-700">
                      <span className="font-medium">{diff.new.description}</span>
                      {' — '}{diff.new.quantity} {diff.new.unit}
                      {(diff.new.estimatedPrice ?? 0) > 0 && ` · ₱${(diff.new.estimatedPrice ?? 0).toLocaleString()}/unit`}
                      <span className="ml-1 text-[10px] font-medium bg-amber-200 text-amber-800 rounded px-1">modified</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!hasFieldChanges && !hasItemChanges && (
          <p className="text-xs text-muted-foreground">No tracked field changes detected.</p>
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

const statusVariant = (status: string) => {
  switch (status) {
    case "draft":
      return "secondary" as const;
    case "submitted":
    case "level1_review":
    case "level2_review":
    case "level3_review":
    case "quoted":
      return "info" as const;
    case "pending_quotation":
      return "warning" as const;
    case "approved":
      return "success" as const;
    case "rejected":
      return "destructive" as const;
    case "returned":
    case "returned_for_info":
      return "warning" as const;
    case "cancelled":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
};

const priorityVariant = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "destructive" as const;
    case "high":
      return "warning" as const;
    case "medium":
      return "info" as const;
    default:
      return "secondary" as const;
  }
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
  const uploadMutation = useUploadAttachment();
  const removeMutation = useRemoveAttachment();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pr) return;

    try {
      await uploadMutation.mutateAsync({ id: pr._id, file });
      toast({ title: "File uploaded", variant: "success" });
    } catch {
      toast({ title: "Upload failed", variant: "error" });
    }
    e.target.value = "";
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!pr) return;
    try {
      await removeMutation.mutateAsync({ id: pr._id, attachmentId });
      toast({ title: "Attachment removed", variant: "success" });
    } catch {
      toast({ title: "Failed to remove", variant: "error" });
    }
  };

  const handlePreview = async (
    attachmentId: string,
    mimeType: string,
    name: string,
  ) => {
    setPreviewDialog({ open: true, url: null, mimeType, name, loading: true });
    try {
      const response = await apiClient.get(
        `/purchase-requests/${id}/attachments/${attachmentId}/download`,
        { responseType: "blob" },
      );
      const blobUrl = URL.createObjectURL(
        new Blob([response.data], { type: mimeType }),
      );
      setPreviewDialog({
        open: true,
        url: blobUrl,
        mimeType,
        name,
        loading: false,
      });
    } catch {
      setPreviewDialog({
        open: false,
        url: null,
        mimeType: "",
        name: "",
        loading: false,
      });
      toast({ title: "Failed to load preview", variant: "error" });
    }
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

      const labels = {
        approved: "approved",
        rejected: "rejected",
        returned: "returned for revision",
      };
      toast({
        title: `PR ${labels[approvalDialog.action]}`,
        variant: approvalDialog.action === "approved" ? "success" : "default",
      });
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
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
  const isPendingQuotation = runtimeStatus === PrStatus.PENDING_QUOTATION;
  const isCancelled = runtimeStatus === PrStatus.CANCELLED;
  const isOwner = requester?._id === user?._id;
  const canEdit = isOwner && (isDraft || isReturned || isReturnedForInfo);
  const canRecall =
    isOwner &&
    (
      runtimeStatus === PrStatus.LEVEL1_REVIEW ||
      runtimeStatus === PrStatus.LEVEL2_REVIEW ||
      isPendingQuotation ||
      isReturnedForInfo
    );
  const canCancel =
    isOwner &&
    (
      isDraft ||
      runtimeStatus === PrStatus.LEVEL1_REVIEW ||
      runtimeStatus === PrStatus.LEVEL2_REVIEW ||
      isPendingQuotation ||
      isReturnedForInfo
    );

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
    (((runtimeStatus === PrStatus.LEVEL1_REVIEW ||
      runtimeStatus === PrStatus.QUOTED) &&
      user?.role === UserRole.DEPT_HEAD) ||
      (runtimeStatus === PrStatus.LEVEL2_REVIEW && user?.role === UserRole.COO) ||
      (runtimeStatus === PrStatus.LEVEL3_REVIEW && user?.role === UserRole.CEO));

  const stagePresentation = (() => {
    if (runtimeStatus === PrStatus.DRAFT) {
      return {
        title: "Draft in Progress",
        description: "Complete the request details, attach requester documents, and submit when the package is ready.",
        icon: <Pencil className="h-4 w-4" />,
        tone: "border-slate-300 bg-slate-50 text-slate-800",
      };
    }
    if (runtimeStatus === PrStatus.PENDING_QUOTATION) {
      return {
        title: "Procurement Action Required",
        description: "Procurement will review the specs, item photos, and requester documents, then attach canvass evidence and quote the request.",
        icon: <ShoppingCart className="h-4 w-4" />,
        tone: "border-amber-300 bg-amber-50 text-amber-900",
      };
    }
    if (runtimeStatus === PrStatus.QUOTED || runtimeStatus === PrStatus.LEVEL1_REVIEW || runtimeStatus === PrStatus.LEVEL2_REVIEW || runtimeStatus === PrStatus.LEVEL3_REVIEW) {
      return {
        title: canApprove ? "Your Approval Decision Is Needed" : "Approval in Progress",
        description: canApprove
          ? "Review the request context, procurement basis, and supporting files before taking action."
          : "This request has moved into the approval chain and is waiting for the next approver.",
        icon: <Clock3 className="h-4 w-4" />,
        tone: "border-blue-300 bg-blue-50 text-blue-900",
      };
    }
    if (runtimeStatus === PrStatus.RETURNED_FOR_INFO) {
      return {
        title: "More Requester Information Needed",
        description: "Procurement sent this back for clarification. Update the request package and resubmit.",
        icon: <RotateCcw className="h-4 w-4" />,
        tone: "border-amber-300 bg-amber-50 text-amber-900",
      };
    }
    if (runtimeStatus === PrStatus.RETURNED) {
      return {
        title: "Revision Required",
        description: "An approver returned this request for changes. Update the package and submit it again.",
        icon: <RotateCcw className="h-4 w-4" />,
        tone: "border-amber-300 bg-amber-50 text-amber-900",
      };
    }
    if (runtimeStatus === PrStatus.APPROVED) {
      return {
        title: "Request Approved",
        description: "The approval workflow is complete. The approved package and procurement basis are retained below.",
        icon: <CheckCircle2 className="h-4 w-4" />,
        tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
      };
    }
    if (runtimeStatus === PrStatus.REJECTED) {
      return {
        title: "Request Rejected",
        description: "The workflow has ended. Review the timeline and comments for the reason.",
        icon: <XCircle className="h-4 w-4" />,
        tone: "border-destructive/30 bg-destructive/5 text-destructive",
      };
    }
    if (runtimeStatus === PrStatus.CANCELLED) {
      return {
        title: "Request Cancelled",
        description: "This request was cancelled before completion. The cancellation reason is shown below.",
        icon: <Ban className="h-4 w-4" />,
        tone: "border-slate-300 bg-slate-50 text-slate-800",
      };
    }
    return {
      title: "Workflow Active",
      description: "Review the current request package and timeline below.",
      icon: <FileText className="h-4 w-4" />,
      tone: "border-border bg-muted/40 text-foreground",
    };
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={pr.title}
        description={
          pr.prNumber ? `PR ${pr.prNumber}` : "Draft — not yet submitted"
        }
      >
        <Button
          variant="outline"
          onClick={() => navigate("/purchase-requests")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {!isDraft && (
          <Button variant="outline" onClick={handleGenerateReport}>
            <FileText className="h-4 w-4" /> Generate Report
          </Button>
        )}
        {canEdit && (
          <>
            <Button
              variant="outline"
              onClick={() => navigate(`/purchase-requests/${id}/edit`)}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button
              onClick={() => setConfirmDialog({ open: true, type: "submit" })}
            >
              <Send className="h-4 w-4" /> Submit
            </Button>
          </>
        )}
        {canRecall && (
          <Button
            variant="outline"
            onClick={() => setConfirmDialog({ open: true, type: "recall" })}
          >
            <Undo2 className="h-4 w-4" /> Recall
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setCancelReason("");
              setCancelDialog(true);
            }}
          >
            <Ban className="h-4 w-4" /> Cancel PR
          </Button>
        )}
        {isOwner && isDraft && (
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setConfirmDialog({ open: true, type: "delete" })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {canApprove && (
          <>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setApprovalComments("");
                setApprovalDialog({ open: true, action: "approved" });
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalComments("");
                setApprovalDialog({ open: true, action: "returned" });
              }}
            >
              <RotateCcw className="h-4 w-4" /> Return
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setApprovalComments("");
                setApprovalDialog({ open: true, action: "rejected" });
              }}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </>
        )}
      </PageHeader>

      <Card className={stagePresentation.tone}>
        <CardContent className="flex items-start gap-3 pt-6">
          <div className="rounded-full bg-background/70 p-2">
            {stagePresentation.icon}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{stagePresentation.title}</p>
            <p className="text-sm leading-6 text-current/80">{stagePresentation.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-muted p-2">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={statusVariant(pr.status)} className="mt-0.5">
                {PR_STATUS_LABELS[pr.status as PrStatusType]}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-muted p-2">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requester</p>
              <p className="text-sm font-medium">
                {requester
                  ? `${requester.firstName} ${requester.lastName}`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-muted p-2">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="text-sm font-medium">{department?.name || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-muted p-2">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Needed By</p>
              <p className="text-sm font-medium">
                {formatDate(pr.neededByDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Line Items</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Item photos stay with their specific line item. Procurement-sourced items remain unpriced until canvass is complete.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request Mix</p>
                  <p className="text-sm font-medium">
                    {pr.items.filter((item) => item.sourcingType === SourcingType.PROCUREMENT).length} procurement
                    {" · "}
                    {pr.items.filter((item) => item.sourcingType === SourcingType.ONLINE).length} online
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {pr.items.map((item, i) => {
                const isProcurement = item.sourcingType === SourcingType.PROCUREMENT;
                const displayPrice = isProcurement
                  ? (item.quotedUnitPrice ?? 0)
                  : (item.estimatedPrice ?? 0);
                const unitPriceLabel = isProcurement && !item.quotedUnitPrice
                  ? "Pending quotation"
                  : formatCurrency(displayPrice);
                const totalLabel = item.totalPrice > 0 ? formatCurrency(item.totalPrice) : "TBQ";

                return (
                  <div key={item._id} className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                          {isProcurement ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                              <ShoppingCart className="h-2.5 w-2.5" />
                              Procurement
                            </Badge>
                          ) : (
                            <Badge variant="info" className="text-[10px] px-1.5 py-0">
                              Online
                            </Badge>
                          )}
                        </div>
                        <p className="text-base font-semibold leading-snug">{item.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-right sm:min-w-[260px]">
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Qty</p>
                          <p className="text-sm font-semibold">{item.quantity} {item.unit}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Unit Price</p>
                          <p className="text-sm font-semibold">{unitPriceLabel}</p>
                        </div>
                        <div className="col-span-2 rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Line Total</p>
                          <p className="text-base font-semibold">{totalLabel}</p>
                        </div>
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
                      {isProcurement && item.quotedUnitPrice && item.quotedAt && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Quoted {formatDate(item.quotedAt)}
                        </span>
                      )}
                      {typeof item.selectedSupplierId === "object" && item.selectedSupplierId?.companyName && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          Supplier: {item.selectedSupplierId.companyName}
                        </span>
                      )}
                    </div>

                    {(item.specifications || item.notes) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {item.specifications && (
                          <div className="rounded-lg bg-muted/30 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Specifications</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.specifications}</p>
                          </div>
                        )}
                        {item.notes && (
                          <div className="rounded-lg bg-muted/30 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {!isProcurement && item.sellerReferences && item.sellerReferences.length > 0 && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-blue-700">Seller References</p>
                        <div className="mt-2 space-y-1.5">
                          {item.sellerReferences.map((ref, ri) => (
                            <div key={ri} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span className="truncate">{ref.sellerName}</span>
                              <span className="shrink-0 font-medium">{formatCurrency(ref.price)}</span>
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

              <Separator />
              <div className="flex justify-end p-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pr.totalAmount)}
                  </p>
                  {pr.items.some(
                    (i) =>
                      i.sourcingType === SourcingType.PROCUREMENT &&
                      !i.quotedUnitPrice,
                  ) && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      * Procurement items pending quotation
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {pr.canvassEntries && pr.canvassEntries.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHeader>
                <CardTitle className="text-base">Procurement Canvass Comparison</CardTitle>
                <p className="text-xs text-muted-foreground">
                  This section shows the supplier canvass prepared by Procurement and the selected pricing basis.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  {pr.canvassEntries.map((entry) => (
                    <div
                      key={entry._id ?? `${entry.supplierName}-${entry.totalQuotedAmount}`}
                      className={`rounded-lg border p-4 space-y-3 shadow-sm ${entry.isSelected ? "border-emerald-400 bg-white ring-1 ring-emerald-200" : "bg-white/80"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{entry.supplierName}</p>
                          <p className="text-xs text-muted-foreground">
                            Total quoted: {formatCurrency(entry.totalQuotedAmount)}
                          </p>
                        </div>
                        {entry.isSelected && <Badge variant="success">Selected</Badge>}
                      </div>
                      <div className="space-y-1">
                        {entry.quotedItems.map((quotedItem) => (
                          <div key={quotedItem.itemId} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate">{quotedItem.description}</span>
                            <span className="font-medium">{formatCurrency(quotedItem.unitPrice)}</span>
                          </div>
                        ))}
                      </div>
                      {entry.remarks && (
                        <p className="text-xs text-muted-foreground italic">{entry.remarks}</p>
                      )}
                    </div>
                  ))}
                </div>
                {pr.canvassEntries.length < 3 && pr.canvassJustification && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800">Fewer than 3 suppliers justification</p>
                    <p className="mt-1 text-sm text-amber-900">{pr.canvassJustification}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          <Card className="border-sky-200 bg-sky-50/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Requester Supporting Documents</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Whole-request files uploaded by the requester. Item photos stay under each line item, and Procurement quotation evidence appears in the canvass section above.
                </p>
              </div>
              {canEdit && (
                <label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    asChild
                  >
                    <span>
                      {uploadMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload
                    </span>
                  </Button>
                </label>
              )}
            </CardHeader>
            <CardContent>
              {pr.attachments && pr.attachments.length > 0 ? (
                <div className="space-y-2">
                  {pr.attachments.map(
                    (att: {
                      _id: string;
                      originalName: string;
                      mimeType: string;
                      category?: string | null;
                      size: number;
                    }) => (
                      <div
                        key={att._id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {att.originalName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ATTACHMENT_CATEGORY_LABELS[(att.category as AttachmentCategory) ?? AttachmentCategory.OTHER]} · {(att.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Preview"
                            onClick={() =>
                              handlePreview(
                                att._id,
                                att.mimeType,
                                att.originalName,
                              )
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Download"
                            onClick={() =>
                              purchaseRequestsApi.downloadAttachment(
                                pr._id,
                                att._id,
                                att.originalName,
                              )
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveAttachment(att._id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No requester supporting documents.</p>
              )}
            </CardContent>
          </Card>

          {/* Returned for Info Note */}
          {pr.quotationNote && (
            <Card className="border-amber-300">
              <CardHeader>
                <CardTitle className="text-base text-amber-700 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" /> Procurement Returned This Request for More Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{pr.quotationNote}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Update the request details, item specs, photos, or requester documents, then resubmit.
                </p>
              </CardContent>
            </Card>
          )}

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
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  Cancellation Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{pr.cancellationReason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Request Snapshot</CardTitle>
              <p className="text-xs text-muted-foreground">
                Core context and timing details for this request.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pr.projectId && (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Project
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {
                        (
                          pr.projectId as unknown as {
                            name: string;
                            code: string | null;
                          }
                        ).name
                      }
                      {(pr.projectId as unknown as { code: string | null })
                        .code && (
                        <span className="ml-1.5 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {
                            (pr.projectId as unknown as { code: string | null })
                              .code
                          }
                        </span>
                      )}
                    </p>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Priority
                </p>
                <Badge variant={priorityVariant(pr.priority)} className="mt-1">
                  {PR_PRIORITY_LABELS[pr.priority as PrPriorityType]}
                </Badge>
              </div>
              <Separator />
              {pr.description && (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-1 text-sm">{pr.description}</p>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Purpose
                </p>
                <p className="mt-1 text-sm">{pr.justification}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Created</p>
                  <p className="mt-1 font-medium">{formatDate(pr.createdAt)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Submitted</p>
                  <p className="mt-1 font-medium">{formatDate(pr.submittedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Timeline */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Approval Timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Full workflow history, including procurement returns and approval actions.
              </p>
            </CardHeader>
            <CardContent>
              <PurchaseRequestWorkflowTimeline
                pr={pr}
                approvalHistory={approvalHistory}
              />
            </CardContent>
          </Card>
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
                (pr.items.some(
                  (i) => i.sourcingType === SourcingType.PROCUREMENT,
                )
                  ? "This will generate a PR number and send it to the Procurement team for quotation before approval."
                  : "This will generate a PR number and route it to your department head for approval.")}
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
                "Reject this PR. The requester will be notified."}
              {approvalDialog.action === "returned" &&
                "Return this PR to the requester for revision."}
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
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              onClick={() => {
                setApprovalDialog({ ...approvalDialog, open: false });
                setApprovalComments("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                approvalDialog.action === "approved"
                  ? "default"
                  : approvalDialog.action === "rejected"
                    ? "destructive"
                    : "outline"
              }
              className={
                approvalDialog.action === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : undefined
              }
              onClick={handleApprovalAction}
              disabled={processApproval.isPending}
            >
              {approvalDialog.action === "approved" && (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </>
              )}
              {approvalDialog.action === "rejected" && (
                <>
                  <XCircle className="h-4 w-4" /> Reject
                </>
              )}
              {approvalDialog.action === "returned" && (
                <>
                  <RotateCcw className="h-4 w-4" /> Return
                </>
              )}
            </Button>
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
        <DialogContent className="max-w-2xl">
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
    </div>
  );
}
