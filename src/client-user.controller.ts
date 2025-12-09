import { Controller, Get, UseInterceptors, Query } from '@nestjs/common';
import { UserFieldsInterceptor } from './interceptors/user-fields.interceptor';
import { User } from './user.entity';
import { UserService } from './user.service';

@Controller('client/users')
@UseInterceptors(UserFieldsInterceptor)
export class ClientUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
  ) {
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
}
