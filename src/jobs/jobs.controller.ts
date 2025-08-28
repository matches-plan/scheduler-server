import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { AuthGuard } from '../users/users.guard';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.jobsService.findAll();
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJobDto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, updateJobDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.remove(id);
  }

  @UseGuards(AuthGuard)
  @Post('start/:id')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.start(id);
  }

  @UseGuards(AuthGuard)
  @Post('pause/:id')
  pause(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.pause(id);
  }

  @UseGuards(AuthGuard)
  @Post('run/:id')
  run(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.run(id);
  }
}
