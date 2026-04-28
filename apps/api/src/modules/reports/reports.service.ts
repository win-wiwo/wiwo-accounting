import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
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
  async generatePrDetailPdf(id: string): Promise<Buffer> {
    const pr = await this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId role')
      .populate('departmentId', 'name code')
      .populate('projectId', 'name code')
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
      requesterId: { firstName: string; lastName: string; email: string; employeeId?: string; role: string } | null;
      projectId: { name: string; code: string | null } | null;
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

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const LEFT = 40;
      const RIGHT = doc.page.width - 40;
      const pageWidth = RIGHT - LEFT;
      const formatDate = (d: Date | string | null) =>
        d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      const formatCurrency = (n: number) =>
        n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Helper: draw a bordered cell
      const drawCell = (x: number, y: number, w: number, h: number, text: string, opts?: {
        bold?: boolean; fontSize?: number; align?: 'left' | 'center' | 'right'; bg?: string; vAlign?: 'top' | 'center';
      }) => {
        const { bold = false, fontSize = 9, align = 'left', bg, vAlign = 'center' } = opts || {};
        if (bg) {
          doc.save().rect(x, y, w, h).fillColor(bg).fill().restore();
        }
        doc.rect(x, y, w, h).strokeColor('#000').lineWidth(0.5).stroke();
        doc.fillColor('#000').fontSize(fontSize).font(bold ? 'Helvetica-Bold' : 'Helvetica');
        const padding = 4;
        const textY = vAlign === 'top' ? y + padding : y + (h - fontSize) / 2;
        doc.text(text, x + padding, textY, { width: w - padding * 2, align });
      };

      // ════════════════════════════════════════════════════════════
      // HEADER — Company Logo + Form Title + Document Info
      // ════════════════════════════════════════════════════════════
      const headerTop = doc.y;

      if (hasLogo) {
        doc.image(logoPath, LEFT, headerTop, { width: 60 });
      }

      // Company name and form title
      const titleX = LEFT + (hasLogo ? 70 : 0);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
        .text('WILSONWORKS PH', titleX, headerTop, { width: pageWidth - (hasLogo ? 70 : 0) - 150 });
      doc.fontSize(8).font('Helvetica').fillColor('#444')
        .text('Purchase Request and Approval Management System', titleX, headerTop + 14, { width: pageWidth - (hasLogo ? 70 : 0) - 150 });

      // Form title — right side
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
        .text('ANNEX A', RIGHT - 150, headerTop, { width: 150, align: 'right' });
      doc.fontSize(10).font('Helvetica')
        .text('Purchase Request Form', RIGHT - 150, headerTop + 18, { width: 150, align: 'right' });

      doc.y = headerTop + 45;

      // Separator line
      doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).lineWidth(1.5).strokeColor('#000').stroke();
      doc.y += 8;

      // ════════════════════════════════════════════════════════════
      // FORM INFO — Date, PR No., Requestor, Department, Project
      // ════════════════════════════════════════════════════════════
      const infoTop = doc.y;
      const col1W = 80;  // label width
      const col2W = pageWidth / 2 - col1W; // value width
      const col3W = 80;
      const col4W = pageWidth / 2 - col3W;
      const rowH = 20;

      // Row 1: Date | PR No.
      drawCell(LEFT, infoTop, col1W, rowH, 'Date:', { bold: true, bg: '#f5f5f5' });
      drawCell(LEFT + col1W, infoTop, col2W, rowH, formatDate(typedPr.submittedAt || typedPr.createdAt));
      drawCell(LEFT + pageWidth / 2, infoTop, col3W, rowH, 'PR No.:', { bold: true, bg: '#f5f5f5' });
      drawCell(LEFT + pageWidth / 2 + col3W, infoTop, col4W, rowH, typedPr.prNumber || 'DRAFT');

      // Row 2: Requestor | Department
      const row2Y = infoTop + rowH;
      drawCell(LEFT, row2Y, col1W, rowH, 'Requestor:', { bold: true, bg: '#f5f5f5' });
      drawCell(LEFT + col1W, row2Y, col2W, rowH,
        typedPr.requesterId ? `${typedPr.requesterId.firstName} ${typedPr.requesterId.lastName}` : '—');
      drawCell(LEFT + pageWidth / 2, row2Y, col3W, rowH, 'Department:', { bold: true, bg: '#f5f5f5' });
      drawCell(LEFT + pageWidth / 2 + col3W, row2Y, col4W, rowH, typedPr.departmentId?.name || '—');

      // Row 3: Project Name (full width)
      const row3Y = row2Y + rowH;
      drawCell(LEFT, row3Y, col1W, rowH, 'Project:', { bold: true, bg: '#f5f5f5' });
      drawCell(LEFT + col1W, row3Y, pageWidth - col1W, rowH,
        typedPr.projectId ? `${typedPr.projectId.name}${typedPr.projectId.code ? ` (${typedPr.projectId.code})` : ''}` : typedPr.title);

      doc.y = row3Y + rowH + 4;

      // ════════════════════════════════════════════════════════════
      // PURPOSE
      // ════════════════════════════════════════════════════════════
      const purposeTop = doc.y;
      const purposeH = Math.max(40, Math.ceil(typedPr.justification.length / 90) * 14 + 16);
      drawCell(LEFT, purposeTop, col1W, purposeH, 'Purpose:', { bold: true, bg: '#f5f5f5', vAlign: 'top' });
      drawCell(LEFT + col1W, purposeTop, pageWidth - col1W, purposeH, typedPr.justification, { vAlign: 'top' });

      doc.y = purposeTop + purposeH + 8;

      // ════════════════════════════════════════════════════════════
      // LINE ITEMS TABLE
      // ════════════════════════════════════════════════════════════
      const tableTop = doc.y;
      const colWidths = [30, pageWidth - 30 - 45 - 50 - 80 - 80, 45, 50, 80, 80];
      const colStarts = [LEFT];
      for (let i = 1; i < colWidths.length; i++) {
        colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
      }
      const tableHeaders = ['No.', 'Item Description', 'Qty', 'Unit', 'Est. Cost', 'Total'];
      const headerH = 22;

      // Header row
      tableHeaders.forEach((h, i) => {
        drawCell(colStarts[i], tableTop, colWidths[i], headerH, h, {
          bold: true, fontSize: 8, align: i >= 2 ? 'center' : 'left', bg: '#e8e8e8',
        });
      });

      let currentY = tableTop + headerH;

      for (let idx = 0; idx < typedPr.items.length; idx++) {
        const item = typedPr.items[idx];

        // Calculate row height based on description length
        const descLines = Math.ceil(item.description.length / 45);
        const itemRowH = Math.max(18, descLines * 12 + 6);

        if (currentY + itemRowH > 720) {
          doc.addPage();
          currentY = 40;
        }

        drawCell(colStarts[0], currentY, colWidths[0], itemRowH, String(idx + 1), { align: 'center' });
        drawCell(colStarts[1], currentY, colWidths[1], itemRowH, item.description, { vAlign: 'top' });
        drawCell(colStarts[2], currentY, colWidths[2], itemRowH, String(item.quantity), { align: 'center' });
        drawCell(colStarts[3], currentY, colWidths[3], itemRowH, item.unit, { align: 'center' });
        drawCell(colStarts[4], currentY, colWidths[4], itemRowH, formatCurrency(item.estimatedPrice), { align: 'right' });
        drawCell(colStarts[5], currentY, colWidths[5], itemRowH, formatCurrency(item.totalPrice), { align: 'right' });

        currentY += itemRowH;
      }

      // Grand Total row
      const totalRowH = 24;
      const totalLabelW = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];
      drawCell(colStarts[0], currentY, totalLabelW, totalRowH, 'GRAND TOTAL', {
        bold: true, fontSize: 10, align: 'right', bg: '#e8e8e8',
      });
      drawCell(colStarts[5], currentY, colWidths[5], totalRowH, `PHP ${formatCurrency(typedPr.totalAmount)}`, {
        bold: true, fontSize: 10, align: 'right', bg: '#e8e8e8',
      });

      currentY += totalRowH + 12;
      doc.y = currentY;

      // ════════════════════════════════════════════════════════════
      // SIGNATURE BLOCKS — Annex A requires 4 signature blocks
      // ════════════════════════════════════════════════════════════
      // Check if we need a new page for signatures
      if (doc.y > 540) doc.addPage();

      const sigTop = doc.y;
      const sigBlockW = (pageWidth - 20) / 2;
      const sigBlockH = 80;

      // Build approval data map
      const approvedByLevel: Record<number, { name: string; date: Date }> = {};
      for (const entry of typedApprovals) {
        if (entry.action === 'approved' && entry.approverId) {
          approvedByLevel[entry.approvalLevel] = {
            name: `${entry.approverId.firstName} ${entry.approverId.lastName}`,
            date: entry.actionDate,
          };
        }
      }

      const drawSignatureBlock = (x: number, y: number, w: number, h: number, opts: {
        headerLabel: string; headerNote?: string; name?: string; designation?: string; date?: string;
      }) => {
        doc.rect(x, y, w, h).strokeColor('#000').lineWidth(0.5).stroke();

        // Header label
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000')
          .text(opts.headerLabel, x + 6, y + 4, { width: w - 12 });
        if (opts.headerNote) {
          doc.fontSize(7).font('Helvetica-Oblique').fillColor('#555')
            .text(opts.headerNote, x + 6, y + 14, { width: w - 12 });
        }

        // Signature line
        const lineY = y + h - 30;
        doc.moveTo(x + 20, lineY).lineTo(x + w - 20, lineY).strokeColor('#000').lineWidth(0.5).stroke();

        // Name
        if (opts.name) {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
            .text(opts.name, x + 6, lineY + 2, { width: w - 12, align: 'center' });
        }

        // Designation
        if (opts.designation) {
          doc.fontSize(7).font('Helvetica').fillColor('#444')
            .text(opts.designation, x + 6, lineY + 14, { width: w - 12, align: 'center' });
        }

        // Date
        if (opts.date) {
          doc.fontSize(7).font('Helvetica').fillColor('#444')
            .text(`Date: ${opts.date}`, x + 6, lineY + 22, { width: w - 12, align: 'center' });
        }
      };

      // Row 1: Prepared by (Requestor) | Certified by (Dept Head)
      const requesterName = typedPr.requesterId
        ? `${typedPr.requesterId.firstName} ${typedPr.requesterId.lastName}`
        : '';
      const requesterRole = typedPr.requesterId
        ? ROLE_LABELS[typedPr.requesterId.role as UserRoleType] || typedPr.requesterId.role
        : '';

      drawSignatureBlock(LEFT, sigTop, sigBlockW, sigBlockH, {
        headerLabel: 'Prepared by:',
        name: requesterName,
        designation: requesterRole,
        date: formatDate(typedPr.submittedAt || typedPr.createdAt),
      });

      const deptHeadApproval = approvedByLevel[1];
      drawSignatureBlock(LEFT + sigBlockW + 20, sigTop, sigBlockW, sigBlockH, {
        headerLabel: 'Certified by:',
        headerNote: 'I certify that items listed are essential to operations',
        name: deptHeadApproval?.name || (deptHead ? `${deptHead.firstName} ${deptHead.lastName}` : ''),
        designation: 'Department Head',
        date: deptHeadApproval ? formatDate(deptHeadApproval.date) : '',
      });

      // Row 2: Approved by (COO) | Certified by (President/CEO)
      const row2SigY = sigTop + sigBlockH + 10;

      const cooApproval = approvedByLevel[2];
      drawSignatureBlock(LEFT, row2SigY, sigBlockW, sigBlockH, {
        headerLabel: 'Approved by:',
        name: cooApproval?.name || 'Patrick Ryan L. Po',
        designation: 'Chief Operations Officer (COO)',
        date: cooApproval ? formatDate(cooApproval.date) : '',
      });

      const ceoApproval = approvedByLevel[3];
      drawSignatureBlock(LEFT + sigBlockW + 20, row2SigY, sigBlockW, sigBlockH, {
        headerLabel: 'Certified by:',
        name: ceoApproval?.name || 'Cesar Manuel S. Lorenzo',
        designation: 'President',
        date: ceoApproval ? formatDate(ceoApproval.date) : '',
      });

      doc.y = row2SigY + sigBlockH + 12;

      // ════════════════════════════════════════════════════════════
      // FOOTER — Form reference
      // ════════════════════════════════════════════════════════════
      doc.fontSize(7).font('Helvetica').fillColor('#999')
        .text('Annex A — Purchase Request Form (For Goods) | WIWO ACCTG-MEMO2026-001', LEFT, doc.y, {
          width: pageWidth, align: 'center',
        });

      doc.end();
    });
  }
}
