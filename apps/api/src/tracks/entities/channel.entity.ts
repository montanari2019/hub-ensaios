import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    type Relation,
} from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity.js';
import { Track } from './track.entity.js';

@Entity('channels')
export class Channel extends BaseEntity {
    @Index()
    @Column({ name: 'track_id' })
    trackId: string;

    // `Relation<Track>` (não `Track` puro) evita o ReferenceError de TDZ do
    // emitDecoratorMetadata em import circular ESM (channel <-> track.js) —
    // ver mesmo padrão em track.entity.ts.
    @ManyToOne(() => Track, (track) => track.channels, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'track_id' })
    track: Relation<Track>;

    @Column()
    name: string;

    // Nome do arquivo original dentro do zip (antes da derivação/edição do nome).
    @Column({ name: 'file_name' })
    fileName: string;

    // Pathname do objeto no Vercel Blob (store privado) — fonte da verdade
    // de onde o áudio está. O player nunca recebe isso direto; a API assina
    // uma URL temporária por request (ver BlobStorageService.getSignedGetUrl).
    @Column({ name: 'blob_pathname' })
    blobPathname: string;

    @Column({ name: 'mime_type' })
    mimeType: string;

    // Preserva a ordem original dos canais no zip (índices de array não são
    // garantidos pelo SQL puro sem um ORDER BY explícito nesta coluna).
    @Column()
    order: number;

    @Column({ name: 'duration_seconds', type: 'float' })
    durationSeconds: number;

    // Se false, o player nunca aplica pitch-shift neste canal (ex.: bateria,
    // click) — ver capability track-pitch-transpose.
    @Column({ name: 'pitch_editable', type: 'boolean', default: true })
    pitchEditable: boolean;
}
