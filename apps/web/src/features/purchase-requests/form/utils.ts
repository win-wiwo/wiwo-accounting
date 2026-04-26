import type { ProjectOption } from './schemas';

export function toProjectId(value: ProjectOption | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id);
}

export function toProjectOption(value: ProjectOption | string | null | undefined): ProjectOption | null {
  if (!value || typeof value === 'string') return null;
  return {
    _id: toProjectId(value),
    name: value.name,
    code: value.code,
  };
}

export function buildProjectOptions(
  activeProjects: ProjectOption[] | undefined,
  currentProject: ProjectOption | null,
): ProjectOption[] {
  if (!currentProject) return activeProjects ?? [];
  if ((activeProjects ?? []).some((project) => String(project._id) === currentProject._id)) {
    return activeProjects ?? [];
  }
  return [currentProject, ...(activeProjects ?? [])];
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function canPreviewMimeType(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}
