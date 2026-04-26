import { useState } from 'react';
import { ChevronDown, ChevronUp, Send, CheckCircle2, ShoppingCart, DollarSign } from 'lucide-react';

const DISMISSED_KEY = 'prams-how-it-works-dismissed';

export function HowItWorks() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  const steps = [
    { icon: Send, label: 'Submit', desc: 'Fill out and submit your request' },
    { icon: CheckCircle2, label: 'Approval', desc: 'Dept Head → COO → CEO approve the need' },
    { icon: ShoppingCart, label: 'Procurement', desc: 'Procurement sources suppliers (if needed)' },
    { icon: DollarSign, label: 'Price Review', desc: 'COO reviews supplier pricing' },
  ];

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        How does this work?
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1.5 text-xs">
                  <step.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <span className="text-muted-foreground/40">→</span>
                )}
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((step) => (
              <p key={step.label} className="text-[11px] text-muted-foreground">{step.desc}</p>
            ))}
          </div>
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
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
