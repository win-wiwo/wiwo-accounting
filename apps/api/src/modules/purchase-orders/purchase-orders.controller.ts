import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prams/shared';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, QueryPurchaseOrdersDto } from './dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new purchase order (draft)' })
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.create(dto, user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get PO summary stats' })
  async getStats() {
    return this.poService.getStats();
  }

  @Get('stats/monthly')
  @ApiOperation({ summary: 'Get monthly PO issued count' })
  async getMonthlyStats() {
    const count = await this.poService.getMonthlyIssuedCount();
    return { data: { issuedThisMonth: count } };
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders with filters' })
  async findAll(@Query() query: QueryPurchaseOrdersDto) {
    return this.poService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.poService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a draft purchase order' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.update(id, dto, user);
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit a purchase order for approval' })
  async submit(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.submit(id, user);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COO, UserRole.CEO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a submitted purchase order' })
  async approve(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.approve(id, user);
  }

  @Post(':id/issue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark a purchase order as issued' })
  async issue(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.issue(id, user);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  async cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.cancel(id, reason, user);
  }
}
