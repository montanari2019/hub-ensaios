import { HttpStatus } from '@nestjs/common';

import { AppError } from './app.error.js';

export class NotFoundError extends AppError {
    constructor(code = 20, message = 'Resource not found') {
        super(HttpStatus.NOT_FOUND, code, message);
    }
}
