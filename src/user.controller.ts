import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { UserFieldsInterceptor } from './interceptors/user-fields.interceptor';
import { UserService } from './user.service';
import { User } from './user.entity';

@UseInterceptors(UserFieldsInterceptor)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() userDto: Partial<User>) {
    // Vérification doublon email
    const existing = await this.userService.findByEmailDomain(
      userDto.email?.split('@')[1] || '',
    );
    if (existing.some((u) => u.email === userDto.email)) {
      throw new HttpException('Email already exists', HttpStatus.CONFLICT);
    }
    return this.userService.createUser(userDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
  ) {
    // Tri simple ou multi-critères via ?sort=role,-createdAt
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort) {
      sortObj = {};
      for (const crit of sort.split(',')) {
        if (crit.startsWith('-')) sortObj[crit.slice(1)] = -1;
        else sortObj[crit] = 1;
      }
    }
    return this.userService.findPaginatedAndSorted(page, limit, sortObj);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: Partial<User>) {
    return this.userService.updateUser(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
