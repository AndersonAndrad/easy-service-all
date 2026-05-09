import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Roles } from 'src/shared/enums/roles.enum';
import { UserService } from 'src/modules/user/app/user.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly userService: UserService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdminUser();
  }

  private async seedAdminUser(): Promise<void> {
    const email = 'anderson_andrade_@outlook.com';

    const existing = await this.userService.findByEmailOrUserName(email);
    if (existing) {
      this.logger.log(`Seed user already exists: ${email}`);
      return;
    }

    await this.userService.create({
      email,
      password: 'string',
      name: 'anderson andrade',
      userName: 'anderson_andrade_',
      cnpj: '00000000000000',
      roles: [Roles.SUPER_ADMIN],
    });

    this.logger.log(`Seed user created: ${email}`);
  }
}
