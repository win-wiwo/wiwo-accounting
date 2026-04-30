import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PR_PRIORITIES, PrPriority, PrStatus, SourcingType, type CreatePurchaseRequestDto } from '@prams/shared';
import { usePurchaseRequest, useCreatePr, useUpdatePr, useSubmitPr } from '@/hooks/use-purchase-requests';
import { purchaseRequestsApi } from '@/lib/api-services';
import { useActiveProjects, useProject } from '@/hooks/use-projects';
import { useToast } from '@/components/ui/toast';
import { formSchema, defaultItem, type FormData, type ProjectOption } from './schemas';
import { toProjectId, toProjectOption, buildProjectOptions } from './utils';
import type { useStagedFiles } from './use-staged-files';

export function usePrForm(stagedFiles: ReturnType<typeof useStagedFiles>) {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: prData, isLoading: prLoading, refetch: refetchPr } = usePurchaseRequest(id ?? '');
  const { data: activeProjects } = useActiveProjects();
  const prProjectId = (() => {
    const project = prData?.data?.projectId as ProjectOption | string | null | undefined;
    return toProjectId(project);
  })();
  const { data: projectData } = useProject(prProjectId);
  const createMutation = useCreatePr();
  const updateMutation = useUpdatePr();
  const submitMutation = useSubmitPr();
  const submitActionRef = useRef<'draft' | 'submit'>('draft');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestType: 'purchase_request',
      sourcingMode: SourcingType.PROCUREMENT,
      assignmentType: 'project',
      title: '',
      items: [defaultItem(SourcingType.PROCUREMENT)],
      priority: 'medium',
      projectId: '',
      resubmissionNote: '',
      _isReturned: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchItems = form.watch('items');

  const totalAmount = watchItems?.reduce((sum, item) => {
    if (item.sourcingType === SourcingType.ONLINE) {
      return sum + (Number(item.quantity) || 0) * (Number(item.estimatedPrice) || 0);
    }
    return sum;
  }, 0) ?? 0;

  const hasProcurementItems = watchItems?.some((i) => i.sourcingType === SourcingType.PROCUREMENT) ?? false;
  const hasOnlineItems = watchItems?.some((i) => i.sourcingType === SourcingType.ONLINE) ?? false;
  const currentProject = ((projectData?.data ?? null) as ProjectOption | null) ??
    toProjectOption(prData?.data?.projectId as ProjectOption | string | null | undefined);
  const projectOptions = buildProjectOptions(activeProjects, currentProject);

  // Hydrate form on edit mode
  useEffect(() => {
    if (isEdit && prData?.data) {
      const pr = prData.data;
      form.reset({
        requestType: pr.requestType || 'purchase_request',
        sourcingMode: (pr.sourcingMode as SourcingType) || SourcingType.PROCUREMENT,
        assignmentType: prProjectId ? 'project' : 'office',
        title: pr.title || '',
        projectId: prProjectId,
        priority: PR_PRIORITIES.includes(pr.priority) ? pr.priority : PrPriority.MEDIUM,
        justification: pr.justification,
        neededByDate: pr.neededByDate ? pr.neededByDate.split('T')[0] : '',
        resubmissionNote: pr.resubmissionNote || '',
        _isReturned: pr.status === PrStatus.RETURNED,
        items: pr.items.map((item) => ({
          _id: item._id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          specifications: item.specifications || '',
          sourcingType: (item.sourcingType as SourcingType) || SourcingType.PROCUREMENT,
          estimatedPrice: item.estimatedPrice,
          sellerReferences: item.sellerReferences?.map((r) => ({
            sellerName: r.sellerName,
            price: r.price,
            notes: r.notes || '',
          })) ?? [],
          sellerReferencesJustification: item.sellerReferencesJustification || '',
        })),
      });
    }
  }, [isEdit, prData, prProjectId, form]);

  // Sync project selection in edit mode
  useEffect(() => {
    if (!isEdit || !prProjectId) return;
    if (!projectOptions.some((project) => String(project._id) === prProjectId)) return;
    form.setValue('projectId', prProjectId, { shouldValidate: false, shouldDirty: false });
  }, [isEdit, prProjectId, projectOptions, form]);

  const onInvalid = () => {
    toast({ title: 'Form has errors', description: 'Please fill in all required fields before submitting.', variant: 'error' });
  };

  const onSubmit = async (data: FormData) => {
    const action = submitActionRef.current;
    let persistedPrId: string | null = isEdit ? id ?? null : null;
    let createdNewDraft = false;

    try {
      const { requestType, sourcingMode, assignmentType, _isReturned, resubmissionNote, ...rest } = data;
      const payload: CreatePurchaseRequestDto = {
        ...rest,
        projectId: assignmentType === 'office' ? undefined : data.projectId || undefined,
        neededByDate: data.neededByDate ? new Date(data.neededByDate).toISOString() : undefined,
        // sourcingMode is locked after create — only include it on create.
        ...(!isEdit && { requestType, sourcingMode }),
        ...(isEdit && _isReturned && { resubmissionNote: resubmissionNote || undefined }),
      };

      let prId: string;
      let savedItems: Array<{ _id: string }> = [];

      if (isEdit) {
        const result = await updateMutation.mutateAsync({ id: id!, data: payload });
        prId = id!;
        savedItems = (result.data?.items ?? []) as Array<{ _id: string }>;
      } else {
        const result = await createMutation.mutateAsync(payload);
        prId = result.data!._id;
        persistedPrId = prId;
        createdNewDraft = true;
        savedItems = (result.data?.items ?? []) as Array<{ _id: string }>;
      }

      // Upload staged reference photos
      const photoUploads = Object.entries(stagedFiles.stagedPhotos).map(([indexStr, { file }]) => {
        const item = savedItems[parseInt(indexStr)];
        return item?._id ? { itemId: item._id, file } : null;
      });
      for (const upload of photoUploads) {
        if (!upload) continue;
        await purchaseRequestsApi.uploadItemPhoto(prId, upload.itemId, upload.file);
      }

      if (action === 'submit') {
        await submitMutation.mutateAsync(prId);
        toast({
          title: 'Submitted for Approval',
          variant: 'success',
        });
      } else {
        toast({ title: isEdit ? 'PR updated' : 'Saved as draft', variant: 'success' });
      }

      navigate('/purchase-requests');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Something went wrong';

      if (createdNewDraft && persistedPrId) {
        toast({
          title: 'Draft saved, but submission failed',
          description: message || 'You can continue from the saved draft without creating a duplicate.',
          variant: 'error',
        });
        navigate(`/purchase-requests/${persistedPrId}/edit`);
        return;
      }

      toast({ title: 'Error', description: message || 'Failed to save.', variant: 'error' });
    }
  };

  return {
    form,
    fields,
    append,
    remove,
    isEdit,
    id,
    prData,
    prLoading,
    refetchPr,
    totalAmount,
    hasProcurementItems,
    hasOnlineItems,
    projectOptions,
    submitActionRef,
    onSubmit,
    onInvalid,
    navigate,
    toast,
  };
}
