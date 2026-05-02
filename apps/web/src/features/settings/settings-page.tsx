import { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Eye, Save, Hash, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PageHeader,
  Surface,
  PrimaryButton,
  premiumSelectTriggerClass,
} from '@/components/premium';

interface PrNumberConfig {
  _id: string;
  separator: string;
  sequenceDigits: number;
}

interface PrSequence {
  _id: string;
  year: number;
  lastNumber: number;
}

interface SeriesInfo {
  config: PrNumberConfig;
  sequences: PrSequence[];
  year: number;
  currentSequence: PrSequence | null;
  totalPrsThisYear: number;
  formatPattern: string;
}

interface PreviewInfo {
  preview: string;
  pattern: string;
  nextNumber: number;
}

function useConfigQuery() {
  return useQuery({
    queryKey: ['pr-numbering', 'config'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PrNumberConfig }>('/pr-numbering/config');
      return res.data.data;
    },
  });
}

function useSeriesQuery() {
  return useQuery({
    queryKey: ['pr-numbering', 'series'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: SeriesInfo }>('/pr-numbering/series');
      return res.data.data;
    },
  });
}

function usePreviewQuery() {
  return useQuery({
    queryKey: ['pr-numbering', 'preview'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PreviewInfo }>('/pr-numbering/preview');
      return res.data.data;
    },
  });
}

