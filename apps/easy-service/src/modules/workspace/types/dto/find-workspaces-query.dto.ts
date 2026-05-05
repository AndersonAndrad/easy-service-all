import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { Type } from 'class-transformer';
import type { PaginatedRequest } from 'src/common/interface/paginated.interface';

export class FindWorkspacesQueryDto implements PaginatedRequest {
  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 20, example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize!: number;

  @ApiPropertyOptional({ description: 'Filter workspaces by owner user id' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}
