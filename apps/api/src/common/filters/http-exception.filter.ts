import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { AppError } from '../errors/app.error.js';

/**
 * Formato de resposta de erro único pro app inteiro:
 * { error: { code, message, report, exception? } }.
 *
 * - `AppError` (e subclasses) -> tratadas 1:1 pelo próprio errorCode.
 * - Erros de validação do `ValidationPipe` (class-validator) -> vira
 *   UnprocessableEntity com `report` listando as mensagens de validação.
 * - Qualquer outro erro -> 500 genérico, com o exception cru só fora de produção.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('ExceptionsHandler');

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const isDev = process.env.NODE_ENV !== 'production';

        this.logger.error(
            exception instanceof Error ? exception.stack : exception,
        );

        if (exception instanceof AppError) {
            response.status(exception.getStatus()).json({
                error: {
                    code: exception.code,
                    message: exception.message,
                    report: exception.report,
                    exception: isDev ? exception : undefined,
                },
            });
            return;
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            const isValidationError =
                status === HttpStatus.BAD_REQUEST &&
                typeof body === 'object' &&
                Array.isArray((body as { message?: unknown }).message);

            if (isValidationError) {
                const messages = (body as { message: string[] }).message;
                response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
                    error: {
                        code: 10,
                        message: 'Unprocessable entity',
                        report: messages,
                    },
                });
                return;
            }

            response.status(status).json({
                error: {
                    code: 0,
                    message:
                        typeof body === 'string'
                            ? body
                            : (body as { message?: string }).message,
                    exception: isDev ? exception : undefined,
                },
            });
            return;
        }

        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: {
                code: 0,
                message: 'Internal Server Error',
                exception: isDev ? exception : undefined,
            },
        });
    }
}
