import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidedStepperProps {
  steps: readonly string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function GuidedStepper({
  steps,
  currentStep,
  onStepClick,
}: GuidedStepperProps) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Mobile: compact progress header */}
      <div className="sm:hidden px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 leading-none">
              Step {currentStep + 1} of {steps.length}
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-zinc-900 leading-none">
              {steps[currentStep]}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i < currentStep && 'w-1.5 bg-zinc-900',
                  i === currentStep && 'w-4 bg-zinc-900',
                  i > currentStep && 'w-1.5 bg-zinc-200',
                )}
              />
            ))}
          </div>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: full horizontal stepper */}
      <ol className="hidden sm:flex items-center gap-2 px-5 py-5">
        {steps.map((label, i) => {
          const completed = i < currentStep;
          const current = i === currentStep;
          const clickable = !!onStepClick && completed;

          return (
            <li
              key={label}
              className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(i)}
                className={cn(
                  'group flex items-center gap-3 -mx-2 rounded-lg px-2 py-1.5 transition-all duration-200',
                  clickable && 'cursor-pointer hover:bg-zinc-50',
                  !clickable && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-300',
                    current &&
                      'bg-zinc-900 text-white shadow-[0_0_0_4px_rgba(24,24,27,0.08)]',
                    completed && 'bg-zinc-900 text-white',
                    !current &&
                      !completed &&
                      'border border-zinc-200 bg-white text-zinc-400 group-hover:border-zinc-300',
                  )}
                >
                  {completed ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="text-left">
                  <p
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-[0.08em] leading-none transition-colors',
                      current ? 'text-zinc-900' : 'text-zinc-400',
                    )}
                  >
                    Step {i + 1}
                  </p>
                  <p
                    className={cn(
                      'mt-1.5 text-[14px] font-semibold leading-none transition-colors',
                      current && 'text-zinc-900',
                      completed && 'text-zinc-700',
                      !current && !completed && 'text-zinc-400',
                    )}
                  >
                    {label}
                  </p>
                </div>
              </button>

              {i < steps.length - 1 && (
                <div className="mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-zinc-900 transition-all duration-500 ease-out"
                    style={{ width: completed ? '100%' : '0%' }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
