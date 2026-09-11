import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPitchEditableToChannels1789067515469 implements MigrationInterface {
    name = 'AddPitchEditableToChannels1789067515469';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'channels',
            new TableColumn({
                name: 'pitch_editable',
                type: 'boolean',
                default: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('channels', 'pitch_editable');
    }
}
