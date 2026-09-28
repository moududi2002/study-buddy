// ============================================================
// Path: apps/api/src/common/interceptors/response.interceptor.ts
// ============================================================

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MESSAGES } from '../messages';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        // Controller can return either raw data or { message, data }
        if (
          payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          'data' in payload
        ) {
          return {
            success: true,
            message: (payload as any).message,
            data: (payload as any).data,
          };
        }
        return {
          success: true,
          message: MESSAGES.SUCCESS,
          data: payload,
        };
      }),
    );
  }
}