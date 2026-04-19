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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, QueryUsersDto } from './dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all users with pagination and filters (Admin only)' })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  async deactivate(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  async activate(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.activate(id);
  }
}
