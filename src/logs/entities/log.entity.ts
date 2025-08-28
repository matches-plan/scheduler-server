import { Job } from '../../jobs/entities/job.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum LogStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

@Entity()
@Index('idx_job_logs_createdAt', ['createdAt'])
@Index('idx_job_logs_status_createdAt', ['status', 'createdAt'])
@Index('idx_job_logs_job_createdAt', ['job', 'createdAt'])
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Job, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'jobId' })
  job?: Job | null;

  @Column({
    type: 'enum',
    enum: LogStatus,
    enumName: 'job_log_status',
  })
  status: LogStatus;

  @Column({ type: 'integer', nullable: true })
  httpStatus: number | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @CreateDateColumn()
  createdAt: Date;
}
