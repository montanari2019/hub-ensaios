import 'dotenv/config';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

// Extraído de `bootstrap()` pra ser reaproveitado também pelo entry point
// serverless da Vercel (`api/index.ts`) — os dois precisam da mesma
// configuração (pipes, filtro de erro, Swagger), só o "como expor" difere
// (`app.listen` aqui vs. um handler Express cacheado lá).
export async function createApp(): Promise<INestApplication> {
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
                'Backend do hub de ensaios (tracks, canais, áudio)',
            )
            .setVersion('0.1.0')
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('docs', app, document);
    }

    return app;
}

async function bootstrap() {
    const app = await createApp();

    // Nome dedicado, não `PORT` genérico: ambientes de dev (ex.: o do Vite do
    // apps/web, rodando junto via `concurrently`) costumam exportar `PORT`
    // pro processo do dev server deles, e como o backend herda o mesmo
    // ambiente, um `PORT` genérico aqui acabava lendo o valor errado.
    const port = Number(process.env.API_PORT ?? 3001);
    // Só loopback: nada muda aqui mesmo com o deploy público — em produção
    // quem recebe tráfego externo é a função serverless da Vercel
    // (api/index.ts), não este `app.listen`.
    await app.listen(port, '127.0.0.1');
    // eslint-disable-next-line no-console
    console.info(`Hub de Ensaios API rodando em http://127.0.0.1:${port}`);
}

// Na Vercel, o processo nunca chama bootstrap() — quem sobe o app é
// `api/index.ts`, reaproveitando `createApp()` com um handler Express
// cacheado entre invocações da função. `VERCEL` é setada automaticamente
// pela plataforma em toda função/build.
if (!process.env.VERCEL) {
    await bootstrap();
}