export function SettingsPage() {
  usePageTitle('Settings');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading: configLoading } = useConfigQuery();
  const { data: series, isLoading: seriesLoading } = useSeriesQuery();
  const { data: preview } = usePreviewQuery();

  const [formState, setFormState] = useState<Partial<PrNumberConfig>>({});
  const [initialized, setInitialized] = useState(false);
  const [confirmSaveConfig, setConfirmSaveConfig] = useState(false);

  useEffect(() => {
    if (config && !initialized) {
      setFormState({
        separator: config.separator,
        sequenceDigits: config.sequenceDigits,
      });
      setInitialized(true);
    }
  }, [config, initialized]);

  const localPreview = useMemo(() => {
    const sep = formState.separator || '-';
    const digits = formState.sequenceDigits || 4;
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = '0'.repeat(digits - 1) + '1';
    return [year, month, seq].join(sep);
  }, [formState]);

  const updateMutation = useMutation({
    mutationFn: async (dto: Partial<PrNumberConfig>) => {
      const res = await apiClient.patch('/pr-numbering/config', dto);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pr-numbering'] });
      toast({
        title: 'Configuration saved',
        description: 'PR number format has been updated.',
        variant: 'success',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save configuration.',
        variant: 'error',
      });
    },
  });

  const handleSave = () => {
    const { _id, ...dto } = formState as PrNumberConfig;
    updateMutation.mutate(dto);
    setConfirmSaveConfig(false);
  };

  const updateField = <K extends keyof PrNumberConfig>(key: K, value: PrNumberConfig[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title="Settings"
        description="Configure PR numbering format and the current series counter."
      />

      {/* Section 1: PR Number Format Configuration */}
      <Surface delay={0.04}>
        <div className="px-6 pt-6 pb-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
            <Settings className="h-4 w-4 text-zinc-400" />
            PR Number Format
          </h2>
          <p className="mt-1 text-[12px] text-zinc-500">
            All PR numbers follow the format <span className="font-mono">YEAR-MONTH-SERIES</span>.
            The series number is continuous across the year regardless of transaction month and
            resets only when the year changes.
          </p>
        </div>
        <div className="px-6 pb-6">
          {configLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  <Eye className="h-3 w-3" />
                  Preview
                </div>
                <p className="text-[24px] font-mono font-bold text-zinc-900 tracking-wider">
                  {localPreview}
                </p>
              </div>

              <Divider />

              <div className="grid gap-5 sm:grid-cols-2">
                <ConfigField
                  label="Separator"
                  description="Character used between year, month, and series."
                >
                  <Select
                    value={formState.separator || '-'}
                    onValueChange={(val) => updateField('separator', val)}
                  >
                    <SelectTrigger className={premiumSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Hyphen (-)</SelectItem>
                      <SelectItem value="/">Slash (/)</SelectItem>
                      <SelectItem value="_">Underscore (_)</SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigField>

                <ConfigField
                  label="Sequence Digits"
                  description="Number of digits for the series number (zero-padded)."
                >
                  <Select
                    value={String(formState.sequenceDigits || 4)}
                    onValueChange={(val) => updateField('sequenceDigits', Number(val))}
                  >
                    <SelectTrigger className={premiumSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} digits ({'0'.repeat(n - 1)}1)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ConfigField>
              </div>

              <Divider />

              <div className="flex justify-end">
                <PrimaryButton onClick={() => setConfirmSaveConfig(true)} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </Surface>

      {/* Section 2: PR Number Series */}
      <Surface delay={0.08}>
        <div className="px-6 pt-6 pb-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
            <Hash className="h-4 w-4 text-zinc-400" />
            Current Series
          </h2>
          <p className="mt-1 text-[12px] text-zinc-500">
            View the running counter for the current year. Use “Set Current Series” to migrate
            existing PR numbers issued manually before the system was deployed.
          </p>
        </div>
        <div className="px-6 pb-6">
          {seriesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : series ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard label="Current Format" value={series.formatPattern} mono />
                <SummaryCard label="Next Preview" value={preview?.preview ?? '—'} mono />
                <SummaryCard
                  label="Total PRs This Year"
                  value={String(series.totalPrsThisYear)}
                  large
                />
                <SummaryCard label="Year" value={String(series.year)} large />
              </div>

              <Divider />

              <SetSeriesForm currentYear={series.year} currentLastNumber={series.totalPrsThisYear} />

              {series.sequences.length > 1 && (
                <>
                  <Divider />
                  <div>
                    <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                      Historical Sequences
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-zinc-100">
                      <table className="w-full">
                        <thead className="bg-zinc-50/60 border-b border-zinc-100">
                          <tr>
                            <Th>Year</Th>
                            <Th>Last Assigned Number</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {series.sequences.map((seq) => (
                            <tr
                              key={seq._id}
                              className="border-b border-zinc-100/60 last:border-0 hover:bg-zinc-50/60 transition-colors"
                            >
                              <td className="px-5 py-3.5 text-[13px] text-zinc-700 tabular-nums">
                                {seq.year}
                              </td>
                              <td className="px-5 py-3.5 text-[13px] text-zinc-700 tabular-nums">
                                {seq.lastNumber}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </Surface>

      {/* Confirm Save Configuration */}
      <Dialog open={confirmSaveConfig} onOpenChange={setConfirmSaveConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to update the PR number format? This will affect all future PR
              numbers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSaveConfig(false)}>
              Cancel
            </Button>
            <PrimaryButton onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4" />
              Confirm
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetSeriesForm({
  currentYear,
  currentLastNumber,
}: {
  currentYear: number;
  currentLastNumber: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(currentYear);
  const [lastNumber, setLastNumber] = useState<string>(String(currentLastNumber));

  useEffect(() => {
    setYear(currentYear);
    setLastNumber(String(currentLastNumber));
  }, [currentYear, currentLastNumber]);

  const setSeriesMutation = useMutation({
    mutationFn: async (payload: { year: number; lastNumber: number }) => {
      const res = await apiClient.patch('/pr-numbering/series', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pr-numbering'] });
      toast({
        title: 'Series updated',
        description: 'The next PR number will continue from this series.',
        variant: 'success',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update series.',
        variant: 'error',
      });
    },
  });

  const [confirmApply, setConfirmApply] = useState(false);

  const parsed = Number(lastNumber);
  const isValid = Number.isFinite(parsed) && parsed >= 0 && Number.isInteger(parsed);

  const handleSubmit = () => {
    if (!isValid) return;
    setSeriesMutation.mutate({ year, lastNumber: parsed });
    setConfirmApply(false);
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-5 py-4">
      <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
        <RefreshCw className="h-3 w-3" />
        Set Current Series
      </div>
      <p className="text-[12px] text-zinc-500 mb-4">
        Use this when the year has already started and PR numbers were issued before this system
        was deployed. The next PR number will be{' '}
        <span className="font-mono font-semibold text-zinc-700">lastNumber + 1</span>.
      </p>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-zinc-700">Year</Label>
          <Input
            type="number"
            value={year}
            min={2000}
            max={2100}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-zinc-700">Last Assigned Number</Label>
          <Input
            type="number"
            value={lastNumber}
            min={0}
            onChange={(e) => setLastNumber(e.target.value)}
          />
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Highest series number already issued for this year.
          </p>
        </div>
      </div>
      <div className="mt-4 h-px bg-zinc-200/80" />
      <div className="mt-4 flex justify-end">
        <PrimaryButton
          onClick={() => setConfirmApply(true)}
          disabled={!isValid || setSeriesMutation.isPending}
        >
          <Save className="h-4 w-4" />
          {setSeriesMutation.isPending ? 'Saving...' : 'Apply'}
        </PrimaryButton>
      </div>

      {/* Confirm Apply Series */}
      <Dialog open={confirmApply} onOpenChange={setConfirmApply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Series</DialogTitle>
            <DialogDescription>
              Are you sure you want to set the last assigned number to{' '}
              <span className="font-mono font-semibold text-foreground">{lastNumber}</span> for
              year <span className="font-semibold text-foreground">{year}</span>? The next PR
              number will start from {parsed + 1}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApply(false)}>
              Cancel
            </Button>
            <PrimaryButton onClick={handleSubmit} disabled={setSeriesMutation.isPending}>
              <Save className="h-4 w-4" />
              Confirm
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfigField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-semibold text-zinc-700">{label}</Label>
      {children}
      {description && (
        <p className="text-[11px] text-zinc-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  mono,
  large,
}: {
  label: string;
  value: string;
  mono?: boolean;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-2 text-zinc-900 ${
          large ? 'text-[24px] font-bold tabular-nums' : 'text-[13px] font-semibold'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="h-11 px-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
      {children}
    </th>
  );
}

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}
