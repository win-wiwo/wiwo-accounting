import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'meta' in data && 'data' in data) {
          return {
            success: true,
            data: data.data,
            message: data.message || 'Success',
            meta: data.meta,
          };
        }

        return {
          success: true,
          data,
          message: 'Success',
        };
      }),
    );
  }
}
