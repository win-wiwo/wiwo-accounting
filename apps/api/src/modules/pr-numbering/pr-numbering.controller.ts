import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prams/shared';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { PrNumberingService } from './pr-numbering.service';
import { UpdatePrNumberConfigDto } from './dto/update-pr-number-config.dto';

@ApiTags('PR Numbering')
@ApiBearerAuth()
@Controller('pr-numbering')
export class PrNumberingController {
  constructor(private readonly prNumberingService: PrNumberingService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get PR number configuration' })
  async getConfig() {
    return this.prNumberingService.getConfig();
  }

  @Patch('config')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update PR number configuration (Admin only)' })
  async updateConfig(@Body() dto: UpdatePrNumberConfigDto) {
    return this.prNumberingService.updateConfig(dto);
  }

  @Get('series')
  @ApiOperation({ summary: 'Get PR number series for current year' })
  async getSeries() {
    return this.prNumberingService.getSeriesInfo();
  }

  @Get('preview')
  @ApiOperation({ summary: 'Preview next PR number' })
  async preview() {
    return this.prNumberingService.getPreview();
  }
}
