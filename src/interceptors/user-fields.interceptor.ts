import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class UserFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    const headerRole = request.headers['x-user-role'];
    let role: string = 'client';

    if (typeof headerRole === 'string' && headerRole.trim()) {
      role = headerRole.toLowerCase();
    } else {
      const reqAny = request as unknown as Record<string, unknown>;
      const userObj = reqAny.user;
      if (userObj && typeof userObj === 'object') {
        const maybeRole = (userObj as Record<string, unknown>).role;
        if (typeof maybeRole === 'string') {
          role = maybeRole.toLowerCase();
        }
      }
    }

    type SafeUser = {
      id?: unknown;
      email?: string;
      role?: string;
      createdAt?: unknown;
      updatedAt?: unknown;
    };

    const isUserLike = (u: unknown): u is SafeUser =>
      typeof u === 'object' && u !== null;

    return next.handle().pipe(
      map((data) => {
        // Support both array and single object
        const filterUser = (user: unknown) => {
          if (!isUserLike(user)) {
            return user;
          }
          if (role === 'admin') {
            const { id, email, role: r, createdAt, updatedAt } = user;
            return { id, email, role: r, createdAt, updatedAt };
          }
          const { id, email } = user;
          return { id, email };
        };
        if (Array.isArray(data)) {
          return data.map(filterUser);
        }
        return filterUser(data);
      }),
    );
  }
}
