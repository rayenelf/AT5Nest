import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role || request.headers['x-user-role'] || 'client';
    return next.handle().pipe(
      map((data) => {
        // Support both array and single object
        const filterUser = (user: any) => {
          if (userRole === 'admin') {
            const { id, email, role, createdAt, updatedAt } = user;
            return { id, email, role, createdAt, updatedAt };
          } else {
            const { id, email } = user;
            return { id, email };
          }
        };
        if (Array.isArray(data)) {
          return data.map(filterUser);
        }
        return filterUser(data);
      }),
    );
  }
}
