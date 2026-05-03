import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ── Variant config ──────────────────────────────────────────
const variantConfig: Record<ToastVariant, {
  icon: React.ReactNode;
  badgeBg: string;
  border: string;
  bg: string;
  titleColor: string;
  progressColor: string;
}> = {
  default: {
    icon: null,
    badgeBg: '',
    border: 'border-zinc-200/80',
    bg: 'bg-white',
    titleColor: 'text-zinc-800',
    progressColor: 'bg-zinc-300',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    badgeBg: 'bg-emerald-50 border-emerald-100',
    border: 'border-emerald-200/60',
    bg: 'bg-white',
    titleColor: 'text-zinc-800',
    progressColor: 'bg-emerald-400',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    badgeBg: 'bg-red-50 border-red-100',
    border: 'border-red-200/60',
    bg: 'bg-white',
    titleColor: 'text-zinc-800',
    progressColor: 'bg-red-400',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    badgeBg: 'bg-amber-50 border-amber-100',
    border: 'border-amber-200/60',
    bg: 'bg-white',
    titleColor: 'text-zinc-800',
    progressColor: 'bg-amber-400',
  },
  info: {
    icon: <Info className="h-4 w-4 text-blue-500" />,
    badgeBg: 'bg-blue-50 border-blue-100',
    border: 'border-blue-200/60',
    bg: 'bg-white',
    titleColor: 'text-zinc-800',
    progressColor: 'bg-blue-400',
  },
};

const TOAST_DURATION = 4000;

// ── Single toast item ───────────────────────────────────────
function ToastItem({
  toast: t,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const variant = t.variant || 'default';
  const config = variantConfig[variant];
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => onRemove(t.id), 200);
  }, [t.id, onRemove]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, TOAST_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [dismiss]);

  return (
    <div
      className={cn(
        'group relative flex w-[360px] items-start gap-3 overflow-hidden rounded-xl border px-4 py-3.5',
        'shadow-popover',
        config.border,
        config.bg,
        dismissing
          ? 'animate-out fade-out-0 slide-out-to-right-full duration-200'
          : 'animate-in fade-in-0 slide-in-from-bottom-2 zoom-in-95 duration-300',
      )}
    >
      {/* Icon badge */}
      {config.icon && (
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
            config.badgeBg,
          )}
        >
          {config.icon}
        </span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <p className={cn('text-[13px] font-semibold leading-snug', config.titleColor)}>
          {t.title}
        </p>
        {t.description && (
          <p className="mt-0.5 text-[11px] text-zinc-400 leading-relaxed">
            {t.description}
          </p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={dismiss}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-300 opacity-0 transition-all duration-150 hover:bg-zinc-100 hover:text-zinc-500 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-100/60">
        <div
          className={cn('h-full rounded-full', config.progressColor)}
          style={{
            animation: `toast-progress ${TOAST_DURATION}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ── Provider ────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-2.5">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
