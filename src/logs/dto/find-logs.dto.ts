// interface FindLogsInput {
//   page?: number;
//   limit?: number;
//   status?: LogStatus;
//   jobId?: number;
//   from?: Date;
//   to?: Date;
// }

import { IsDate, IsEnum, IsNumber } from 'class-validator';
import { LogStatus } from 'src/logs/entities/log.entity';

export class FindLogsDto {
  @IsNumber()
  page?: number;

  @IsNumber()
  limit?: number;

  @IsEnum(LogStatus)
  status?: LogStatus;

  @IsNumber()
  jobId?: number;

  @IsDate()
  from?: Date;

  @IsDate()
  to?: Date;
}
