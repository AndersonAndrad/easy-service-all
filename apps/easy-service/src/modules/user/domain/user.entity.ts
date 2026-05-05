import { BadRequestException } from '@nestjs/common';
import { hashPassword } from 'src/shared/utils/password.util';
import { User } from '../types/interface/user.interface';

export class UserEntity implements Omit<User, '_id' | 'createdAt'> {
  email: string;
  cnpj: string;
  name: string;
  userName: string;
  password: string;
  roles: string[];

  constructor(param: Omit<User, '_id' | 'createdAt'>) {
    this.prepareFromParam(param);
  }

  private prepareFromParam(param: Omit<User, '_id' | 'createdAt'>): void {
    this.email = this.prepareEmail(param.email);
    this.cnpj = this.prepareCnpj(param.cnpj);
    this.name = this.prepareName(param.name);
    this.userName = this.prepareUserName(param.userName);
    this.password = this.preparePassword(param.password);
    this.roles = this.prepareRoles(param.roles);
  }

  private prepareEmail(value: string): string {
    const email = value?.trim().toLowerCase();

    const isValid = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValid) {
      throw new BadRequestException('Invalid email');
    }

    return email;
  }

  private prepareCnpj(value: string): string {
    const numeric = value?.trim().replace(/[^0-9]/g, '');

    if (!numeric || numeric.length !== 14) {
      throw new BadRequestException('Invalid cnpj');
    }

    return numeric;
  }

  private prepareName(value: string): string {
    const normalized = value?.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      throw new BadRequestException('Name is required');
    }

    return normalized.toLowerCase();
  }

  private prepareUserName(value: string): string {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('User name is required');
    }

    return normalized;
  }

  private preparePassword(value: string): string {
    const password = value?.trim();

    if (!password || password.length < 6) {
      throw new BadRequestException('Password must have at least 6 characters');
    }

    return hashPassword(password);
  }

  private prepareRoles(roles: string[]): string[] {
    const prepared = (roles ?? []).map((role): string => this.normalizeRole(role)).filter((role): boolean => this.isValidRole(role));

    if (!prepared.length) {
      throw new BadRequestException('Roles are required');
    }

    return prepared;
  }

  private normalizeRole(role: string): string {
    return role.trim().toLowerCase();
  }

  private isValidRole(role: string): boolean {
    return role.length > 0;
  }
}
