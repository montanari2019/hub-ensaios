import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity.js';
import { Channel } from './channel.entity.js';
import { MusicalNote } from '../musical-note.enum.js';

@Entity('tracks')
export class Track extends BaseEntity {
    @Column()
    name: string;

    @Column({ type: 'int', nullable: true })
    bpm: number | null;

    // Coluna continua `text` — SQLite não tem enum nativo, e este projeto
    // evita `ALTER TABLE` de constraint numa tabela existente (ver comentário
    // em CreateChannels1789052040577). O enum é validado só na camada de
    // aplicação (DTOs).
    @Column({ type: 'text', nullable: true })
    tonality: MusicalNote | null;

    @OneToMany(() => Channel, (channel) => channel.track, {
        cascade: false,
    })
    channels: Channel[];
}
