import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from '../app/user.service';
import { CreateUserDto } from '../types/dto/create-user.dto';
import { UpdateUserDto } from '../types/dto/update-user.dto';
import { UserResponseDto } from '../types/dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, type: UserResponseDto, isArray: true })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userService.findAll();
    return users.map((u) => this.toResponse(u));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.create(dto);

    return this.toResponse(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Find user by email or username' })
  @ApiQuery({ name: 'identifier', required: true, description: 'Email or username' })
  @ApiResponse({ status: 200, type: UserResponseDto, isArray: false })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByEmailOrUserName(@Query('identifier') identifier: string): Promise<UserResponseDto> {
    const user = await this.userService.findByEmailOrUserName(identifier);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.update({ ...dto, _id: id });

    return this.toResponse(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    await this.userService.delete(id);
  }

  private toResponse(user: { _id: string; createdAt: Date; email: string; cnpj: string; name: string; userName: string; roles: string[] }): UserResponseDto {
    return {
      _id: user._id,
      createdAt: user.createdAt,
      email: user.email,
      cnpj: user.cnpj,
      name: user.name,
      userName: user.userName,
      roles: user.roles,
    };
  }
}
