import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../app/auth.service';
import { LoginDto } from '../types/dto/login.dto';
import { RefreshTokenDto } from '../types/dto/refresh-token.dto';

interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async login(@Body() body: LoginDto): Promise<TokenPairResponse> {
    const { identification, password } = body;

    this.logger.log(`HTTP login request received for identifier "${identification}"`);

    return this.authService.login(identification, password);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and invalidate access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged out successfully',
  })
  async logout(@Headers('authorization') accessToken: string): Promise<void> {
    this.logger.log('HTTP logout request received');

    await this.authService.logout(accessToken);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a new access token using refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token generated successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
  async refreshToken(@Body() body: RefreshTokenDto): Promise<TokenPairResponse> {
    this.logger.log('HTTP refresh-token request received');

    return this.authService.refreshToken(body.refreshToken);
  }
}
