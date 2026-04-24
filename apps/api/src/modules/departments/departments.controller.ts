import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prams/shared';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create department (Admin only)' })
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List departments' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.departmentsService.findAll({ page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.departmentsService.findById(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get department members' })
  async getMembers(@Param('id', ParseObjectIdPipe) id: string) {
    return this.departmentsService.getMembers(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update department (Admin only)' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete department (Admin only)' })
  async delete(@Param('id', ParseObjectIdPipe) id: string) {
    await this.departmentsService.delete(id);
    return { message: 'Department deleted successfully' };
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Add member to department (Admin only)' })
  async addMember(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('userId') userId: string,
  ) {
    await this.departmentsService.addMember(id, userId);
    return { message: 'Member added successfully' };
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Remove member from department (Admin only)' })
  async removeMember(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
  ) {
    await this.departmentsService.removeMember(id, userId);
    return { message: 'Member removed successfully' };
  }

  @Patch(':id/head')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Set department head (Admin only)' })
  async setHead(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('userId') userId: string,
  ) {
    return this.departmentsService.setHead(id, userId);
  }
}
