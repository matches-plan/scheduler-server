import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Log } from './entities/log.entity';
import { Job } from '../jobs/entities/job.entity';
import { CreateLogDto } from './dto/create-log.dto';
import { FindLogsDto } from './dto/find-logs.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Log)
    private readonly logsRepo: Repository<Log>,
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async create(createLogDto: CreateLogDto): Promise<Log> {
    const job = await this.jobsRepo.findOne({
      where: { id: createLogDto.jobId },
    });

    if (!job) {
      throw new NotFoundException(
        `Job ${createLogDto.jobId} not found for creating log`,
      );
    }

    const log = this.logsRepo.create({
      job,
      status: createLogDto.status,
      httpStatus: createLogDto.httpStatus ?? null,
      message: createLogDto.message ?? null,
    });
    return this.logsRepo.save(log);
  }

  async findAll(query: FindLogsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const where: FindOptionsWhere<Log> = {};
    if (query.status) where.status = query.status;
    if (query.jobId) where.job = { id: query.jobId } as any;

    if (query.from && query.to) {
      where.createdAt = Between(query.from, query.to);
    } else if (query.from) {
      where.createdAt = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.createdAt = LessThanOrEqual(query.to);
    }

    const [items, total] = await this.logsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      relations: { job: true }, // 필요 없으면 제거
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
