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
export function getDatabaseOptions() {
    // Mesmo nome que a integração nativa Vercel Postgres injeta sozinha ao
    // conectar o Storage num projeto (POSTGRES_URL/POSTGRES_URL_NON_POOLING)
    // — usar esse nome em vez de um genérico DATABASE_URL evita qualquer
    // passo manual de env var em produção.
    const url = process.env.POSTGRES_URL;
    if (!url) {
        throw new Error('POSTGRES_URL não definida.');
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
        process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL ?? ''
    );
}
