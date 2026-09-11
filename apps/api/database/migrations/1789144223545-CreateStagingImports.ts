import { MigrationInterface, QueryRunner, Table } from 'typeorm';

// Substitui o manifest.json + os.tmpdir() do fluxo de staging local: em
// serverless, cada requisição pode cair numa instância de função diferente,
// então o estado "parseado mas ainda não salvo" precisa viver em algo
// compartilhado (Postgres aqui, Blob para os arquivos — ver design.md).
export class CreateStagingImports1789144223545 implements MigrationInterface {
    name = 'CreateStagingImports1789144223545';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'staging_imports',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true },
                    {
                        name: 'created_at',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                    { name: 'suggested_name', type: 'varchar' },
                    { name: 'manifest', type: 'jsonb' },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('staging_imports');
    }
}
