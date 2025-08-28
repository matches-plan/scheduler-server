import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum JobStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  project: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 100 })
  cron: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'enum', enum: HttpMethod, default: HttpMethod.GET })
  method: HttpMethod;

  @Column({ type: 'text', nullable: true })
  xSecret: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PAUSED })
  status: JobStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date | null;
}
