import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { version } from '../../package.json';

type ResponseWithVersion<T> = T extends object ? T & { version: string } : T;

@Injectable()
export class VersionInterceptor<T>
  implements NestInterceptor<T, ResponseWithVersion<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseWithVersion<T>> {
    return next.handle().pipe(
      map((data: T): ResponseWithVersion<T> => {
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          return {
            ...(data as object),
            version,
          } as ResponseWithVersion<T>;
        }

        return data as ResponseWithVersion<T>;
      }),
    );
  }
}
