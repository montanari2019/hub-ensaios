import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// `file_path` (caminho relativo a TRACKS_DIR, em disco) não existe mais —
// o áudio agora vive no Vercel Blob, referenciado pela sua URL pública
// direta (`file_url`), sem passar por um endpoint de streaming do backend.
export class AddFileUrlToChannels1789144226205 implements MigrationInterface {
    name = 'AddFileUrlToChannels1789144226205';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'channels',
            // Nullable só pela ausência de default sensato pra linhas
            // pré-existentes nesta migration — toda linha nova sempre grava
            // um file_url real no confirmImport (ver TracksService).
            new TableColumn({
                name: 'file_url',
                type: 'varchar',
                isNullable: true,
            }),
        );
        await queryRunner.dropColumn('channels', 'file_path');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'channels',
            new TableColumn({ name: 'file_path', type: 'varchar' }),
        );
        await queryRunner.dropColumn('channels', 'file_url');
    }
}
