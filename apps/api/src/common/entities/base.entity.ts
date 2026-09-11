import {
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Toda entidade de domínio estende esta classe: id (uuid) + timestamps.
 * Sem soft-delete — exclusão aqui sempre remove também os arquivos de
 * áudio em disco, então um "desfazer" via soft-delete deixaria a linha
 * viva no banco apontando pra arquivos que já não existem mais.
 */
export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
