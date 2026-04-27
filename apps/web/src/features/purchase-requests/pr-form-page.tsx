import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Save, Send, ImageIcon } from 'lucide-react';
import { purchaseRequestsApi } from '@/lib/api-services';
import { Skeleton } from '@/components/ui/skeleton';
import { Stepper } from '@/components/ui/stepper';
import { StickyFooter } from '@/components/ui/sticky-footer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PageHeader,
  PrimaryButton,
  GhostButton,
  Surface,
} from '@/components/premium';
import { STEP_LABELS, STEP_FIELDS } from './form/schemas';
import { useStagedFiles } from './form/use-staged-files';
import { usePrForm } from './form/use-pr-form';
import { StepBasics } from './form/step-basics';
import { StepItems } from './form/step-items';
import { StepReview } from './form/step-review';
import { HowItWorks } from './form/how-it-works';

export function PrFormPage() {
  const stagedFiles = useStagedFiles();
  const pr = usePrForm(stagedFiles);
  const { form, isEdit, id, prData, prLoading, navigate } = pr;

  const [step, setStep] = useState(0);

  const [serverPhotoPreviews, setServerPhotoPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit || !prData?.data?.items || !id) return;
    prData.data.items.forEach((item) => {
      if (item.referencePhotoPath && !serverPhotoPreviews[item._id]) {
        purchaseRequestsApi
          .fetchItemPhoto(id, item._id)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            setServerPhotoPreviews((prev) => ({ ...prev, [item._id]: url }));
          })
          .catch(() => null);
      }
    });
  }, [isEdit, prData?.data?.items, id]);

  useEffect(() => {
    const urls = serverPhotoPreviews;
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const requestType = form.watch('requestType');
  const isJR = requestType === 'job_request';
  const typeLabel = isJR ? 'Job Request' : 'Purchase Request';

  const goToStep = (target: number) => {
    if (target < step) {
      setStep(target);
      return;
    }
    advanceToStep(target);
  };

  const advanceToStep = async (target: number) => {
    for (let s = step; s < target; s++) {
      const fieldNames = STEP_FIELDS[s as keyof typeof STEP_FIELDS] as readonly string[];
      if (fieldNames.length > 0) {
        const valid = await form.trigger(fieldNames as Parameters<typeof form.trigger>[0]);
        if (!valid) {
          setStep(s);
          return;
        }
      }
    }
    setStep(target);
  };

  const handleNext = () => advanceToStep(step + 1);
  const handleBack = () => setStep(Math.max(0, step - 1));

  const handleDraftSave = () => {
    pr.submitActionRef.current = 'draft';
    form.handleSubmit(pr.onSubmit, pr.onInvalid)();
  };

  const handleSubmit = () => {
    pr.submitActionRef.current = 'submit';
    form.handleSubmit(pr.onSubmit, pr.onInvalid)();
  };

  if (isEdit && prLoading) {
    return (
      <div className="space-y-6 max-w-screen-2xl">
        <Skeleton className="h-8 w-64" />
        <Surface>
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Surface>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;
  const isLastStep = step === STEP_LABELS.length - 1;

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title={isEdit ? `Edit ${typeLabel}` : `New ${typeLabel}`}
        actions={
          <GhostButton onClick={() => navigate('/purchase-requests')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </GhostButton>
        }
      />

      <HowItWorks />

      <Stepper steps={STEP_LABELS} currentStep={step} onStepClick={goToStep} />

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {step === 0 && (
          <StepBasics form={form} isEdit={isEdit} projectOptions={pr.projectOptions} />
        )}

        {step === 1 && (
          <StepItems
            form={form}
            fields={pr.fields}
            append={pr.append}
            remove={pr.remove}
            totalAmount={pr.totalAmount}
            hasProcurementItems={pr.hasProcurementItems}
            stagedFiles={stagedFiles}
            prData={prData}
            serverPhotoPreviews={serverPhotoPreviews}
          />
        )}

        {step === 2 && (
          <StepReview
            form={form}
            projectOptions={pr.projectOptions}
            totalAmount={pr.totalAmount}
            hasProcurementItems={pr.hasProcurementItems}
            stagedPhotosCount={Object.keys(stagedFiles.stagedPhotos).length}
            onGoToStep={goToStep}
          />
        )}

        <StickyFooter>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <GhostButton
                type="button"
                onClick={() => navigate('/purchase-requests')}
              >
                Cancel
              </GhostButton>
              {step > 0 && (
                <GhostButton type="button" onClick={handleBack}>
                  Back
                </GhostButton>
              )}
            </div>
            <div className="flex gap-2">
              <GhostButton
                type="button"
                disabled={isSubmitting}
                onClick={handleDraftSave}
              >
                {isSubmitting && pr.submitActionRef.current === 'draft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </GhostButton>

              {isLastStep ? (
                <PrimaryButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting && pr.submitActionRef.current === 'submit' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit for Approval
                </PrimaryButton>
              ) : (
                <PrimaryButton type="button" onClick={handleNext}>
                  Continue
                </PrimaryButton>
              )}
            </div>
          </div>
        </StickyFooter>
      </form>

      {/* Server photo viewer dialog */}
      <Dialog
        open={stagedFiles.photoViewDialog.open}
        onOpenChange={(o) => {
          if (!o) stagedFiles.setPhotoViewDialog({ open: false, url: null });
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Reference Photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-48">
            {stagedFiles.photoViewDialog.url && (
              <img
                src={stagedFiles.photoViewDialog.url}
                alt="Reference photo"
                className="max-w-full max-h-[60vh] rounded-md object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
