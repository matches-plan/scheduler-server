import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CronExpressionParser } from 'cron-parser'; // tsconfig에 "esModuleInterop": true 권장
// esModuleInterop이 없다면: import * as parser from 'cron-parser';

function toSixFields(expr: string) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length === 5) return `0 ${expr.trim()}`; // 초 필드 추가
  return expr.trim();
}

@ValidatorConstraint({ name: 'IsCronExpression', async: false })
export class IsCronExpressionConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    try {
      const normalized = toSixFields(value);
      CronExpressionParser.parse(normalized, {
        tz: 'Asia/Seoul', // 필요 시 변경
      });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args?: ValidationArguments): string {
    return `${args?.property ?? 'cron'} must be a valid 5~6 field cron expression`;
  }
}

export function IsCronExpression(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCronExpressionConstraint,
    });
  };
}

export function getNextRunAt(cron: string): Date {
  const interval = CronExpressionParser.parse(cron);
  return interval.next().toDate();
}
