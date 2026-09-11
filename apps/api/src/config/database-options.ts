import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
// De apps/api/src/config -> apps/api/src -> apps/api -> apps -> raiz do monorepo.
const monorepoRoot = path.resolve(moduleDir, '../../../..');
const defaultDbPath = path.join(monorepoRoot, 'hub-de-ensaios.sqlite');

/**
 * Função pura, sem nenhuma dependência do `@nestjs/config` — usada tanto
 * pelo `database.config.ts` (dentro do Nest, via `registerAs`) quanto pela
 * CLI standalone do TypeORM (`database/data-source.ts`, fora do Nest).
 * Mantida separada de propósito: a CLI roda via ts-node/tsx fora do
 * bootstrap do Nest, e importar qualquer coisa de `@nestjs/*` nesse caminho
 * arrisca puxar resolução de módulo específica do Nest que o executor de
 * TS da CLI não entende.
 */
export function getDatabaseOptions() {
    return {
        type: 'better-sqlite3' as const,
        database: process.env.DB_PATH
            ? path.resolve(process.env.DB_PATH)
            : defaultDbPath,
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
