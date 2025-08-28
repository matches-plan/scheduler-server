// src/jobs/dto/create-job.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsEnum,
  IsOptional,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { HttpMethod } from '../entities/job.entity';
import { IsCronExpression } from '../../common/validators/cron';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  project: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // 5~6 필드 cron 표현 허용(간단 검증). 더 엄격히 하려면 서비스에서 cron-parser로 검증 추천.
  @IsString()
  @IsNotEmpty()
  @IsCronExpression({
    message: 'cron must be a valid 5~6 field cron expression',
  })
  cron: string;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;

  @IsEnum(HttpMethod)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  method: HttpMethod;

  @IsOptional()
  @IsString()
  xSecret?: string;
}
