import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const NOW_DEFAULT = "(datetime('now'))";

// FK e índice já vão dentro do `Table` da criação (não em `createForeignKey`/
// `createIndex` separados depois): no SQLite, adicionar uma constraint numa
// tabela que já existe força o driver a recriar a tabela inteira (copiar
// pra uma tabela temporária, `INSERT INTO ... SELECT`, apagar a antiga,
// renomear) — só pra preservar dado que, numa migration de criação, nem
// existe ainda. Definindo tudo já no `CREATE TABLE`, esse passo nunca roda
// e a migration não tem nenhum `INSERT` no meio do DDL.
export class CreateChannels1789052040577 implements MigrationInterface {
    name = 'CreateChannels1789052040577';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'channels',
                columns: [
                    { name: 'id', type: 'varchar', isPrimary: true },
                    {
                        name: 'created_at',
                        type: 'datetime',
                        default: NOW_DEFAULT,
                    },
                    {
                        name: 'updated_at',
                        type: 'datetime',
                        default: NOW_DEFAULT,
                    },
                    { name: 'track_id', type: 'varchar' },
                    { name: 'name', type: 'varchar' },
                    { name: 'file_name', type: 'varchar' },
                    { name: 'file_path', type: 'varchar' },
                    { name: 'mime_type', type: 'varchar' },
                    { name: 'order', type: 'integer' },
                    { name: 'duration_seconds', type: 'float' },
                ],
                indices: [
                    {
                        name: 'IDX_channels_track_id',
                        columnNames: ['track_id'],
                    },
                ],
                foreignKeys: [
                    {
                        name: 'FK_channels_track_id',
                        columnNames: ['track_id'],
                        referencedTableName: 'tracks',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('channels');
    }
}
