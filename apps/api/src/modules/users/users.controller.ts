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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '@prams/shared';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, QueryUsersDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('me/photo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile photo for current user' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'user-photos'),
        filename: (_req: Express.Request, file: Express.Multer.File, cb: (err: Error | null, filename: string) => void) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadMyPhoto(
    @CurrentUser('_id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WebP, or GIF images are allowed.');
    }
    return this.usersService.uploadPhoto(userId, file);
  }

  @Post('me/signature')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload signature image for current user' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'signatures'),
        filename: (_req: Express.Request, file: Express.Multer.File, cb: (err: Error | null, filename: string) => void) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadMySignature(
    @CurrentUser('_id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, or WebP images are allowed.');
    }
    return this.usersService.uploadSignature(userId, file);
  }

  @Delete('me/signature')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove signature image for current user' })
  async removeMySignature(@CurrentUser('_id') userId: string) {
    return this.usersService.removeSignature(userId);
  }

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
