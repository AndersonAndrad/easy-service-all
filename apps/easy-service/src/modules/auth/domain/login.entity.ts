import { BadRequestException } from '@nestjs/common';

export interface LoginProps {
  identification: string;
  password: string;
}

const isEmailLike = (value: string): boolean => value.includes('@');

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export class LoginEntity {
  public readonly identification: string;
  public readonly password: string;

  constructor(props: LoginProps) {
    const identification = props.identification?.trim();
    const password = props.password?.trim();

    if (!identification) {
      throw new BadRequestException('Identification is required');
    }

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    if (isEmailLike(identification) && !isValidEmail(identification)) {
      throw new BadRequestException('Invalid email format');
    }

    this.identification = identification;
    this.password = password;
  }
}
