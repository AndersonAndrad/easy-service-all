import { BadRequestException } from '@nestjs/common';

export interface RefreshTokenProps {
  refreshToken: string;
}

export class RefreshTokenEntity {
  public readonly refreshToken: string;

  constructor(props: RefreshTokenProps) {
    const refreshToken = props.refreshToken?.trim();

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    this.refreshToken = refreshToken;
  }
}
