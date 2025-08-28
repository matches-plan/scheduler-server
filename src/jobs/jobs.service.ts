import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { Repository } from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { getNextRunAt } from '../common/validators/cron';
import { LogsService } from '../logs/logs.service';
import { LogStatus } from '../logs/entities/log.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    private schedulerRegistry: SchedulerRegistry,
    private readonly logsService: LogsService,
  ) {}

  async create(createJobDto: CreateJobDto) {
    // 1) cron 한 번 더 안정성 체크 (DTO에서 이미 검증되지만 방어적으로)
    try {
      CronExpressionParser.parse(createJobDto.cron, { strict: true });
    } catch {
      throw new BadRequestException('Invalid cron expression');
    }

    // 2) project + name 유니크 보장
    const dup = await this.jobsRepo.findOne({
      where: { project: createJobDto.project, name: createJobDto.name },
    });
    if (dup) {
      throw new ConflictException(
        'A job with the same project and name already exists',
      );
    }

    // 3) 엔티티 생성 및 저장
    const job = this.jobsRepo.create({
      project: createJobDto.project,
      name: createJobDto.name,
      description: createJobDto.description ?? null,
      cron: createJobDto.cron, // DTO에서 5필드면 6필드로 이미 정규화됨
      url: createJobDto.url,
      method: createJobDto.method,
      xSecret: createJobDto.xSecret ?? null,
    });

    return this.jobsRepo.save(job);
  }

  findAll() {
    return this.jobsRepo.find();
  }

  async update(id: number, updateJobDto: UpdateJobDto) {
    // 0) 존재 여부
    const existing = await this.jobsRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException(`Job ${id} not found`);

    // 1) cron 변경 시 파싱 검증
    if (updateJobDto.cron) {
      try {
        CronExpressionParser.parse(updateJobDto.cron, { strict: true });
      } catch {
        throw new BadRequestException('Invalid cron expression');
      }
    }

    // 2) (project, name) 유니크 보장
    const candidateProject = updateJobDto.project ?? existing.project;
    const candidateName = updateJobDto.name ?? existing.name;

    if (
      candidateProject !== existing.project ||
      candidateName !== existing.name
    ) {
      const dup = await this.jobsRepo.findOne({
        where: { project: candidateProject, name: candidateName },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException(
          'A job with the same project and name already exists',
        );
      }

      // 3) 병합 후 저장(훅/업데이트타임스탬프 동작)
      const toSave = await this.jobsRepo.preload({ id, ...updateJobDto });
      // preload가 undefined면 위에서 NotFound 던졌으므로 안전
      return this.jobsRepo.save(toSave!);
    }
  }

  async remove(id: number) {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    this.schedulerRegistry.deleteCronJob(job.name);
    await this.jobsRepo.remove(job); // 엔티티 훅 정상 동작
    return { ok: true };
  }

  async start(id: number) {
    // 0) 존재 여부
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    // 1) 상태 변경
    job.status = JobStatus.ACTIVE;
    await this.jobsRepo.save(job);

    // 2) 스케줄러에 등록
    const cronJob = this.createCronJob(job);
    this.schedulerRegistry.addCronJob(job.name, cronJob);
    cronJob.start();

    return { ok: true };
  }

  async pause(id: number) {
    // 0) 존재 여부
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    // 1) 상태 변경
    job.status = JobStatus.PAUSED;
    const savedJob = await this.jobsRepo.preload({
      id: job.id,
      status: JobStatus.PAUSED,
    });
    await this.jobsRepo.save(savedJob);

    // 2) 스케줄러에서 제거
    try {
      this.schedulerRegistry.deleteCronJob(job.name);
    } catch (error) {
      Logger.error(`No cron job found for job: ${job.name}`);
    }

    return { ok: true };
  }

  async run(id: number) {
    // 0) 존재 여부
    const job = await this.jobsRepo.findOne({ where: { id } });
    const response = await fetch(job.url, {
      method: job.method,
      headers: {
        'X-SECRET': job.xSecret,
      },
      body: job.body,
    });

    // 결과 Logging
    await this.logsService.create({
      jobId: job.id,
      status: response.ok ? LogStatus.SUCCESS : LogStatus.ERROR,
      httpStatus: response.status,
      message: response.statusText,
    });

    const toSave = await this.jobsRepo.preload({
      id: job.id,
      nextRunAt: getNextRunAt(job.cron),
    });
    await this.jobsRepo.save(toSave);
  }

  createCronJob(job: Job) {
    const cronJob = new CronJob(
      job.cron,
      async () => {
        const response = await fetch(job.url, {
          method: job.method,
          headers: {
            'X-SECRET': job.xSecret,
          },
          body: job.body,
        });

        const toSave = await this.jobsRepo.preload({
          id: job.id,
          lastRunAt: new Date(),
          nextRunAt: getNextRunAt(job.cron),
        });
        await this.jobsRepo.save(toSave);

        // cron 결과 Logging
        await this.logsService.create({
          jobId: job.id,
          status: response.ok ? LogStatus.SUCCESS : LogStatus.ERROR,
          httpStatus: response.status,
          message: response.statusText,
        });
      },
      async () => {
        const toSave = await this.jobsRepo.preload({
          id: job.id,
          status: JobStatus.ACTIVE,
        });
        await this.jobsRepo.save(toSave);
      },
      true,
      'Asia/Seoul',
    );
    return cronJob;
  }

  @Interval(60000) // 1분마다
  async validateAllJobs() {
    const jobs = await this.jobsRepo.find();
    const runningJobs = this.schedulerRegistry.getCronJobs();
    Logger.log(`Check running jobs`);

    for (const job of jobs) {
      if (job.status === JobStatus.ACTIVE) {
        if (!runningJobs.has(job.name)) {
          // DB에는 ACTIVE인데 실제로는 스케줄러에 없는 경우
          try {
            CronExpressionParser.parse(job.cron, { strict: true });
            const cronJob = this.createCronJob(job);
            this.schedulerRegistry.addCronJob(job.name, cronJob);
            cronJob.start();
            Logger.log(`Started missing job: ${job.name}`);
          } catch (error) {
            Logger.error(
              `Failed to start job ${job.name} due to invalid cron expression.`,
            );
          }
        }
      } else {
        if (runningJobs.has(job.name)) {
          // DB에는 PAUSED인데 실제로는 스케줄러에 있는 경우
          this.schedulerRegistry.deleteCronJob(job.name);
          Logger.log(`Stopped job: ${job.name}`);
        }
      }
    }
    // DB에는 존재하지 않은 Cron Job이 있는 경우
    for (const [name] of runningJobs) {
      if (!jobs.find((j) => j.name === name)) {
        this.schedulerRegistry.deleteCronJob(name);
        Logger.log(`Stopped job: ${name}`);
      }
    }
  }
}
