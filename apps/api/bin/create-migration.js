// Facilita `yarn migration:create <nome>`: você digita só o nome (snake_case,
// kebab-case etc. — ex.: `add_bpm_to_tracks`) e este script monta o caminho
// certo dentro de `database/migrations/`, convertendo pra PascalCase e
// prefixando com `Create` quando o nome não já começa com um verbo conhecido
// de migration (ex.: `add_coluna_x` vira `AddColunaX`, sem duplo prefixo).
import { spawnSync } from 'node:child_process';

const KNOWN_VERBS = [
    'Create',
    'Add',
    'Remove',
    'Drop',
    'Alter',
    'Update',
    'Rename',
];

function toPascalCase(value) {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join('');
}

const rawName = process.argv[2];

if (!rawName) {
    console.error(
        'Uso: yarn migration:create <nome_da_migration>  (ex.: yarn migration:create add_bpm_to_tracks)',
    );
    process.exit(1);
}

let pascalName = toPascalCase(rawName);
if (!KNOWN_VERBS.some((verb) => pascalName.startsWith(verb))) {
    pascalName = `Create${pascalName}`;
}

const migrationPath = `database/migrations/${pascalName}`;

const result = spawnSync(
    'typeorm-ts-node-esm',
    ['migration:create', migrationPath],
    {
        stdio: 'inherit',
        shell: true,
    },
);

process.exit(result.status ?? 1);
