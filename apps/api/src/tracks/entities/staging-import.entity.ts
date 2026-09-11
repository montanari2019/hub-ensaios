import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity.js';
import type { StagedChannel } from '../staging.service.js';

// Substitui manifest.json + os.tmpdir(): em serverless, o POST /tracks/import
// e o POST /tracks/import/:id/confirm podem cair em instâncias de função
// diferentes, então o estado "parseado mas ainda não salvo" precisa viver em
// algo compartilhado, não num arquivo local.
@Entity('staging_imports')
export class StagingImport extends BaseEntity {
    @Column({ name: 'suggested_name' })
    suggestedName: string;

    @Column({ type: 'jsonb' })
    manifest: StagedChannel[];
}
