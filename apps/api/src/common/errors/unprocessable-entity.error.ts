import { HttpStatus } from '@nestjs/common';

import { AppError } from './app.error.js';

export class UnprocessableEntityError extends AppError {
    constructor(code = 10, message = 'Unprocessable entity', report?: unknown) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, code, message, report);
    }
}
