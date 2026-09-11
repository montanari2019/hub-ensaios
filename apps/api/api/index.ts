import type { IncomingMessage, ServerResponse } from 'node:http';

// Import explícito, só pelo efeito colateral: o TypeORM carrega o driver
// Postgres via `require(driverPackage)` com o nome computado em runtime, e
// o file-tracer da Vercel não consegue seguir esse `require` dinâmico pra
// saber que `pg` precisa ir junto no bundle da função — sem isso, a função
// falha em produção com "DriverPackageNotInstalledError: Postgres package
// has not been found installed" mesmo com `pg` em dependencies.
import 'pg';
import { createApp } from '../src/main.js';

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

// Promise cacheada no escopo do módulo: uma instância de função "quente"
// (reaproveitada entre invocações pela própria Vercel) pula o bootstrap do
// Nest de novo; só uma instância "fria" paga esse custo. `app.init()` (não
// `app.listen()`) porque quem recebe as conexões aqui é a função serverless
// da Vercel, não um socket TCP próprio.
let handlerPromise: Promise<ExpressHandler> | null = null;

async function getHandler(): Promise<ExpressHandler> {
    const app = await createApp();
    await app.init();
    return app.getHttpAdapter().getInstance();
}

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse,
) {
    handlerPromise ??= getHandler();
    const expressHandler = await handlerPromise;
    expressHandler(req, res);
}
