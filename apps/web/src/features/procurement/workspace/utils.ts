export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

export function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function canPreviewAttachment(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

export function getErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(responseMessage)) {
    return responseMessage.join(', ');
  }
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }
  return fallback;
}

export const statusVariant = (status: string) => {
  switch (status) {
    case 'pending_quotation': return 'warning' as const;
    case 'returned': return 'warning' as const;
    default: return 'secondary' as const;
  }
};

export const priorityVariant = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive' as const;
    case 'high': return 'warning' as const;
    case 'medium': return 'info' as const;
    default: return 'secondary' as const;
  }
};
