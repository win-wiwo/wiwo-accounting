import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  help?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Standard form field wrapper: label + control + error/help line.
 * `error` takes priority over `help` when both are provided.
 */
export function FormField({
  label,
  htmlFor,
  error,
  help,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[12px] font-semibold text-zinc-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] text-red-600">{error}</p>
      ) : help ? (
        <p className="text-[11px] text-zinc-400 leading-relaxed">{help}</p>
      ) : null}
    </div>
  );
}

/**
 * Apply this className to a raw `<textarea>` element to match the premium
 * input styling (zinc-50/60 bg, focus shadow ring).
 */
export const premiumTextareaClass =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-focus resize-y';
