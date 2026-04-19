import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Eye, Save, Hash } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';

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
      toast({ title: 'Configuration saved', description: 'PR number format has been updated.', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save configuration.', variant: 'error' });
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
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure PR numbering format and view series information."
      />

      {/* Section 1: PR Number Format Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            PR Number Format Configuration
          </CardTitle>
          <CardDescription>
            Customize how purchase request numbers are generated across the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </div>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {localPreview || 'PR-ENG-2026-00001'}
                </p>
              </div>

              <Separator />

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Prefix */}
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input
                    id="prefix"
                    value={formState.prefix || ''}
                    onChange={(e) => updateField('prefix', e.target.value)}
                    placeholder="PR"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    The text that appears at the beginning of every PR number.
                  </p>
                </div>

                {/* Separator */}
                <div className="space-y-2">
                  <Label htmlFor="separator">Separator</Label>
                  <Select
                    value={formState.separator || '-'}
                    onValueChange={(val) => updateField('separator', val)}
                  >
                    <SelectTrigger id="separator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Hyphen (-)</SelectItem>
                      <SelectItem value="/">Slash (/)</SelectItem>
                      <SelectItem value="_">Underscore (_)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Character used to separate parts of the PR number.
                  </p>
                </div>

                {/* Include Year */}
                <div className="space-y-2">
                  <Label htmlFor="includeYear">Include Year</Label>
                  <Select
                    value={formState.includeYear ? 'yes' : 'no'}
                    onValueChange={(val) => updateField('includeYear', val === 'yes')}
                  >
                    <SelectTrigger id="includeYear">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Whether to include the year in the PR number.
                  </p>
                </div>

                {/* Year Format */}
                <div className="space-y-2">
                  <Label htmlFor="yearFormat">Year Format</Label>
                  <Select
                    value={formState.yearFormat || 'full'}
                    onValueChange={(val) => updateField('yearFormat', val)}
                    disabled={!formState.includeYear}
                  >
                    <SelectTrigger id="yearFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full (2026)</SelectItem>
                      <SelectItem value="short">Short (26)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Format for the year component. Disabled when year is not included.
                  </p>
                </div>

                {/* Include Department Code */}
                <div className="space-y-2">
                  <Label htmlFor="includeDeptCode">Include Department Code</Label>
                  <Select
                    value={formState.includeDepartmentCode ? 'yes' : 'no'}
                    onValueChange={(val) => updateField('includeDepartmentCode', val === 'yes')}
                  >
                    <SelectTrigger id="includeDeptCode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Whether to include the department code in the PR number.
                  </p>
                </div>

                {/* Sequence Digits */}
                <div className="space-y-2">
                  <Label htmlFor="sequenceDigits">Sequence Digits</Label>
                  <Select
                    value={String(formState.sequenceDigits || 5)}
                    onValueChange={(val) => updateField('sequenceDigits', Number(val))}
                  >
                    <SelectTrigger id="sequenceDigits">
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
                  <p className="text-xs text-muted-foreground">
                    Number of digits for the sequence number (zero-padded).
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: PR Number Series */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            PR Number Series
          </CardTitle>
          <CardDescription>
            View the current PR numbering sequences by department for this year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seriesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : series ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Current Format</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{series.formatPattern}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Next Number Preview</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{preview?.preview ?? '-'}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total PRs This Year</p>
                  <p className="mt-1 text-2xl font-bold">{series.totalPrsThisYear}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="mt-1 text-2xl font-bold">{series.year}</p>
                </div>
              </div>

              <Separator />

              {/* Sequences table */}
              {series.sequences.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                  No PR sequences have been created yet this year.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department Code</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Last Assigned Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {series.sequences.map((seq) => (
                      <TableRow key={seq._id}>
                        <TableCell className="font-mono font-medium">{seq.departmentCode}</TableCell>
                        <TableCell>{seq.year}</TableCell>
                        <TableCell>{seq.lastNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
