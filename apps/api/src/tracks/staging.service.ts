import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { NotFoundError } from '../common/errors/not-found.error.js';
import { BlobStorageService } from './blob-storage.service.js';
import { getAudioDurationSeconds } from './audio-duration.helper.js';
import { StagingImport } from './entities/staging-import.entity.js';
import type { ExtractedZipChannel } from './zip-import.helper.js';

const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export interface StagedChannel {
    tempChannelId: string;
    suggestedName: string;
    fileName: string;
    blobUrl: string;
    mimeType: string;
    durationSeconds: number;
}

export interface StagingManifest {
    importId: string;
    suggestedName: string;
    createdAt: string;
    channels: StagedChannel[];
}

function deriveTrackNameFromZip(zipFileName: string): string {
    const base = zipFileName.split('/').pop() ?? zipFileName;
    const dotIndex = base.lastIndexOf('.');
    return dotIndex > 0 ? base.slice(0, dotIndex) : base;
}

function stagingPrefix(importId: string): string {
    return `staging/${importId}/`;
}

/**
 * Gerencia o estado "parseado, mas ainda não salvo" da importação — vive
 * como uma linha em `staging_imports` (Postgres) + arquivos em
 * `staging/<importId>/` no Vercel Blob, em vez de um diretório temporário
 * local. Necessário porque em serverless o POST /tracks/import e o POST
 * /tracks/import/:id/confirm podem cair em instâncias de função diferentes
 * — nada garante que o disco local de uma sobreviva até a outra.
 */
@Injectable()
export class StagingService {
    private readonly logger = new Logger(StagingService.name);

    constructor(
        @InjectRepository(StagingImport)
        private readonly stagingRepository: Repository<StagingImport>,
        private readonly blobStorage: BlobStorageService,
    ) {}

    async createStagingImport(
        originalZipName: string,
        extractedChannels: ExtractedZipChannel[],
    ): Promise<StagingManifest> {
        const importId = randomUUID();

        const channels: StagedChannel[] = [];
        for (const channel of extractedChannels) {
            const tempChannelId = randomUUID();
            const ext = channel.fileName.split('.').pop() ?? 'bin';
            const blob = await this.blobStorage.put(
                `${stagingPrefix(importId)}${tempChannelId}.${ext}`,
                channel.buffer,
                channel.mimeType,
            );
            const durationSeconds = await getAudioDurationSeconds(
                channel.buffer,
                channel.mimeType,
            );

            channels.push({
                tempChannelId,
                suggestedName: channel.name,
                fileName: channel.fileName,
                blobUrl: blob.url,
                mimeType: channel.mimeType,
                durationSeconds,
            });
        }

        const suggestedName = deriveTrackNameFromZip(originalZipName);
        const row = await this.stagingRepository.save(
            this.stagingRepository.create({
                id: importId,
                suggestedName,
                manifest: channels,
            }),
        );

        return {
            importId: row.id,
            suggestedName: row.suggestedName,
            createdAt: row.createdAt.toISOString(),
            channels: row.manifest,
        };
    }

    async readManifest(importId: string): Promise<StagingManifest> {
        const row = await this.stagingRepository.findOne({
            where: { id: importId },
        });
        if (!row) {
            throw new NotFoundError(
                21,
                'Importação não encontrada ou expirada.',
            );
        }

        return {
            importId: row.id,
            suggestedName: row.suggestedName,
            createdAt: row.createdAt.toISOString(),
            channels: row.manifest,
        };
    }

    /** Copia os blobs de staging pra `tracks/<trackId>/`, devolvendo a URL final de cada tempChannelId. */
    async moveChannelsToTracksDir(
        manifest: StagingManifest,
        trackId: string,
    ): Promise<Map<string, string>> {
        const finalUrlByTempId = new Map<string, string>();
        for (const channel of manifest.channels) {
            const ext = channel.fileName.split('.').pop() ?? 'bin';
            const moved = await this.blobStorage.copy(
                channel.blobUrl,
                `tracks/${trackId}/${channel.tempChannelId}.${ext}`,
                channel.mimeType,
            );
            finalUrlByTempId.set(channel.tempChannelId, moved.url);
        }

        await this.blobStorage.del(
            manifest.channels.map((channel) => channel.blobUrl),
        );

        return finalUrlByTempId;
    }

    async discardStagingImport(importId: string): Promise<void> {
        const urls = await this.blobStorage.listByPrefix(
            stagingPrefix(importId),
        );
        if (urls.length > 0) {
            await this.blobStorage.del(urls);
        }
        await this.stagingRepository.delete({ id: importId });
    }

    /** Remove staging abandonado (aba fechada sem cancelar, importId nunca confirmado). */
    async sweepOrphans(): Promise<void> {
        const cutoff = new Date(Date.now() - ORPHAN_MAX_AGE_MS);
        const orphans = await this.stagingRepository.find({
            where: { createdAt: LessThan(cutoff) },
        });

        await Promise.all(
            orphans.map(async (orphan) => {
                await this.discardStagingImport(orphan.id);
                this.logger.log(`Staging órfão removido: ${orphan.id}`);
            }),
        );
    }
}
