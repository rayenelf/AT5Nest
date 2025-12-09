import {
  Body,
  Controller,
  Get,
  Post,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { UserRole } from './user.entity';
import { UserFieldsInterceptor } from './interceptors/user-fields.interceptor';
import { UserService } from './user.service';

@Controller('admin/users')
@UseInterceptors(UserFieldsInterceptor)
export class AdminUserController {
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

  @Get('not-updated-6-months')
  findNotUpdated6Months() {
    return this.userService.findNotUpdatedSince6Months();
  }

  @Get('by-domain')
  findByDomain(@Query('domain') domain: string) {
    return this.userService.findByEmailDomain(domain || '');
  }

  @Get('created-last-7-days')
  findCreatedLast7Days() {
    return this.userService.findCreatedLast7Days();
  }

  @Get('count-by-role')
  countByRole() {
    return this.userService.countByRole();
  }

  @Get('created-between')
  findCreatedBetween(@Query('from') from?: string, @Query('to') to?: string) {
    const date1 = from ? new Date(from) : new Date(0);
    const date2 = to ? new Date(to) : new Date();
    return this.userService.findCreatedBetween(date1, date2);
  }

  @Get('most-recent')
  findMostRecent(@Query('limit') limit?: number) {
    return this.userService.findMostRecent(limit);
  }

  @Get('avg-days-created-updated')
  avgDaysBetweenCreatedAndUpdated() {
    return this.userService.averageDaysBetweenCreatedAndUpdated();
  }

  @Post('deactivate-inactive-1y')
  async deactivateInactiveOneYear() {
    const modified = await this.userService.deactivateInactiveSinceOneYear();
    return { modified };
  }

  @Post('bulk-update-role-by-domain')
  async bulkUpdateRoleByDomain(
    @Body() body: { domain: string; role: UserRole },
  ) {
    const { domain, role } = body || ({} as any);
    const modified = await this.userService.bulkUpdateRoleByEmailDomain(
      domain,
      role,
    );
    return { modified };
  }
}
