import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto, QueryApprovalsDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @ApiOperation({ summary: 'Process an approval action (approve/reject/return)' })
  async processAction(
    @Body() dto: CreateApprovalDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.approvalsService.processAction(dto, user);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get PRs pending my approval' })
  async getPending(
    @Query() query: QueryApprovalsDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.approvalsService.getPendingForUser(user, query);
  }

  @Get('pending/count')
  @ApiOperation({ summary: 'Get count of PRs pending my approval' })
  async getPendingCount(
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return { count: await this.approvalsService.getPendingCount(user) };
  }

  @Get('purchase-request/:id')
  @ApiOperation({ summary: 'Get approval history for a purchase request' })
  async getByPurchaseRequest(
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.approvalsService.getByPurchaseRequest(id);
  }
}
