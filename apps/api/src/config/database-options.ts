import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/**
 * Função pura, sem nenhuma dependência do `@nestjs/config` — usada tanto
 * pelo `database.config.ts` (dentro do Nest, via `registerAs`) quanto pela
 * CLI standalone do TypeORM (`database/data-source.ts`, fora do Nest).
 * Mantida separada de propósito: a CLI roda via ts-node/tsx fora do
 * bootstrap do Nest, e importar qualquer coisa de `@nestjs/*` nesse caminho
 * arrisca puxar resolução de módulo específica do Nest que o executor de
 * TS da CLI não entende.
 *
 * `poolSize` pequeno de propósito: cada instância de função serverless na
 * Vercel abre seu próprio pool, e muitas instâncias concorrentes cada uma
 * com um pool grande esgotam o limite de conexões do Postgres gerenciado.
 */
// A antiga "Vercel Postgres" nativa saiu do ar — hoje o marketplace de
// Storage da Vercel só oferece provedores terceiros (Neon, Prisma Postgres,
// Supabase...), cada um injetando a connection string num nome de env var
// diferente ao conectar num projeto. Checa os nomes mais comuns em vez de
// travar num só, pra funcionar sem passo manual não importa qual o usuário
// escolher no dashboard.
const POOLED_URL_ENV_VARS = ['POSTGRES_URL', 'DATABASE_URL'];
const DIRECT_URL_ENV_VARS = [
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
    'DIRECT_URL',
];

function firstDefinedEnv(names: string[]): string | undefined {
    for (const name of names) {
        const value = process.env[name];
        if (value) return value;
    }
    return undefined;
}

export function getDatabaseOptions() {
    const url = firstDefinedEnv(POOLED_URL_ENV_VARS);
    if (!url) {
        throw new Error(
            `Nenhuma connection string de banco encontrada (esperava uma de: ${POOLED_URL_ENV_VARS.join(', ')}).`,
        );
    }

    return {
        type: 'postgres' as const,
        url,
        ssl:
            process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
        poolSize: 3,
        // Nunca usar synchronize:true — schema é controlado só por migration
        // (yarn migration:run), mesmo em desenvolvimento.
        synchronize: false,
        autoLoadEntities: true,
        // Converte propriedade camelCase da Entity (TS) em coluna snake_case no
        // banco automaticamente — evita `@Column({ name: '...' })` manual em
        // toda coluna com mais de uma palavra.
        namingStrategy: new SnakeNamingStrategy(),
    };
}

/**
 * Só pra CLI (`database/data-source.ts`): migrations usam locking/DDL que
 * não convivem bem com um pooler em modo transação (ex.: PgBouncer da
 * Vercel Postgres) — usa a connection string non-pooling quando disponível.
 */
export function getMigrationDatabaseUrl(): string {
    return (
        firstDefinedEnv(DIRECT_URL_ENV_VARS) ??
        firstDefinedEnv(POOLED_URL_ENV_VARS) ??
        ''
    );
}
