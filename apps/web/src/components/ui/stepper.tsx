import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: readonly string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;
          const isClickable = onStepClick && isCompleted;

          return (
            <li key={label} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium transition-colors',
                  isClickable && 'cursor-pointer hover:text-primary',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-primary',
                  isFuture && 'text-muted-foreground',
                  !isClickable && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCurrent && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isFuture && 'border-2 border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-3 h-0.5 flex-1 rounded-full transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
