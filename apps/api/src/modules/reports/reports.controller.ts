import {
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('pr-summary')
  @ApiOperation({ summary: 'Generate PR summary report (Excel or PDF)' })
  async prSummary(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const format = query.format || 'excel';
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      const buffer = await this.reportsService.generateSummaryPdf(query);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=PR-Summary-${timestamp}.pdf`,
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } else {
      const buffer = await this.reportsService.generateSummaryExcel(query);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=PR-Summary-${timestamp}.xlsx`,
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    }
  }

  @Get('department-spending')
  @ApiOperation({ summary: 'Generate department spending report (Excel)' })
  async departmentSpending(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const timestamp = new Date().toISOString().split('T')[0];
    const buffer = await this.reportsService.generateDepartmentSpendingExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=Department-Spending-${timestamp}.xlsx`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('turnaround')
  @ApiOperation({ summary: 'Generate approval turnaround report (Excel or PDF)' })
  async turnaroundReport(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const format = query.format || 'excel';
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      const buffer = await this.reportsService.generateTurnaroundPdf(query);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Approval-Turnaround-${timestamp}.pdf`,
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } else {
      const buffer = await this.reportsService.generateTurnaroundExcel(query);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=Approval-Turnaround-${timestamp}.xlsx`,
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    }
  }

  @Get('pr-detail/:id')
  @ApiOperation({ summary: 'Generate detailed PDF report for a single PR' })
  async prDetailReport(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generatePrDetailPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=PR-Detail-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
