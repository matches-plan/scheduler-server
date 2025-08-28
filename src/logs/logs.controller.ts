import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { FindLogsDto } from 'src/logs/dto/find-logs.dto';
import { AuthGuard } from 'src/users/users.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query() query: FindLogsDto) {
    return this.logsService.findAll(query);
  }
}
