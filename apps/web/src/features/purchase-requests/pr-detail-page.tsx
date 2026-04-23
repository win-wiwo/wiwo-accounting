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
  ExternalLink,
  AlertCircle,
  ShoppingCart,
  Camera,
  ImageIcon,
} from "lucide-react";
import {
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  PrStatus,
  SourcingType,
  UserRole,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
  const isDraft = pr.status === PrStatus.DRAFT;
  const isSubmitted = pr.status === PrStatus.SUBMITTED;
  const isReturned = pr.status === PrStatus.RETURNED;
  const isReturnedForInfo = pr.status === PrStatus.RETURNED_FOR_INFO;
  const isPendingQuotation = pr.status === PrStatus.PENDING_QUOTATION;
  const isCancelled = pr.status === PrStatus.CANCELLED;
  const isOwner = requester?._id === user?._id;
  const canEdit = isOwner && (isDraft || isReturned || isReturnedForInfo);
  const canRecall =
    isOwner && (isSubmitted || isPendingQuotation || isReturnedForInfo);
  const canCancel =
    isOwner &&
    (isDraft || isSubmitted || isPendingQuotation || isReturnedForInfo);

  // Determine if the current user can act on this PR as an approver
  const pendingStatuses: string[] = [
    PrStatus.SUBMITTED,
    PrStatus.LEVEL1_REVIEW,
    PrStatus.LEVEL2_REVIEW,
    PrStatus.LEVEL3_REVIEW,
  ];
  const isPendingApproval = pendingStatuses.includes(pr.status);
  const canApprove =
    isPendingApproval &&
    !isOwner &&
    ((pr.status === PrStatus.SUBMITTED && user?.role === UserRole.DEPT_HEAD) ||
      (pr.status === PrStatus.LEVEL2_REVIEW && user?.role === UserRole.COO) ||
      (pr.status === PrStatus.LEVEL3_REVIEW && user?.role === UserRole.CEO));

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
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pr.items.map((item, i) => {
                    const isProcurement =
                      item.sourcingType === SourcingType.PROCUREMENT;
                    const displayPrice = isProcurement
                      ? (item.quotedUnitPrice ?? 0)
                      : (item.estimatedPrice ?? 0);
                    const priceLabel =
                      isProcurement && !item.quotedUnitPrice
                        ? "—"
                        : formatCurrency(displayPrice);
                    return (
                      <TableRow key={item._id}>
                        <TableCell className="text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <p className="font-medium">{item.description}</p>
                            {isProcurement ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 gap-0.5"
                              >
                                <ShoppingCart className="h-2.5 w-2.5" />{" "}
                                Procurement
                              </Badge>
                            ) : (
                              <Badge
                                variant="info"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Online
                              </Badge>
                            )}
                          </div>
                          {item.specifications && (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 mt-1">
                              {item.specifications}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic mt-0.5">
                              {item.notes}
                            </p>
                          )}
                          {/* Reference photo */}
                          {item.referencePhotoPath && (
                            <button
                              type="button"
                              onClick={() => handleViewItemPhoto(item._id)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                            >
                              <Camera className="h-3 w-3" />
                              Reference photo
                            </button>
                          )}
                          {/* Seller references for online items */}
                          {!isProcurement &&
                            item.sellerReferences &&
                            item.sellerReferences.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {item.sellerReferences.map((ref, ri) => (
                                  <div
                                    key={ri}
                                    className="flex items-center gap-1 text-xs text-muted-foreground"
                                  >
                                    <span>
                                      {ref.sellerName} —{" "}
                                      {formatCurrency(ref.price)}
                                    </span>
                                    {ref.url && (
                                      <a
                                        href={ref.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-0.5 text-blue-600 hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                                {item.sellerReferencesJustification && (
                                  <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {item.sellerReferencesJustification}
                                  </p>
                                )}
                              </div>
                            )}
                          {isProcurement &&
                            item.quotedUnitPrice &&
                            item.quotedAt && (
                              <p className="text-xs text-emerald-700 mt-0.5">
                                Quoted {formatDate(item.quotedAt)}
                              </p>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">
                          {isProcurement && !item.quotedUnitPrice ? (
                            <span className="text-muted-foreground text-xs">
                              Pending
                            </span>
                          ) : (
                            priceLabel
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.totalPrice > 0 ? (
                            formatCurrency(item.totalPrice)
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              TBQ
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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

          {/* Attachments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Attachments</CardTitle>
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
                              {(att.size / 1024).toFixed(0)} KB
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
                <p className="text-sm text-muted-foreground">No attachments</p>
              )}
            </CardContent>
          </Card>

          {/* Returned for Info Note */}
          {pr.quotationNote && (
            <Card className="border-amber-300">
              <CardHeader>
                <CardTitle className="text-base text-amber-700 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" /> Returned for More
                  Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{pr.quotationNote}</p>
              </CardContent>
            </Card>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(pr.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{formatDate(pr.submittedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Timeline</CardTitle>
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
