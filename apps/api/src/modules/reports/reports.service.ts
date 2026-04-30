import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import PDFDocument = require('pdfkit');
import {
  PR_STATUS_LABELS,
  PR_PRIORITY_LABELS,
  APPROVAL_LEVEL_LABELS,
  ROLE_LABELS,
  PrStatus,
  type PrStatus as PrStatusType,
  type PrPriority as PrPriorityType,
  type UserRole as UserRoleType,
} from '@prams/shared';
import { PurchaseRequest } from '../purchase-requests/schemas/purchase-request.schema';
import { Department } from '../departments/schemas/department.schema';
import { Approval } from '../approvals/schemas/approval.schema';
import { Project } from '../projects/schemas/project.schema';
import { User } from '../users/schemas/user.schema';
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
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<User>,
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
   * Annex A — Purchase Request Form PDF
   * Replicates the official WIWO accounting form layout
   */
  async generatePrDetailPdf(id: string): Promise<{ buffer: Buffer; prNumber: string }> {
    const pr = await this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId role signatureUrl')
      .populate('departmentId', 'name code')
      .populate('projectId', 'name code')
      .lean()
      .exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    const items = ((pr as unknown as { items?: Array<{ sourcingType?: string }> }).items) ?? [];
    const hasProcurementItems = items.some((it) => it.sourcingType === 'procurement');
    const status = (pr as unknown as { status: string }).status;

    // PO/PR form may only be printed once the relevant COO sign-off is on record.
    // - Online-only PR: COO need approval (Level 2) must be done → status is LEVEL3_REVIEW or later.
    // - PR with procurement items: COO price sign-off (after QUOTED) must be done → status is APPROVED or later.
    const onlineOnlyAllowed: string[] = [PrStatus.LEVEL3_REVIEW, PrStatus.APPROVED, PrStatus.COMPLETED];
    const procurementAllowed: string[] = [PrStatus.APPROVED, PrStatus.COMPLETED];
    const allowedStatuses = hasProcurementItems ? procurementAllowed : onlineOnlyAllowed;
    if (!allowedStatuses.includes(status)) {
      throw new ForbiddenException(
        hasProcurementItems
          ? 'PDF can be downloaded only after COO has approved the canvassed price.'
          : 'PDF can be downloaded only after COO has approved the request.',
      );
    }

    const typedPr = pr as unknown as PopulatedPr & {
      justification: string;
      priority: string;
      requestType: string;
      neededByDate: Date | null;
      attachments: Array<{ originalName: string; size: number }>;
      cancellationReason: string | null;
      requesterId: { firstName: string; lastName: string; email: string; employeeId?: string; role: string; signatureUrl: string | null } | null;
      projectId: { name: string; code: string | null } | null;
    };

    const approvals = await this.approvalModel
      .find({ purchaseRequestId: new Types.ObjectId(id) })
      .populate('approverId', 'firstName lastName role signatureUrl')
      .sort({ actionDate: 1 })
      .lean()
      .exec();

    const typedApprovals = approvals as unknown as Array<{
      approvalLevel: number;
      action: string;
      comments: string;
      actionDate: Date;
      approverId: { firstName: string; lastName: string; role: string; signatureUrl: string | null } | null;
    }>;

    // Fallback approvers by role (for unapproved/draft PRs or missing approval records)
    const [cooUser, ceoUser] = await Promise.all([
      this.userModel.findOne({ role: 'coo', isActive: true }, 'firstName lastName').lean().exec() as Promise<{ firstName: string; lastName: string } | null>,
      this.userModel.findOne({ role: 'ceo', isActive: true }, 'firstName lastName').lean().exec() as Promise<{ firstName: string; lastName: string } | null>,
    ]);

    // Get department head info for the "Certified by" block
    let deptHead: { firstName: string; lastName: string } | null = null;
    if ((pr as Record<string, unknown>).departmentId) {
      const deptId = typeof (pr as Record<string, unknown>).departmentId === 'object'
        ? ((pr as Record<string, unknown>).departmentId as { _id: string })._id
        : (pr as Record<string, unknown>).departmentId;
      const deptDoc = await this.departmentModel.findById(deptId).populate('headId', 'firstName lastName').lean().exec();
      if (deptDoc && (deptDoc as unknown as { headId: { firstName: string; lastName: string } | null }).headId) {
        deptHead = (deptDoc as unknown as { headId: { firstName: string; lastName: string } }).headId;
      }
    }

    const logoPath = path.join(__dirname, '..', '..', 'assets', 'wiwo-logo.jpeg');
    const hasLogo = fs.existsSync(logoPath);

    const prNumber = typedPr.prNumber || 'PR-Draft';

    const buffer = await new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const LEFT = 40;
      const RIGHT = doc.page.width - 40;
      const pageWidth = RIGHT - LEFT;
      const HALF = pageWidth / 2;

      const formatDate = (d: Date | string | null) =>
        d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      const formatCurrency = (n: number) =>
        n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Helper: draw a bordered cell
      const drawCell = (x: number, y: number, w: number, h: number, text: string, opts?: {
        bold?: boolean; italic?: boolean; fontSize?: number; align?: 'left' | 'center' | 'right'; bg?: string; vAlign?: 'top' | 'center'; color?: string; padX?: number; padY?: number;
      }) => {
        const { bold = false, italic = false, fontSize = 9, align = 'left', bg, vAlign = 'center', color = '#000', padX = 4, padY = 3 } = opts || {};
        if (bg) {
          doc.save().rect(x, y, w, h).fillColor(bg).fill().restore();
        }
        doc.rect(x, y, w, h).strokeColor('#000').lineWidth(0.5).stroke();
        const fontName = bold && italic ? 'Helvetica-BoldOblique' : bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica';
        doc.fillColor(color).fontSize(fontSize).font(fontName);
        const textY = vAlign === 'top' ? y + padY : y + (h - fontSize) / 2 + 1;
        doc.text(text, x + padX, textY, { width: w - padX * 2, align });
      };

      // ════════════════════════════════════════════════════════════
      // FORM VARIANT — Purchase Request (Annex A) or Job Request (Annex B)
      // ════════════════════════════════════════════════════════════
      const isJobRequest = typedPr.requestType === 'job_request';
      const formCode = isJobRequest ? 'JR' : 'PR';
      const formAnnex = isJobRequest ? 'B' : 'A';
      const formTitle = isJobRequest ? 'JOB REQUEST' : 'PURCHASE REQUEST';
      const numberLabel = isJobRequest ? 'JR No.:' : 'PR No.:';

      // ════════════════════════════════════════════════════════════
      // TOP-RIGHT FORM TAG (italic, no border)
      // ════════════════════════════════════════════════════════════
      const tagYear = new Date(typedPr.submittedAt || typedPr.createdAt).getFullYear();
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#000')
        .text(`${tagYear} ACCTG-${formCode} Annex ${formAnnex}`, LEFT, 30, { width: pageWidth, align: 'right' });

      // Start the bordered form
      const formTop = 50;
      let cursorY = formTop;

      // ════════════════════════════════════════════════════════════
      // HEADER — Logo (left) + Company Info (right)
      // ════════════════════════════════════════════════════════════
      const headerH = 68;
      const logoCellW = 130;
      // Single outer border for the header row (no inner divider)
      doc.rect(LEFT, cursorY, pageWidth, headerH).strokeColor('#000').lineWidth(0.5).stroke();

      if (hasLogo) {
        // fit + align/valign preserves aspect ratio and centers the image inside the box
        doc.image(logoPath, LEFT + 8, cursorY + 6, {
          fit: [logoCellW - 16, headerH - 12],
          align: 'center',
          valign: 'center',
        });
      }

      // Center the company info text relative to the whole header (logo overlays on the left, ignore it for text positioning)
      const infoBlockH = 14 + 12 + 12 + 12; // title + line1 + line2 + tin
      const infoStartY = cursorY + (headerH - infoBlockH) / 2;
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000')
        .text('WILSON WORKS TRADING INC.', LEFT, infoStartY, { width: pageWidth, align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor('#000')
        .text('Unit 605, Jafer Place Bldg. 19,', LEFT, infoStartY + 18, { width: pageWidth, align: 'center' });
      doc.text('Eisenhower St. Brgy. Greenhills 1502, City of San Juan, NCR', LEFT, infoStartY + 30, { width: pageWidth, align: 'center' });
      doc.fontSize(9).font('Helvetica-Bold')
        .text('TIN: 010-430-279-00000', LEFT, infoStartY + 42, { width: pageWidth, align: 'center' });

      cursorY += headerH;

      // ════════════════════════════════════════════════════════════
      // TITLE ROW — "PURCHASE REQUEST" (left) | Date + PR No. (right)
      // ════════════════════════════════════════════════════════════
      const titleRowH = 44;
      const subRowH = titleRowH / 2;
      const labelW = 70;

      // Left half: form title (spans both sub-rows)
      drawCell(LEFT, cursorY, HALF, titleRowH, formTitle, {
        bold: true, fontSize: 12, align: 'center',
      });

      // Right half: 2 sub-rows (Date, PR No.)
      drawCell(LEFT + HALF, cursorY, labelW, subRowH, 'Date:', { bold: true });
      drawCell(LEFT + HALF + labelW, cursorY, HALF - labelW, subRowH,
        formatDate(typedPr.submittedAt || typedPr.createdAt), { align: 'center' });

      drawCell(LEFT + HALF, cursorY + subRowH, labelW, subRowH, numberLabel, { bold: true });
      drawCell(LEFT + HALF + labelW, cursorY + subRowH, HALF - labelW, subRowH,
        typedPr.prNumber || 'DRAFT', { align: 'center' });

      cursorY += titleRowH;

      // ════════════════════════════════════════════════════════════
      // INFO ROWS — Requestor, Department, Project Name
      // ════════════════════════════════════════════════════════════
      const infoRowH = 20;
      const infoLabelW = 90;

      drawCell(LEFT, cursorY, infoLabelW, infoRowH, 'Requestor', { bold: true });
      drawCell(LEFT + infoLabelW, cursorY, pageWidth - infoLabelW, infoRowH,
        typedPr.requesterId ? `${typedPr.requesterId.firstName} ${typedPr.requesterId.lastName}` : '');
      cursorY += infoRowH;

      drawCell(LEFT, cursorY, infoLabelW, infoRowH, 'Department', { bold: true });
      drawCell(LEFT + infoLabelW, cursorY, pageWidth - infoLabelW, infoRowH,
        typedPr.departmentId?.name || '');
      cursorY += infoRowH;

      drawCell(LEFT, cursorY, infoLabelW, infoRowH, 'Project Name', { bold: true });
      drawCell(LEFT + infoLabelW, cursorY, pageWidth - infoLabelW, infoRowH,
        typedPr.projectId
          ? `${typedPr.projectId.name}${typedPr.projectId.code ? ` (${typedPr.projectId.code})` : ''}`
          : (typedPr.title || ''));
      cursorY += infoRowH;

      // ════════════════════════════════════════════════════════════
      // PURPOSE — full-width header bar + body
      // ════════════════════════════════════════════════════════════
      const purposeHeaderH = 18;
      drawCell(LEFT, cursorY, pageWidth, purposeHeaderH, 'Purpose', {
        bold: true, align: 'center', fontSize: 10,
      });
      cursorY += purposeHeaderH;

      const purposeText = typedPr.justification || '';
      const purposeBodyH = Math.max(50, Math.ceil(purposeText.length / 95) * 12 + 14);
      drawCell(LEFT, cursorY, pageWidth, purposeBodyH, purposeText, { vAlign: 'top', padY: 6, padX: 6 });
      cursorY += purposeBodyH;

      // ════════════════════════════════════════════════════════════
      // ITEMS TABLE — 4 columns: Description | Qty | Estimated Cost | Total
      // ════════════════════════════════════════════════════════════
      const qtyW = 50;
      const estCostW = 95;
      const totalW = 95;
      const descW = pageWidth - qtyW - estCostW - totalW;
      const colXs = [LEFT, LEFT + descW, LEFT + descW + qtyW, LEFT + descW + qtyW + estCostW];
      const colWs = [descW, qtyW, estCostW, totalW];

      const itemHeaderH = 22;
      const itemHeaders = ['Item Description', 'Qty', 'Estimated Cost', 'Total'];
      itemHeaders.forEach((h, i) => {
        drawCell(colXs[i], cursorY, colWs[i], itemHeaderH, h, {
          bold: true, fontSize: 10, align: 'center',
        });
      });
      cursorY += itemHeaderH;

      // Item rows — pad to a minimum number of rows so the form looks consistent
      const MIN_ITEM_ROWS = 10;
      const itemRowH = 18;
      const itemCount = typedPr.items.length;
      const totalRows = Math.max(itemCount, MIN_ITEM_ROWS);
      const itemsBodyTop = cursorY;
      const itemsBodyH = totalRows * itemRowH;

      // Draw outer border + vertical column dividers only (no horizontal lines between rows)
      doc.rect(LEFT, itemsBodyTop, pageWidth, itemsBodyH).strokeColor('#000').lineWidth(0.5).stroke();
      for (let i = 1; i < colXs.length; i++) {
        doc.moveTo(colXs[i], itemsBodyTop).lineTo(colXs[i], itemsBodyTop + itemsBodyH)
          .strokeColor('#000').lineWidth(0.5).stroke();
      }

      // Render text in each row without drawing per-row borders
      const drawText = (x: number, y: number, w: number, h: number, text: string, opts?: {
        bold?: boolean; fontSize?: number; align?: 'left' | 'center' | 'right'; color?: string; padX?: number;
      }) => {
        const { bold = false, fontSize = 9, align = 'left', color = '#000', padX = 4 } = opts || {};
        doc.fillColor(color).fontSize(fontSize).font(bold ? 'Helvetica-Bold' : 'Helvetica');
        const textY = y + (h - fontSize) / 2 + 1;
        doc.text(text, x + padX, textY, { width: w - padX * 2, align });
      };

      for (let idx = 0; idx < totalRows; idx++) {
        if (idx < itemCount) {
          const item = typedPr.items[idx];
          drawText(colXs[0], cursorY, colWs[0], itemRowH, item.description, { padX: 6 });
          drawText(colXs[1], cursorY, colWs[1], itemRowH, String(item.quantity), { align: 'center' });
          drawText(colXs[2], cursorY, colWs[2], itemRowH, formatCurrency(item.estimatedPrice), { align: 'right', padX: 6 });
          drawText(colXs[3], cursorY, colWs[3], itemRowH, formatCurrency(item.totalPrice), { align: 'right', padX: 6 });
        } else {
          drawText(colXs[3], cursorY, colWs[3], itemRowH, '-', { align: 'right', padX: 6, color: '#666' });
        }
        cursorY += itemRowH;
      }

      // Grand Total row
      const totalRowH = 22;
      const totalLabelW = colWs[0] + colWs[1] + colWs[2];
      drawCell(colXs[0], cursorY, totalLabelW, totalRowH, 'Total:', {
        bold: true, fontSize: 11, align: 'right', padX: 8,
      });
      drawCell(colXs[3], cursorY, colWs[3], totalRowH, formatCurrency(typedPr.totalAmount), {
        bold: true, fontSize: 11, align: 'right', padX: 6,
      });
      cursorY += totalRowH;

      // ════════════════════════════════════════════════════════════
      // SIGNATURE BLOCKS — 2x2 grid
      //   Top-left:  Prepared by (Requestor)
      //   Top-right: Approved by (Level 2 — COO)
      //   Bottom-left: Certified by (Level 1 — Dept Head, with cert text)
      //   Bottom-right: (no header) President (Level 3 — CEO)
      // ════════════════════════════════════════════════════════════

      // Build approval data map
      const approvedByLevel: Record<number, { name: string; date: Date; signatureUrl: string | null }> = {};
      for (const entry of typedApprovals) {
        if (entry.action === 'approved' && entry.approverId) {
          approvedByLevel[entry.approvalLevel] = {
            name: `${entry.approverId.firstName} ${entry.approverId.lastName}`,
            date: entry.actionDate,
            signatureUrl: entry.approverId.signatureUrl ?? null,
          };
        }
      }

      // Resolve a signature URL (e.g. "/uploads/signatures/abc.png") to an absolute file path
      const resolveSignaturePath = (url: string | null | undefined): string | null => {
        if (!url || !url.startsWith('/uploads/')) return null;
        const abs = path.join(process.cwd(), url);
        return fs.existsSync(abs) ? abs : null;
      };

      const sigBlockH = 92;
      const sigDateRowH = 18;
      const sigContentH = sigBlockH - sigDateRowH;
      const sigDateLabelW = 60;

      type SigOpts = {
        x: number; y: number; w: number;
        headerLabel?: string;
        certText?: string;
        name: string;
        designation: string;
        dateText: string;
        signaturePath?: string | null;
      };

      const drawSigBlock = (opts: SigOpts) => {
        const { x, y, w, headerLabel, certText, name, designation, dateText, signaturePath } = opts;

        // Outer content cell (without date sub-row)
        drawCell(x, y, w, sigContentH, '', {});

        let headerEndY = y + 4;
        if (headerLabel) {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
            .text(headerLabel, x + 6, headerEndY, { width: w - 12 });
          headerEndY += 12;
        }
        if (certText) {
          doc.fontSize(7.5).font('Helvetica').fillColor('#000')
            .text(certText, x + 6, headerEndY, { width: w - 12 });
          // NOTE: do not advance headerEndY here — signature is allowed to overlay
          // the cert text so the block keeps the same height as the other blocks.
        }

        // Name + designation pinned near the bottom of the content cell
        const nameY = y + sigContentH - 26;

        // Signature image (when available) is given a consistent zone between the
        // header line and the printed name, regardless of cert text. For dept-head
        // blocks this means the scribble overlays the cert paragraph — desired.
        if (signaturePath) {
          const sigZoneTop = headerEndY + 2;
          const sigZoneBottom = nameY - 2;
          const sigZoneH = sigZoneBottom - sigZoneTop;
          if (sigZoneH > 14) {
            const sigBoxW = Math.min(w - 24, 180);
            const sigBoxX = x + (w - sigBoxW) / 2;
            try {
              doc.image(signaturePath, sigBoxX, sigZoneTop, {
                fit: [sigBoxW, sigZoneH],
                align: 'center',
                valign: 'bottom',
              });
            } catch {
              // ignore unreadable images
            }
          }
        }

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000')
          .text(name.toUpperCase(), x + 6, nameY, { width: w - 12, align: 'center' });
        doc.fontSize(8).font('Helvetica').fillColor('#000')
          .text(designation, x + 6, nameY + 12, { width: w - 12, align: 'center' });

        // Date sub-row
        const dateY = y + sigContentH;
        drawCell(x, dateY, sigDateLabelW, sigDateRowH, 'Date:', { bold: true });
        drawCell(x + sigDateLabelW, dateY, w - sigDateLabelW, sigDateRowH, dateText, { align: 'center' });
      };

      // Page-break safety for signature blocks
      const sigsTotalH = sigBlockH * 2;
      if (cursorY + sigsTotalH > doc.page.height - 40) {
        doc.addPage();
        cursorY = 40;
      }

      // Row 1: Prepared by | Approved by
      const requesterName = typedPr.requesterId
        ? `${typedPr.requesterId.firstName} ${typedPr.requesterId.lastName}`
        : '';
      const requesterRole = typedPr.requesterId
        ? ROLE_LABELS[typedPr.requesterId.role as UserRoleType] || typedPr.requesterId.role
        : '';

      // Show requester's signature once the PR has been submitted (i.e. not a draft)
      const requesterSignaturePath = typedPr.status !== 'draft'
        ? resolveSignaturePath(typedPr.requesterId?.signatureUrl ?? null)
        : null;

      drawSigBlock({
        x: LEFT, y: cursorY, w: HALF,
        headerLabel: 'Prepared by:',
        name: requesterName,
        designation: requesterRole,
        dateText: formatDate(typedPr.submittedAt || typedPr.createdAt),
        signaturePath: requesterSignaturePath,
      });

      const cooApproval = approvedByLevel[2];
      const cooName = cooApproval?.name
        || (cooUser ? `${cooUser.firstName} ${cooUser.lastName}` : '');
      drawSigBlock({
        x: LEFT + HALF, y: cursorY, w: HALF,
        headerLabel: 'Approved by:',
        name: cooName,
        designation: 'Chief, Operations Officer',
        dateText: cooApproval ? formatDate(cooApproval.date) : '',
        signaturePath: resolveSignaturePath(cooApproval?.signatureUrl ?? null),
      });

      cursorY += sigBlockH;

      // Row 2: Certified by (Dept Head + cert text) | President (no header)
      const deptHeadApproval = approvedByLevel[1];
      const deptHeadName = deptHeadApproval?.name
        || (deptHead ? `${deptHead.firstName} ${deptHead.lastName}` : '');
      const deptHeadDesignation = `Department Head${typedPr.departmentId?.name ? `, ${typedPr.departmentId.name}` : ''}`;

      drawSigBlock({
        x: LEFT, y: cursorY, w: HALF,
        headerLabel: 'Certified by:',
        certText: 'I hereby certify that the following items being requested are necessary and essential to the company’s daily operations.',
        name: deptHeadName,
        designation: deptHeadDesignation,
        dateText: deptHeadApproval ? formatDate(deptHeadApproval.date) : '',
        signaturePath: resolveSignaturePath(deptHeadApproval?.signatureUrl ?? null),
      });

      const ceoApproval = approvedByLevel[3];
      const ceoName = ceoApproval?.name
        || (ceoUser ? `${ceoUser.firstName} ${ceoUser.lastName}` : '');
      drawSigBlock({
        x: LEFT + HALF, y: cursorY, w: HALF,
        name: ceoName,
        designation: 'President',
        dateText: ceoApproval ? formatDate(ceoApproval.date) : '',
        signaturePath: resolveSignaturePath(ceoApproval?.signatureUrl ?? null),
      });

      cursorY += sigBlockH;

      doc.end();
    });

    return { buffer, prNumber };
  }
}
