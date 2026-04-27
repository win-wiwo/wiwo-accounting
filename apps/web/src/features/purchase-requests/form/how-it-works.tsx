import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';

const DISMISSED_KEY = 'prams-how-it-works-dismissed';

export function HowItWorks() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  const steps = [
    { icon: Send, label: 'Submit', desc: 'Fill out and submit your request' },
    {
      icon: CheckCircle2,
      label: 'Approval',
      desc: 'Dept Head → COO → CEO approve the need',
    },
    {
      icon: ShoppingCart,
      label: 'Procurement',
      desc: 'Procurement sources suppliers (if needed)',
    },
    { icon: DollarSign, label: 'Price Review', desc: 'COO reviews supplier pricing' },
  ];

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-5 py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        How does this work?
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <step.icon className="h-3.5 w-3.5 text-zinc-700" />
                  <span className="font-medium text-zinc-800">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <span className="text-zinc-300">→</span>
                )}
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((step) => (
              <p key={step.label} className="text-[11px] text-zinc-500 leading-relaxed">
                {step.desc}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="text-[11px] text-zinc-400 underline-offset-2 hover:underline hover:text-zinc-600"
            onClick={() => {
              localStorage.setItem(DISMISSED_KEY, '1');
              setDismissed(true);
            }}
          >
            Don't show this again
          </button>
        </div>
      )}
    </div>
  );
}
