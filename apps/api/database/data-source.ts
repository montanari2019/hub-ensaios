import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import {
    getDatabaseOptions,
    getMigrationDatabaseUrl,
} from '../src/config/database-options.js';

config();

// Usado só pela CLI do TypeORM (yarn migration:*), fora do bootstrap do
// Nest. Importa `getDatabaseOptions` direto (função pura, sem
// `@nestjs/config`) pra naming-strategy nunca divergir do app rodando de
// verdade; só troca a connection string pela non-pooling (ver
// `getMigrationDatabaseUrl`) e adiciona o que só a CLI precisa
// (`entities`/`migrations` como glob, já que aqui não existe
// `autoLoadEntities` do Nest pra descobrir sozinho).
export const AppDataSource = new DataSource({
    ...getDatabaseOptions(),
    url: getMigrationDatabaseUrl(),
    entities: ['src/**/*.entity.ts'],
    migrations: ['database/migrations/*.ts'],
});
