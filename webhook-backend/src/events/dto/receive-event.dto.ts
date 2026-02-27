import { IsObject, IsOptional, IsString } from 'class-validator';

export class ReceiveEventDto {
  @IsObject({ message: 'payload must be a JSON object' })
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
