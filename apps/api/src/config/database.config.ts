import { registerAs } from '@nestjs/config';

import { getDatabaseOptions } from './database-options.js';

// Única fonte de verdade da conexão — reaproveitado também pela CLI do
// TypeORM em `database/data-source.ts` (via `getDatabaseOptions`, sem
// depender do `@nestjs/config`), pra driver/caminho/naming-strategy nunca
// divergirem entre CLI e app.
export default registerAs('database', () => getDatabaseOptions());
