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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySuppliersDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create supplier (Admin, Accounting, Procurement)' })
  async create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.suppliersService.create(dto, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get supplier counts by status' })
  async getStats() {
    return this.suppliersService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers with filtering and pagination' })
  async findAll(@Query() query: QuerySuppliersDto) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update supplier (Admin, Accounting, Procurement)' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, dto);
  }
}
