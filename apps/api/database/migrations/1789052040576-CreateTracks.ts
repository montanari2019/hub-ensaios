import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const NOW_DEFAULT = "(datetime('now'))";

export class CreateTracks1789052040576 implements MigrationInterface {
    name = 'CreateTracks1789052040576';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'tracks',
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
                    { name: 'name', type: 'varchar' },
                    { name: 'bpm', type: 'integer', isNullable: true },
                    { name: 'tonality', type: 'text', isNullable: true },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('tracks');
    }
}
