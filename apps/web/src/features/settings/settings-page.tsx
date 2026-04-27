import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Eye, Save, Hash } from 'lucide-react';
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
import {
  PageHeader,
  Surface,
  PrimaryButton,
  premiumSelectTriggerClass,
} from '@/components/premium';

interface PrNumberConfig {
  _id: string;
  prefix: string;
  separator: string;
  includeYear: boolean;
  yearFormat: string;
  includeDepartmentCode: boolean;
  sequenceDigits: number;
}

interface PrSequence {
  _id: string;
  departmentCode: string;
  year: number;
  lastNumber: number;
}

interface SeriesInfo {
  config: PrNumberConfig;
  sequences: PrSequence[];
  year: number;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading: configLoading } = useConfigQuery();
  const { data: series, isLoading: seriesLoading } = useSeriesQuery();
  const { data: preview } = usePreviewQuery();

  const [formState, setFormState] = useState<Partial<PrNumberConfig>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (config && !initialized) {
      setFormState({
        prefix: config.prefix,
        separator: config.separator,
        includeYear: config.includeYear,
        yearFormat: config.yearFormat,
        includeDepartmentCode: config.includeDepartmentCode,
        sequenceDigits: config.sequenceDigits,
      });
      setInitialized(true);
    }
  }, [config, initialized]);

  const localPreview = useMemo(() => {
    if (!formState.prefix) return '';
    const sep = formState.separator || '-';
    const parts: string[] = [formState.prefix];

    if (formState.includeDepartmentCode) {
      parts.push('ENG');
    }
    if (formState.includeYear) {
      const year = new Date().getFullYear();
      parts.push(formState.yearFormat === 'short' ? String(year).slice(-2) : String(year));
    }
    parts.push('0'.repeat(formState.sequenceDigits || 5).slice(0, -1) + '1');
    return parts.join(sep);
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
  };

  const updateField = <K extends keyof PrNumberConfig>(key: K, value: PrNumberConfig[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title="Settings"
        description="Configure PR numbering format and view series information."
      />

      {/* Section 1: PR Number Format Configuration */}
      <Surface delay={0.04}>
        <div className="px-6 pt-6 pb-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
            <Settings className="h-4 w-4 text-zinc-400" />
            PR Number Format Configuration
          </h2>
          <p className="mt-1 text-[12px] text-zinc-500">
            Customize how purchase request numbers are generated across the system.
          </p>
        </div>
        <div className="px-6 pb-6">
          {configLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
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
                  {localPreview || 'PR-ENG-2026-00001'}
                </p>
              </div>

              <Divider />

              <div className="grid gap-5 sm:grid-cols-2">
                <ConfigField
                  label="Prefix"
                  description="The text that appears at the beginning of every PR number."
                >
                  <Input
                    id="prefix"
                    value={formState.prefix || ''}
                    onChange={(e) => updateField('prefix', e.target.value)}
                    placeholder="PR"
                    maxLength={10}
                  />
                </ConfigField>

                <ConfigField
                  label="Separator"
                  description="Character used to separate parts of the PR number."
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
                  label="Include Year"
                  description="Whether to include the year in the PR number."
                >
                  <Select
                    value={formState.includeYear ? 'yes' : 'no'}
                    onValueChange={(val) => updateField('includeYear', val === 'yes')}
                  >
                    <SelectTrigger className={premiumSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigField>

                <ConfigField
                  label="Year Format"
                  description="Format for the year component. Disabled when year is not included."
                >
                  <Select
                    value={formState.yearFormat || 'full'}
                    onValueChange={(val) => updateField('yearFormat', val)}
                    disabled={!formState.includeYear}
                  >
                    <SelectTrigger className={premiumSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full (2026)</SelectItem>
                      <SelectItem value="short">Short (26)</SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigField>

                <ConfigField
                  label="Include Department Code"
                  description="Whether to include the department code in the PR number."
                >
                  <Select
                    value={formState.includeDepartmentCode ? 'yes' : 'no'}
                    onValueChange={(val) =>
                      updateField('includeDepartmentCode', val === 'yes')
                    }
                  >
                    <SelectTrigger className={premiumSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigField>

                <ConfigField
                  label="Sequence Digits"
                  description="Number of digits for the sequence number (zero-padded)."
                >
                  <Select
                    value={String(formState.sequenceDigits || 5)}
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
                <PrimaryButton onClick={handleSave} disabled={updateMutation.isPending}>
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
            PR Number Series
          </h2>
          <p className="mt-1 text-[12px] text-zinc-500">
            View the current PR numbering sequences by department for this year.
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
              {/* Summary cards */}
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

              {/* Sequences table */}
              {series.sequences.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-200 text-[13px] text-zinc-400">
                  No PR sequences have been created yet this year.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-100">
                  <table className="w-full">
                    <thead className="bg-zinc-50/60 border-b border-zinc-100">
                      <tr>
                        <Th>Department Code</Th>
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
                          <td className="px-5 py-3.5 font-mono text-[13px] font-medium text-zinc-800">
                            {seq.departmentCode}
                          </td>
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
              )}
            </div>
          ) : null}
        </div>
      </Surface>
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
      <p className="text-[11px] text-zinc-400 leading-relaxed">{description}</p>
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
