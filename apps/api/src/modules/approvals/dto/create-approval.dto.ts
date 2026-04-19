import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalAction } from '@prams/shared';

export class CreateApprovalDto {
  @ApiProperty({ description: 'Purchase request ID' })
  @IsString()
  @IsNotEmpty()
  purchaseRequestId: string;

  @ApiProperty({ enum: Object.values(ApprovalAction), description: 'Approval action' })
  @IsEnum(Object.values(ApprovalAction))
  action: string;

  @ApiProperty({ description: 'Comments or reason for the action' })
  @IsString()
  comments: string;

  @ApiPropertyOptional({ description: 'Conditions for conditional approval' })
  @IsOptional()
  @IsString()
  conditions?: string;
}
