import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { UserFieldsInterceptor } from './interceptors/user-fields.interceptor';
import { User } from './user.entity';

// Simuler une liste d'utilisateurs pour l'exemple
declare const users: User[];

@Controller('admin/users')
@UseInterceptors(UserFieldsInterceptor)
export class AdminUserController {
  @Get()
  findAll(): User[] {
    // Ici, on retournerait normalement les utilisateurs depuis la base
    return users;
  }
}
