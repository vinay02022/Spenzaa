import { IsUrl, IsOptional, IsArray, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'sourceUrl must be a valid HTTP/HTTPS URL' })
  sourceUrl!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'callbackUrl must be a valid HTTP/HTTPS URL' })
  callbackUrl!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];
}
