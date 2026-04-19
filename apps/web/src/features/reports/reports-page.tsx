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
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import apiClient from '@/lib/api-client';

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
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and download procurement reports."
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Filters</CardTitle>
          <CardDescription>Configure filters that apply to all reports below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PR Summary Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">PR Summary Report</CardTitle>
                <CardDescription>
                  Overview of all PRs with status breakdown and amounts.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={loading !== null}
                onClick={() => handleDownload('pr-summary', 'excel')}
              >
                {loading === 'pr-summary-excel' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Excel
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={loading !== null}
                onClick={() => handleDownload('pr-summary', 'pdf')}
              >
                {loading === 'pr-summary-pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Department Spending Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Department Spending</CardTitle>
                <CardDescription>
                  Approved spending breakdown by department.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              disabled={loading !== null}
              onClick={() => handleDownload('department-spending', 'excel')}
            >
              {loading === 'department-spending-excel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Download className="h-4 w-4" /> Download Excel</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Approval Turnaround Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Approval Turnaround</CardTitle>
                <CardDescription>
                  Average approval turnaround time per level and department.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={loading !== null}
                onClick={() => handleDownload('turnaround', 'excel')}
              >
                {loading === 'turnaround-excel' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Excel
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={loading !== null}
                onClick={() => handleDownload('turnaround', 'pdf')}
              >
                {loading === 'turnaround-pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
