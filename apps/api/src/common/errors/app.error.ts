import { HttpException, HttpStatus } from '@nestjs/common';

// Toda exception de domínio herda daqui, carregando um `code` numérico
// estável (independente da mensagem, que pode mudar) pro cliente distinguir
// o tipo de erro pelo campo `error.code` da resposta. Chamado de `code`, não
// `errorCode`, porque o `HttpException` do Nest já tem um `errorCode?: string`
// embutido (formato diferente do nosso, numérico).
export class AppError extends HttpException {
    public readonly code: number;

    public readonly report?: unknown;

    constructor(
        status: HttpStatus,
        code = 0,
        message?: string,
        report?: unknown,
    ) {
        super(message ?? AppError.name, status);
        this.code = code;
        this.report = report;
    }
}
