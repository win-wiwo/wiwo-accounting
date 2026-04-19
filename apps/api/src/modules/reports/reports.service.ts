import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import {
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  APPROVAL_LEVEL_LABELS,
  PrStatus,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
} from '@prams/shared';
import { PurchaseRequest } from '../purchase-requests/schemas/purchase-request.schema';
import { Department } from '../departments/schemas/department.schema';
import { Approval } from '../approvals/schemas/approval.schema';
import { ReportQueryDto } from './dto';

interface PopulatedPr {
  _id: string;
  prNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  totalAmount: number;
  items: Array<{ description: string; quantity: number; unit: string; estimatedPrice: number; totalPrice: number }>;
  requesterId: { firstName: string; lastName: string; email: string } | null;
  departmentId: { name: string; code: string } | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    @InjectModel(Approval.name) private approvalModel: Model<Approval>,
  ) {}

  private buildFilter(query: ReportQueryDto): FilterQuery<PurchaseRequest> {
    const filter: FilterQuery<PurchaseRequest> = {};
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }
    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.status) filter.status = query.status;
    return filter;
  }

  private async fetchPrs(query: ReportQueryDto): Promise<PopulatedPr[]> {
    const filter = this.buildFilter(query);
    return this.prModel
      .find(filter)
      .populate('requesterId', 'firstName lastName email')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as PopulatedPr[];
  }

  /**
   * PR Summary Report — Excel
   */
  async generateSummaryExcel(query: ReportQueryDto): Promise<Buffer> {
    const prs = await this.fetchPrs(query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PRAMS';

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Total Amount', key: 'totalAmount', width: 20 },
    ];

    const byStatus: Record<string, { count: number; totalAmount: number }> = {};
    for (const pr of prs) {
      if (!byStatus[pr.status]) byStatus[pr.status] = { count: 0, totalAmount: 0 };
      byStatus[pr.status].count++;
      byStatus[pr.status].totalAmount += pr.totalAmount;
    }

    for (const [status, data] of Object.entries(byStatus)) {
      summarySheet.addRow({
        status: PR_STATUS_LABELS[status as PrStatusType] || status,
        count: data.count,
        totalAmount: data.totalAmount,
      });
    }

    summarySheet.addRow({});
    summarySheet.addRow({ status: 'TOTAL', count: prs.length, totalAmount: prs.reduce((s, p) => s + p.totalAmount, 0) });

    // Style header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getColumn('totalAmount').numFmt = '#,##0.00';

    // Detail sheet
    const detailSheet = workbook.addWorksheet('PR Details');
    detailSheet.columns = [
      { header: 'PR Number', key: 'prNumber', width: 18 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Requester', key: 'requester', width: 22 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Amount', key: 'amount', width: 16 },
      { header: 'Date Created', key: 'createdAt', width: 14 },
      { header: 'Date Submitted', key: 'submittedAt', width: 14 },
    ];

    for (const pr of prs) {
      detailSheet.addRow({
        prNumber: pr.prNumber || 'Draft',
        title: pr.title,
        requester: pr.requesterId ? `${pr.requesterId.firstName} ${pr.requesterId.lastName}` : '—',
        department: pr.departmentId?.name || '—',
        status: PR_STATUS_LABELS[pr.status as PrStatusType] || pr.status,
        priority: PR_PRIORITY_LABELS[pr.priority as PrPriorityType] || pr.priority,
        amount: pr.totalAmount,
        createdAt: new Date(pr.createdAt).toLocaleDateString(),
        submittedAt: pr.submittedAt ? new Date(pr.submittedAt).toLocaleDateString() : '—',
      });
    }

    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getColumn('amount').numFmt = '#,##0.00';

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * PR Summary Report — PDF
   */
  async generateSummaryPdf(query: ReportQueryDto): Promise<Buffer> {
    const prs = await this.fetchPrs(query);

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('Purchase Request Summary Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

      if (query.startDate || query.endDate) {
        const range = [
          query.startDate ? new Date(query.startDate).toLocaleDateString() : 'Start',
          query.endDate ? new Date(query.endDate).toLocaleDateString() : 'Present',
        ].join(' — ');
        doc.text(`Period: ${range}`, { align: 'center' });
      }

      doc.moveDown(1);
      doc.fillColor('#000');

      // Summary stats
      const byStatus: Record<string, { count: number; totalAmount: number }> = {};
      for (const pr of prs) {
        if (!byStatus[pr.status]) byStatus[pr.status] = { count: 0, totalAmount: 0 };
        byStatus[pr.status].count++;
        byStatus[pr.status].totalAmount += pr.totalAmount;
      }

      doc.fontSize(14).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.5);

      const totalAmount = prs.reduce((s, p) => s + p.totalAmount, 0);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total PRs: ${prs.length}`);
      doc.text(`Total Amount: PHP ${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
      doc.moveDown(0.5);

      for (const [status, data] of Object.entries(byStatus)) {
        const label = PR_STATUS_LABELS[status as PrStatusType] || status;
        doc.text(`  ${label}: ${data.count} PRs — PHP ${data.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
      }

      doc.moveDown(1);

      // PR listing
      doc.fontSize(14).font('Helvetica-Bold').text('Purchase Requests');
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const headers = ['PR #', 'Title', 'Requester', 'Status', 'Amount'];
      const colWidths = [70, 150, 100, 80, 80];
      let x = 50;

      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, x, tableTop, { width: colWidths[i] });
        x += colWidths[i];
      });

      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica');

      for (const pr of prs.slice(0, 50)) { // Limit to 50 for PDF
        if (doc.y > 720) {
          doc.addPage();
        }

        const y = doc.y;
        x = 50;
        const row = [
          pr.prNumber || 'Draft',
          pr.title.substring(0, 30),
          pr.requesterId ? `${pr.requesterId.firstName} ${pr.requesterId.lastName}` : '—',
          PR_STATUS_LABELS[pr.status as PrStatusType] || pr.status,
          `PHP ${pr.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        ];

        row.forEach((cell, i) => {
          doc.text(cell, x, y, { width: colWidths[i] });
          x += colWidths[i];
        });

        doc.moveDown(0.3);
      }

      if (prs.length > 50) {
        doc.moveDown(0.5);
        doc.text(`... and ${prs.length - 50} more PRs (see Excel export for full list).`);
      }

      doc.end();
    });
  }

  /**
   * Department Spending Report — Excel
   */
  async generateDepartmentSpendingExcel(query: ReportQueryDto): Promise<Buffer> {
    const filter = this.buildFilter({ ...query, status: PrStatus.APPROVED });
    const prs = await this.prModel
      .find(filter)
      .populate('departmentId', 'name code')
      .lean()
      .exec();

    const byDept: Record<string, { name: string; code: string; count: number; totalAmount: number }> = {};
    let grandTotal = 0;

    for (const pr of prs) {
      const dept = (pr as unknown as PopulatedPr).departmentId;
      const key = dept ? (dept as unknown as { _id: { toString: () => string } })._id?.toString() || 'unknown' : 'unknown';
      if (!byDept[key]) byDept[key] = { name: dept?.name || 'Unknown', code: dept?.code || '—', count: 0, totalAmount: 0 };
      byDept[key].count++;
      byDept[key].totalAmount += pr.totalAmount;
      grandTotal += pr.totalAmount;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Department Spending');

    sheet.columns = [
      { header: 'Department', key: 'name', width: 25 },
      { header: 'Code', key: 'code', width: 10 },
      { header: 'Approved PRs', key: 'count', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 20 },
      { header: '% of Total', key: 'percentage', width: 12 },
    ];

    for (const data of Object.values(byDept).sort((a, b) => b.totalAmount - a.totalAmount)) {
      sheet.addRow({
        ...data,
        percentage: grandTotal > 0 ? ((data.totalAmount / grandTotal) * 100).toFixed(1) + '%' : '0%',
      });
    }

    sheet.addRow({});
    sheet.addRow({ name: 'TOTAL', code: '', count: prs.length, totalAmount: grandTotal, percentage: '100%' });

    sheet.getRow(1).font = { bold: true };
    sheet.getColumn('totalAmount').numFmt = '#,##0.00';

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Approval Turnaround Report — Excel
   */
  async generateTurnaroundExcel(query: ReportQueryDto): Promise<Buffer> {
    const { byLevel, byDepartment, details } = await this.computeTurnaroundData(query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PRAMS';

    // Sheet 1: By Approval Level
    const levelSheet = workbook.addWorksheet('By Approval Level');
    levelSheet.columns = [
      { header: 'Level', key: 'level', width: 25 },
      { header: 'Avg Turnaround (hours)', key: 'avgHours', width: 22 },
      { header: 'Actions Count', key: 'count', width: 15 },
    ];

    for (const row of byLevel) {
      levelSheet.addRow({
        level: APPROVAL_LEVEL_LABELS[row.level] || `Level ${row.level}`,
        avgHours: row.avgHours,
        count: row.count,
      });
    }

    levelSheet.getRow(1).font = { bold: true };
    levelSheet.getColumn('avgHours').numFmt = '#,##0.0';

    // Sheet 2: By Department
    const deptSheet = workbook.addWorksheet('By Department');
    deptSheet.columns = [
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Avg Total Turnaround (hours)', key: 'avgHours', width: 28 },
      { header: 'Approved PRs Count', key: 'count', width: 18 },
    ];

    for (const row of byDepartment) {
      deptSheet.addRow(row);
    }

    deptSheet.getRow(1).font = { bold: true };
    deptSheet.getColumn('avgHours').numFmt = '#,##0.0';

    // Sheet 3: Detail
    const detailSheet = workbook.addWorksheet('Detail');
    detailSheet.columns = [
      { header: 'PR #', key: 'prNumber', width: 18 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Submitted Date', key: 'submittedDate', width: 16 },
      { header: 'Approved Date', key: 'approvedDate', width: 16 },
      { header: 'Total Hours', key: 'totalHours', width: 14 },
      { header: 'Level 1 Hours', key: 'level1Hours', width: 14 },
      { header: 'Level 2 Hours', key: 'level2Hours', width: 14 },
      { header: 'Level 3 Hours', key: 'level3Hours', width: 14 },
    ];

    for (const row of details) {
      detailSheet.addRow(row);
    }

    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getColumn('totalHours').numFmt = '#,##0.0';
    detailSheet.getColumn('level1Hours').numFmt = '#,##0.0';
    detailSheet.getColumn('level2Hours').numFmt = '#,##0.0';
    detailSheet.getColumn('level3Hours').numFmt = '#,##0.0';

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Approval Turnaround Report — PDF
   */
  async generateTurnaroundPdf(query: ReportQueryDto): Promise<Buffer> {
    const { byLevel, byDepartment, details } = await this.computeTurnaroundData(query);

    const overallAvg =
      details.length > 0
        ? details.reduce((s, d) => s + d.totalHours, 0) / details.length
        : 0;

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('Approval Turnaround Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

      if (query.startDate || query.endDate) {
        const range = [
          query.startDate ? new Date(query.startDate).toLocaleDateString() : 'Start',
          query.endDate ? new Date(query.endDate).toLocaleDateString() : 'Present',
        ].join(' — ');
        doc.text(`Period: ${range}`, { align: 'center' });
      }

      doc.moveDown(1);
      doc.fillColor('#000');

      // Section 1: Summary stats
      doc.fontSize(14).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Approved PRs: ${details.length}`);
      doc.text(`Overall Avg Turnaround: ${overallAvg.toFixed(1)} hours`);
      doc.moveDown(1);

      // Section 2: Table by Approval Level
      doc.fontSize(14).font('Helvetica-Bold').text('By Approval Level');
      doc.moveDown(0.3);

      {
        const headers = ['Level', 'Avg Turnaround (hrs)', 'Actions Count'];
        const colWidths = [180, 150, 120];
        const tableTop = doc.y;
        let x = 50;

        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => {
          doc.text(h, x, tableTop, { width: colWidths[i] });
          x += colWidths[i];
        });
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        for (const row of byLevel) {
          const y = doc.y;
          x = 50;
          const cells = [
            APPROVAL_LEVEL_LABELS[row.level] || `Level ${row.level}`,
            row.avgHours.toFixed(1),
            String(row.count),
          ];
          cells.forEach((cell, i) => {
            doc.text(cell, x, y, { width: colWidths[i] });
            x += colWidths[i];
          });
          doc.moveDown(0.3);
        }
      }

      doc.moveDown(1);

      // Section 3: Table by Department
      doc.fontSize(14).font('Helvetica-Bold').text('By Department');
      doc.moveDown(0.3);

      {
        const headers = ['Department', 'Avg Turnaround (hrs)', 'Approved PRs'];
        const colWidths = [180, 150, 120];
        const tableTop = doc.y;
        let x = 50;

        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => {
          doc.text(h, x, tableTop, { width: colWidths[i] });
          x += colWidths[i];
        });
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        for (const row of byDepartment) {
          if (doc.y > 720) doc.addPage();
          const y = doc.y;
          x = 50;
          const cells = [
            row.department,
            row.avgHours.toFixed(1),
            String(row.count),
          ];
          cells.forEach((cell, i) => {
            doc.text(cell, x, y, { width: colWidths[i] });
            x += colWidths[i];
          });
          doc.moveDown(0.3);
        }
      }

      doc.end();
    });
  }

  /**
   * Compute turnaround data shared between Excel and PDF generators
   */
  private async computeTurnaroundData(query: ReportQueryDto) {
    // Build date filter for approvals based on actionDate
    const approvalFilter: FilterQuery<Approval> = { action: 'approved' };
    if (query.startDate || query.endDate) {
      approvalFilter.actionDate = {};
      if (query.startDate) approvalFilter.actionDate.$gte = new Date(query.startDate);
      if (query.endDate) approvalFilter.actionDate.$lte = new Date(query.endDate);
    }

    // Fetch all approved actions within the date range
    const approvals = await this.approvalModel
      .find(approvalFilter)
      .populate({
        path: 'purchaseRequestId',
        select: 'prNumber status departmentId submittedAt completedAt',
        populate: { path: 'departmentId', select: 'name code' },
      })
      .sort({ actionDate: 1 })
      .lean()
      .exec();

    type PopulatedApproval = {
      purchaseRequestId: {
        _id: { toString(): string };
        prNumber: string;
        status: string;
        departmentId: { name: string; code: string } | null;
        submittedAt: Date | null;
        completedAt: Date | null;
      } | null;
      approvalLevel: number;
      actionDate: Date;
    };

    const typedApprovals = approvals as unknown as PopulatedApproval[];

    // Group approvals by PR
    const prApprovals = new Map<string, {
      pr: PopulatedApproval['purchaseRequestId'];
      levels: Map<number, Date>;
    }>();

    for (const a of typedApprovals) {
      const pr = a.purchaseRequestId;
      if (!pr || pr.status !== PrStatus.APPROVED || !pr.submittedAt) continue;

      const prId = pr._id.toString();
      if (!prApprovals.has(prId)) {
        prApprovals.set(prId, { pr, levels: new Map() });
      }
      // Keep the earliest approval action per level
      const entry = prApprovals.get(prId)!;
      if (!entry.levels.has(a.approvalLevel)) {
        entry.levels.set(a.approvalLevel, new Date(a.actionDate));
      }
    }

    // If departmentId filter is set, filter PRs by department
    if (query.departmentId) {
      for (const [prId, entry] of prApprovals) {
        const deptId = (entry.pr as unknown as { departmentId: { _id: { toString(): string } } | null })?.departmentId;
        if (!deptId || (deptId as unknown as { _id: { toString(): string } })._id?.toString() !== query.departmentId) {
          prApprovals.delete(prId);
        }
      }
    }

    // Compute per-level stats
    const levelStats: Record<number, { totalHours: number; count: number }> = {};
    // Compute per-department stats
    const deptStats: Record<string, { name: string; totalHours: number; count: number }> = {};
    // Compute detail rows
    const details: Array<{
      prNumber: string;
      department: string;
      submittedDate: string;
      approvedDate: string;
      totalHours: number;
      level1Hours: number;
      level2Hours: number;
      level3Hours: number;
    }> = [];

    for (const [, entry] of prApprovals) {
      const pr = entry.pr!;
      const submittedAt = new Date(pr.submittedAt!);
      const deptName = pr.departmentId?.name || 'Unknown';

      // Compute level hours
      // Level 1: from submission to level 1 approval
      // Level 2: from level 1 approval to level 2 approval
      // Level 3: from level 2 approval to level 3 approval
      const levelHours: Record<number, number> = {};
      const sortedLevels = [...entry.levels.entries()].sort((a, b) => a[0] - b[0]);

      let prevDate = submittedAt;
      for (const [level, actionDate] of sortedLevels) {
        const hours = (actionDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60);
        levelHours[level] = Math.max(0, hours);
        prevDate = actionDate;

        // Aggregate level stats
        if (!levelStats[level]) levelStats[level] = { totalHours: 0, count: 0 };
        levelStats[level].totalHours += levelHours[level];
        levelStats[level].count++;
      }

      // Total turnaround: from submission to final approval
      const lastApprovalDate = sortedLevels[sortedLevels.length - 1][1];
      const totalHours = Math.max(0, (lastApprovalDate.getTime() - submittedAt.getTime()) / (1000 * 60 * 60));

      // Aggregate department stats
      if (!deptStats[deptName]) deptStats[deptName] = { name: deptName, totalHours: 0, count: 0 };
      deptStats[deptName].totalHours += totalHours;
      deptStats[deptName].count++;

      details.push({
        prNumber: pr.prNumber || 'Draft',
        department: deptName,
        submittedDate: submittedAt.toLocaleDateString(),
        approvedDate: lastApprovalDate.toLocaleDateString(),
        totalHours: Math.round(totalHours * 10) / 10,
        level1Hours: Math.round((levelHours[1] || 0) * 10) / 10,
        level2Hours: Math.round((levelHours[2] || 0) * 10) / 10,
        level3Hours: Math.round((levelHours[3] || 0) * 10) / 10,
      });
    }

    const byLevel = Object.entries(levelStats)
      .map(([level, data]) => ({
        level: Number(level),
        avgHours: Math.round((data.totalHours / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => a.level - b.level);

    const byDepartment = Object.values(deptStats)
      .map((data) => ({
        department: data.name,
        avgHours: Math.round((data.totalHours / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    return { byLevel, byDepartment, details };
  }

  /**
   * Detailed PR Report — PDF for a single purchase request
   */
  async generatePrDetailPdf(id: string): Promise<Buffer> {
    const pr = await this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .lean()
      .exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    const typedPr = pr as unknown as PopulatedPr & {
      justification: string;
      priority: string;
      neededByDate: Date | null;
      attachments: Array<{ originalName: string; size: number }>;
      cancellationReason: string | null;
      requesterId: { firstName: string; lastName: string; email: string; employeeId?: string } | null;
    };

    const approvals = await this.approvalModel
      .find({ purchaseRequestId: id })
      .populate('approverId', 'firstName lastName role')
      .sort({ actionDate: 1 })
      .lean()
      .exec();

    const typedApprovals = approvals as unknown as Array<{
      approvalLevel: number;
      action: string;
      comments: string;
      actionDate: Date;
      approverId: { firstName: string; lastName: string; role: string } | null;
    }>;

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width - 100; // 50 margin each side

      // ── Header ──
      doc.fontSize(20).font('Helvetica-Bold').text('PURCHASE REQUEST', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      doc.moveDown(0.5);

      // Horizontal rule
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.5);
      doc.fillColor('#000');

      // ── PR Info Section ──
      doc.fontSize(12).font('Helvetica-Bold').text('PR Information');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      const infoRows: [string, string][] = [
        ['PR Number', typedPr.prNumber || 'Draft'],
        ['Status', PR_STATUS_LABELS[typedPr.status as PrStatusType] || typedPr.status],
        ['Priority', PR_PRIORITY_LABELS[typedPr.priority as PrPriorityType] || typedPr.priority],
        ['Requester', typedPr.requesterId ? `${typedPr.requesterId.firstName} ${typedPr.requesterId.lastName}` : '—'],
        ['Department', typedPr.departmentId?.name || '—'],
        ['Date Created', new Date(typedPr.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
        ['Date Submitted', typedPr.submittedAt ? new Date(typedPr.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
        ['Needed By', typedPr.neededByDate ? new Date(typedPr.neededByDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
      ];

      for (const [label, value] of infoRows) {
        const y = doc.y;
        doc.font('Helvetica-Bold').text(`${label}:`, 50, y, { width: 120 });
        doc.font('Helvetica').text(value, 170, y, { width: pageWidth - 120 });
        doc.moveDown(0.2);
      }

      doc.moveDown(0.5);

      // ── Description ──
      doc.fontSize(12).font('Helvetica-Bold').text('Description');
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').text(typedPr.description, { width: pageWidth });
      doc.moveDown(0.5);

      // ── Justification ──
      doc.fontSize(12).font('Helvetica-Bold').text('Justification');
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').text(typedPr.justification, { width: pageWidth });
      doc.moveDown(0.8);

      // ── Line Items Table ──
      doc.fontSize(12).font('Helvetica-Bold').text('Line Items');
      doc.moveDown(0.3);

      // Table header
      const colX = [50, 55, 270, 310, 365, 440];
      const colW = [15, 210, 40, 50, 70, 70];
      const headers = ['#', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total'];

      // Header background
      doc.rect(50, doc.y, pageWidth, 18).fillColor('#f0f0f0').fill();
      const headerY = doc.y + 4;
      doc.fillColor('#000').fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        const align = (i >= 2 && i !== 3) ? 'right' : 'left';
        doc.text(h, colX[i], headerY, { width: colW[i], align });
      });
      doc.y = headerY + 18;

      doc.fontSize(8).font('Helvetica');
      for (let idx = 0; idx < typedPr.items.length; idx++) {
        const item = typedPr.items[idx];

        if (doc.y > 720) {
          doc.addPage();
        }

        const rowY = doc.y + 2;
        doc.text(String(idx + 1), colX[0], rowY, { width: colW[0] });
        doc.text(item.description.substring(0, 50), colX[1], rowY, { width: colW[1] });
        doc.text(String(item.quantity), colX[2], rowY, { width: colW[2], align: 'right' });
        doc.text(item.unit, colX[3], rowY, { width: colW[3] });
        doc.text(item.estimatedPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 }), colX[4], rowY, { width: colW[4], align: 'right' });
        doc.text(item.totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 }), colX[5], rowY, { width: colW[5], align: 'right' });
        doc.y = rowY + 14;

        // Row separator
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor('#eee').stroke();
      }

      // Grand total
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(
        `Grand Total: PHP ${typedPr.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        50, doc.y, { width: pageWidth, align: 'right' },
      );
      doc.moveDown(0.8);

      // ── Attachments ──
      if (doc.y > 680) doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').text('Attachments');
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica');

      if (typedPr.attachments && typedPr.attachments.length > 0) {
        typedPr.attachments.forEach((att, i) => {
          doc.text(`${i + 1}. ${att.originalName} (${(att.size / 1024).toFixed(0)} KB)`);
        });
      } else {
        doc.text('No attachments');
      }

      doc.moveDown(0.8);

      // ── Approval History / Audit Trail ──
      if (doc.y > 650) doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').text('Approval History');
      doc.moveDown(0.3);

      if (typedApprovals.length > 0) {
        doc.fontSize(9).font('Helvetica');
        for (const entry of typedApprovals) {
          if (doc.y > 720) doc.addPage();

          const levelLabel = APPROVAL_LEVEL_LABELS[entry.approvalLevel] || `Level ${entry.approvalLevel}`;
          const approverName = entry.approverId
            ? `${entry.approverId.firstName} ${entry.approverId.lastName}`
            : 'Unknown';
          const actionStr = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);
          const dateStr = new Date(entry.actionDate).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
          });

          doc.font('Helvetica-Bold').text(`${levelLabel} — ${actionStr}`, { continued: false });
          doc.font('Helvetica').text(`  By: ${approverName}  |  Date: ${dateStr}`);
          if (entry.comments) {
            doc.text(`  Comments: "${entry.comments}"`);
          }
          doc.moveDown(0.3);
        }
      } else {
        doc.fontSize(10).font('Helvetica').text('No approval actions recorded.');
      }

      doc.moveDown(1);

      // ── Signature Lines ──
      if (doc.y > 600) doc.addPage();

      doc.fontSize(12).font('Helvetica-Bold').text('Signatures');
      doc.moveDown(0.8);

      // Build a map of approved actions by level
      const approvedByLevel: Record<number, string> = {};
      for (const entry of typedApprovals) {
        if (entry.action === 'approved' && entry.approverId) {
          approvedByLevel[entry.approvalLevel] = `${entry.approverId.firstName} ${entry.approverId.lastName}`;
        }
      }

      const signatureRoles = [
        { level: 1, label: 'Department Head' },
        { level: 2, label: 'COO' },
        { level: 3, label: 'CEO' },
      ];

      const sigWidth = (pageWidth - 40) / 3;

      const sigY = doc.y;
      for (let i = 0; i < signatureRoles.length; i++) {
        const { level, label } = signatureRoles[i];
        const x = 50 + i * (sigWidth + 20);

        // Signature line
        doc.moveTo(x, sigY + 30).lineTo(x + sigWidth, sigY + 30).strokeColor('#000').stroke();

        // Name of approver (if signed)
        if (approvedByLevel[level]) {
          doc.fontSize(9).font('Helvetica').text(approvedByLevel[level], x, sigY + 34, {
            width: sigWidth,
            align: 'center',
          });
        }

        // Role label
        doc.fontSize(9).font('Helvetica-Bold').text(label, x, sigY + 48, {
          width: sigWidth,
          align: 'center',
        });
      }

      doc.end();
    });
  }
}
