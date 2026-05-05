import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MongoOptions {
  uri: string;

  constructor(config: ConfigService) {
    this.uri = config.get('MONGODB_URI') ?? '';

    this.validate();
  }

  private validate(): void {
    if (!this.uri) {
      throw new BadRequestException('MongoOptions requires uri');
    }
  }
}
