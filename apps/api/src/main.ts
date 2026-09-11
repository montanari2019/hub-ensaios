import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Substitui validação manual: um pipe global sobre os DTOs de cada domínio.
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    if (process.env.NODE_ENV !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('Hub de Ensaios API')
            .setDescription(
                'Backend local do hub de ensaios (tracks, canais, áudio)',
            )
            .setVersion('0.1.0')
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('docs', app, document);
    }

    // Nome dedicado, não `PORT` genérico: ambientes de dev (ex.: o do Vite do
    // apps/web, rodando junto via `concurrently`) costumam exportar `PORT`
    // pro processo do dev server deles, e como o backend herda o mesmo
    // ambiente, um `PORT` genérico aqui acabava lendo o valor errado.
    const port = Number(process.env.API_PORT ?? 3001);
    // Só loopback: o backend não deve ser alcançável por outras máquinas na rede.
    await app.listen(port, '127.0.0.1');
    // eslint-disable-next-line no-console
    console.info(`Hub de Ensaios API rodando em http://127.0.0.1:${port}`);
}

await bootstrap();
