import 'reflect-metadata';

import { AppDataSource } from '../data-source.js';

// Orquestrador do `yarn seed`. Nenhum seed cadastrado ainda — o domínio
// deste app (tracks/channels) não tem dado de referência estático pra
// semear (diferente de país/estado/cidade em outros projetos): toda track
// nasce de uma importação real do usuário, nunca de um seed. Fica pronto
// pra quando um seed fizer sentido (ex.: dados de exemplo pra dev): crie a
// função em `database/seeds/seed-<nome>.ts`, importe e chame aqui — cada
// seed deve ser idempotente por conta própria (checar o que já existe
// antes de inserir), pra `yarn seed` poder rodar mais de uma vez sem
// duplicar nada.
async function run() {
    const dataSource = await AppDataSource.initialize();

    await dataSource.destroy();
}

run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
});
