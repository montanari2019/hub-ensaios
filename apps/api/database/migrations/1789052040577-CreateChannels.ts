import { MigrationInterface, QueryRunner, Table } from 'typeorm';

// FK e índice já vão dentro do `Table` da criação (não em `createForeignKey`/
// `createIndex` separados depois): assim como no SQLite, isso mantém a
// migration como um único `CREATE TABLE` com FK/índice inline, sem nenhum
// passo de rebuild-de-tabela no meio do DDL.
export class CreateChannels1789052040577 implements MigrationInterface {
    name = 'CreateChannels1789052040577';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'channels',
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
                    { name: 'track_id', type: 'uuid' },
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
