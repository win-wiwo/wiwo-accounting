import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prams/shared';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectsDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

const PROJECT_MANAGERS = [UserRole.ADMIN, UserRole.CEO, UserRole.COO];

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects (all authenticated users)' })
  async findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'List active projects for PR form dropdown' })
  async findActive() {
    return this.projectsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.projectsService.findById(id);
  }

  @Post()
  @Roles(...PROJECT_MANAGERS)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new project (Admin, CEO, COO only)' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: { _id: string },
  ) {
    return this.projectsService.create(dto, user._id);
  }

  @Patch(':id')
  @Roles(...PROJECT_MANAGERS)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a project (Admin, CEO, COO only)' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }
}
