// interface CreateLogInput {
//   jobId?: number | null;
//   status: LogStatus;
//   httpStatus?: number | null;
//   message?: string | null;
// }

import { IsEnum, IsNumber, IsString } from 'class-validator';
import { LogStatus } from 'src/logs/entities/log.entity';

export class CreateLogDto {
  @IsNumber()
  jobId?: number | null;

  @IsEnum(LogStatus)
  status: LogStatus;

  @IsNumber()
  httpStatus?: number | null;

  @IsString()
  message?: string | null;
}
