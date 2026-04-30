import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCurrentSeriesDto {
  @ApiProperty({ example: 2026, description: 'Year for which the series counter applies' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({
    example: 50,
    description:
      'Sets the highest number already issued for the year. The next generated PR number will be lastNumber + 1.',
  })
  @IsInt()
  @Min(0)
  lastNumber: number;
}
