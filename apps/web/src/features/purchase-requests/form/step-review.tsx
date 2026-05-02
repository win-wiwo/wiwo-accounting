import { type UseFormReturn } from 'react-hook-form';
import { AlertCircle, Camera, Pencil, Tag } from 'lucide-react';
import {
  SourcingType,
  PR_PRIORITY_LABELS,
  type PrPriority,
} from '@prams/shared';
import {
  Surface,
  FormField,
  GhostButton,
  premiumTextareaClass,
} from '@/components/premium';
import type { FormData, ProjectOption } from './schemas';
import { formatCurrency } from './utils';

interface StepReviewProps {
  form: UseFormReturn<FormData>;
  projectOptions: ProjectOption[];
  totalAmount: number;
  stagedPhotos: Record<number, { file: File; url: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prData: { data?: any } | undefined;
  serverPhotoPreviews: Record<string, string>;
  selectedSellerIndexes: Record<number, number>;
  onGoToStep: (step: number) => void;
}

export function StepReview({
  form,
  projectOptions,
  totalAmount,
  stagedPhotos,
  prData,
  serverPhotoPreviews,
  selectedSellerIndexes,
  onGoToStep,
}: StepReviewProps) {
  const sourcingMode = form.watch('sourcingMode');
  const isProcurement = sourcingMode === SourcingType.PROCUREMENT;
  const data = form.getValues();
  const { errors } = form.formState;

  const project = projectOptions.find((p) => String(p._id) === data.projectId);
  const isReturned = data._isReturned;

  return (
    <div className="space-y-4">
      {/* Basics summary */}
      <Surface delay={0.04}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[14px] font-semibold text-zinc-900">Request Basics</h2>
          <GhostButton
            type="button"
            onClick={() => onGoToStep(0)}
            className="px-2.5 py-1 text-[12px]"
          >
            <Pencil className="h-3 w-3" /> Edit
          </GhostButton>
        </div>
        <div className="px-6 pb-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <SummaryItem
              label="Title"
              value={data.title}
              missing={!data.title}
            />
            <SummaryItem
              label="Request Type"
              value={data.requestType === 'job_request' ? 'Job Request' : 'Purchase Request'}
            />
            <div className="sm:col-span-2">
              <SummaryItem
                label="Purpose"
                value={data.justification}
                missing={!data.justification}
                wrap
              />
            </div>
            <SummaryItem
              label="Assigned To"
              value={
                data.assignmentType === 'office'
                  ? 'Office / General'
                  : project
                    ? `${project.name}${project.code ? ` (${project.code})` : ''}`
                    : ''
              }
              missing={data.assignmentType === 'project' && !project}
              missingText="No project selected"
            />
            <SummaryItem
              label="Priority"
              value={PR_PRIORITY_LABELS[data.priority as PrPriority] || data.priority}
            />
            <SummaryItem
              label="Needed By"
              value={data.neededByDate || 'Not specified'}
            />
          </dl>
        </div>
      </Surface>

      {/* Items summary */}
      <Surface delay={0.06}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[14px] font-semibold text-zinc-900">
            Line Items ({data.items.length})
          </h2>
          <GhostButton
            type="button"
            onClick={() => onGoToStep(1)}
            className="px-2.5 py-1 text-[12px]"
          >
            <Pencil className="h-3 w-3" /> Edit
          </GhostButton>
        </div>
        <div className="px-6 pb-6">
          <div className="space-y-2">
            {data.items.map((item, i) => {
              const isOnline = item.sourcingType === SourcingType.ONLINE;
              const lineTotal = isOnline
                ? (Number(item.quantity) || 0) * (Number(item.estimatedPrice) || 0)
                : 0;
              const staged = stagedPhotos[i];
              const serverItem = item._id
                ? prData?.data?.items?.find(
                    (si: { _id: string }) => si._id === item._id,
                  )
                : null;
              const photoUrl = staged?.url ?? (item._id ? serverPhotoPreviews[item._id] : null);
              const photoName = staged?.file.name ?? serverItem?.referencePhotoOriginalName ?? null;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-100 px-4 py-3 text-[13px]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-zinc-800">
                        {item.description || `Item ${i + 1}`}
                      </span>
                      <span className="ml-2 text-zinc-400 tabular-nums">
                        ×{item.quantity} {item.unit}
                      </span>
                      {isOnline && (
                        <span className="ml-2 text-[11px] font-medium text-blue-600">
                          Online
                        </span>
                      )}
                    </div>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${isOnline ? 'text-zinc-800' : 'text-amber-600'}`}
                    >
                      {isOnline ? formatCurrency(lineTotal) : 'TBD'}
                    </span>
                  </div>
                  {isOnline && (() => {
                    const sellerIdx = selectedSellerIndexes[i];
                    const seller = sellerIdx !== undefined ? item.sellerReferences?.[sellerIdx] : undefined;
                    return seller ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-zinc-500">
                        <Tag className="h-3 w-3 shrink-0" />
                        Seller: <span className="font-medium text-zinc-700">{seller.sellerName}</span>
                        <span className="tabular-nums">— {formatCurrency(seller.price)}/unit</span>
                      </p>
                    ) : null;
                  })()}
                  {item.specifications && (
                    <p className="mt-1.5 text-[12px] text-zinc-500 whitespace-pre-wrap leading-relaxed">
                      {item.specifications}
                    </p>
                  )}
                  {photoUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={photoUrl}
                        alt="ref"
                        className="h-8 w-8 rounded-md object-cover border border-zinc-200"
                      />
                      <Camera className="h-3 w-3 text-zinc-400" />
                      <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                        {photoName}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end border-t border-zinc-100 pt-3">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                {isProcurement ? 'Pricing' : 'Total'}
              </p>
              {isProcurement ? (
                <p className="mt-1 text-[16px] font-semibold text-amber-600">TBQ</p>
              ) : (
                <p className="mt-1 text-[18px] font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(totalAmount)}
                </p>
              )}
            </div>
          </div>
        </div>
      </Surface>

      {/* Resubmission note — only for returned PRs */}
      {isReturned && (
        <Surface className="border-amber-200 bg-amber-50/40">
          <div className="px-6 pt-5 pb-3">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-amber-900">
              <AlertCircle className="h-4 w-4" />
              What changed? <span className="text-red-600">*</span>
            </h2>
          </div>
          <div className="px-6 pb-6">
            <FormField error={errors.resubmissionNote?.message}>
              <textarea
                rows={3}
                className={`${premiumTextareaClass} border-amber-200 bg-white focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.10)]`}
                placeholder="e.g. Replaced item 2 with a cheaper model, added 3 seller references for item 1, updated quantity of item 3 from 5 to 3..."
                {...form.register('resubmissionNote')}
              />
            </FormField>
          </div>
        </Surface>
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  missing,
  missingText = 'Missing',
  wrap,
}: {
  label: string;
  value: string;
  missing?: boolean;
  missingText?: string;
  wrap?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-[13px] ${wrap ? 'whitespace-pre-wrap' : ''} ${
          missing ? 'text-red-600 italic' : 'text-zinc-800 font-medium'
        }`}
      >
        {missing ? missingText : value}
      </dd>
    </div>
  );
}
