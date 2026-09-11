import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity.js';
import { Track } from './track.entity.js';

@Entity('channels')
export class Channel extends BaseEntity {
    @Index()
    @Column({ name: 'track_id' })
    trackId: string;

    @ManyToOne(() => Track, (track) => track.channels, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'track_id' })
    track: Track;

    @Column()
    name: string;

    // Nome do arquivo original dentro do zip (antes da derivação/edição do nome).
    @Column({ name: 'file_name' })
    fileName: string;

    // Caminho relativo a TRACKS_DIR — fonte da verdade de onde o áudio está
    // em disco; nunca recalculado por convenção a partir do id.
    @Column({ name: 'file_path' })
    filePath: string;

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
