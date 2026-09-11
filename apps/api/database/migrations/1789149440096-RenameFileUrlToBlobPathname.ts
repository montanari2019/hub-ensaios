import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// O Blob store da conta é privado (sem opção pública disponível) — a
// coluna guarda o pathname do objeto, não mais uma URL utilizável direto;
// a leitura passa a assinar uma URL temporária sob demanda
// (BlobStorageService.getSignedGetUrl).
export class RenameFileUrlToBlobPathname1789149440096
    implements MigrationInterface
{
    name = 'RenameFileUrlToBlobPathname1789149440096';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn(
            'channels',
            'file_url',
            new TableColumn({
                name: 'blob_pathname',
                type: 'varchar',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn(
            'channels',
            'blob_pathname',
            new TableColumn({
                name: 'file_url',
                type: 'varchar',
                isNullable: true,
            }),
        );
    }
}
