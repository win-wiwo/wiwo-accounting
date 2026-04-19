import { IsString, IsEmail, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'ABC Trading Corp.' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: '123 Main St, Manila, Philippines' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'vat', enum: ['vat', 'non_vat'] })
  @IsString()
  @IsIn(['vat', 'non_vat'])
  @IsOptional()
  taxType?: string;

  @ApiPropertyOptional({ example: '123-456-789-000' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  tin?: string;

  @ApiPropertyOptional({ example: 'Juan Dela Cruz' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+63 912 345 6789' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  contactNumber?: string;

  @ApiPropertyOptional({ example: 'supplier@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 'ABC Trading Corp.' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  bankAccountName?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'BDO Unibank' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive', 'blacklisted'] })
  @IsString()
  @IsIn(['active', 'inactive', 'blacklisted'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'Preferred supplier for office supplies' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
