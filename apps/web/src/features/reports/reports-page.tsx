import { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  Building2,
  BarChart3,
  Clock,
} from 'lucide-react';
import {
  PR_STATUSES,
  PR_STATUS_LABELS,
  type PrStatus as PrStatusType,
} from '@prams/shared';
import { useToast } from '@/components/ui/toast';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  PageHeader,
  Surface,
  GhostButton,
  premiumSelectTriggerClass,
} from '@/components/premium';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

const PREMIUM_INPUT_CLASS =
  'w-full h-10 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

async function downloadReport(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ReportsPage() {
  const { toast } = useToast();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState<string | null>(null);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', new Date(startDate).toISOString());
    if (endDate) params.set('endDate', new Date(endDate).toISOString());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    return params.toString();
  };

  const handleDownload = async (reportType: string, format: 'excel' | 'pdf') => {
    const key = `${reportType}-${format}`;
    setLoading(key);

    try {
      const params = buildParams();
      const formatParam = format === 'pdf' ? '&format=pdf' : '&format=excel';
      const timestamp = new Date().toISOString().split('T')[0];

      let url: string;
      let filename: string;

      switch (reportType) {
        case 'pr-summary':
          url = `/reports/pr-summary?${params}${formatParam}`;
          filename = `PR-Summary-${timestamp}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
          break;
        case 'department-spending':
          url = `/reports/department-spending?${params}`;
          filename = `Department-Spending-${timestamp}.xlsx`;
          break;
        case 'turnaround':
          url = `/reports/turnaround?${params}${formatParam}`;
          filename = `Approval-Turnaround-${timestamp}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
          break;
        default:
          return;
      }

      await downloadReport(url, filename);
      toast({ title: 'Report downloaded', variant: 'success' });
    } catch {
      toast({ title: 'Failed to generate report', variant: 'error' });
    }

    setLoading(null);
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title="Reports"
        description="Generate and download procurement reports."
      />

      {/* Filters */}
      <Surface delay={0.04}>
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-[15px] font-semibold text-zinc-900">Report Filters</h2>
          <p className="mt-1 text-[12px] text-zinc-400">
            Configure filters that apply to all reports below.
          </p>
        </div>
        <div className="px-6 pb-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={PREMIUM_INPUT_CLASS}
              />
            </div>
            <div>
              <FieldLabel>End Date</FieldLabel>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={PREMIUM_INPUT_CLASS}
              />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={premiumSelectTriggerClass}>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {PR_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PR_STATUS_LABELS[s as PrStatusType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Surface>

      {/* Report cards */}
      <div
        className="pr-list-section grid gap-6 md:grid-cols-2"
        style={{ animationDelay: '0.08s' }}
      >
        <ReportCard
          icon={<BarChart3 />}
          iconBg="bg-blue-50 text-blue-600"
          title="PR Summary Report"
          description="Overview of all PRs with status breakdown and amounts."
        >
          <div className="flex gap-2">
            <GhostButton
              className="flex-1 justify-center"
              disabled={loading !== null}
              onClick={() => handleDownload('pr-summary', 'excel')}
            >
              {loading === 'pr-summary-excel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Excel
            </GhostButton>
            <GhostButton
              className="flex-1 justify-center"
              disabled={loading !== null}
              onClick={() => handleDownload('pr-summary', 'pdf')}
            >
              {loading === 'pr-summary-pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </GhostButton>
          </div>
        </ReportCard>

        <ReportCard
          icon={<Building2 />}
          iconBg="bg-emerald-50 text-emerald-600"
          title="Department Spending"
          description="Approved spending breakdown by department."
        >
          <GhostButton
            className="w-full justify-center"
            disabled={loading !== null}
            onClick={() => handleDownload('department-spending', 'excel')}
          >
            {loading === 'department-spending-excel' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4" /> Download Excel
              </>
            )}
          </GhostButton>
        </ReportCard>

        <ReportCard
          icon={<Clock />}
          iconBg="bg-amber-50 text-amber-600"
          title="Approval Turnaround"
          description="Average approval turnaround time per level and department."
        >
          <div className="flex gap-2">
            <GhostButton
              className="flex-1 justify-center"
              disabled={loading !== null}
              onClick={() => handleDownload('turnaround', 'excel')}
            >
              {loading === 'turnaround-excel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Excel
            </GhostButton>
            <GhostButton
              className="flex-1 justify-center"
              disabled={loading !== null}
              onClick={() => handleDownload('turnaround', 'pdf')}
            >
              {loading === 'turnaround-pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </GhostButton>
          </div>
        </ReportCard>
      </div>
    </div>
  );
}

function ReportCard({
  icon,
  iconBg,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Surface>
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'rounded-lg p-2 [&>svg]:h-5 [&>svg]:w-5 shrink-0',
              iconBg,
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-zinc-900">{title}</h3>
            <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </Surface>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
      {children}
    </p>
  );
}
